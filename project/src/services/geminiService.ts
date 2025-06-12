import { GeminiResponse, ScanResult, Ingredient, ClaimVerdict } from '../types/types';
import { UserPreferences } from '../types/questionnaire';

interface GeminiError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      "@type"?: string;
      reason?: string;
      domain?: string;
    }>;
  };
}

interface AnalyzedIngredient {
  name: string;
  purpose: string;
  origin: string;
  controversy: string;
  legalStatus: {
    bannedCountries: string[];
  };
  safeLimit: string;
  riskLevel: string;
}

class GeminiAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

function handleGeminiError(error: unknown): never {
  if (error instanceof Response) {
    // Handle HTTP errors
    switch (error.status) {
      case 400:
        throw new GeminiAPIError('Invalid API key. Please check your API key and try again.');
      case 429:
        throw new GeminiAPIError('API rate limit reached. Please try again in a few minutes.');
      case 500:
      case 502:
      case 503:
      case 504:
        throw new GeminiAPIError('Gemini service is temporarily unavailable. Please try again later.');
      default:
        throw new GeminiAPIError('An error occurred while processing your request.');
    }
  }

  // Handle API-specific errors
  if (typeof error === 'object' && error !== null) {
    const geminiError = error as GeminiError;
    
    if (geminiError.error?.details?.some(detail => detail.reason === 'API_KEY_INVALID')) {
      throw new GeminiAPIError('Invalid API key. Please check your settings.');
    }
    
    if (geminiError.error?.status === 'RESOURCE_EXHAUSTED') {
      throw new GeminiAPIError('API quota exceeded. Please try again later or check your API limits.');
    }

    if (geminiError.error?.message) {
      // Clean up the error message to be user-friendly
      const message = geminiError.error.message
        .replace(/API key not valid\. Please pass a valid API key\./, 'Invalid API key. Please check your settings.')
        .replace(/Request .* with content .* was blocked\./, 'Request was blocked due to content restrictions.');
      
      throw new GeminiAPIError(message);
    }
  }

  // Generic error fallback
  throw new GeminiAPIError('An unexpected error occurred. Please try again.');
}

export async function analyzeProductImages(
  apiKey: string,
  frontImage: string,
  backImage: string
): Promise<GeminiResponse> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze these product images and extract information. Return ONLY a valid JSON object with this exact structure:
{
  "productName": "extracted product name",
  "brand": "extracted brand name", 
  "claims": ["list", "of", "health", "claims"],
  "ingredients": ["list", "of", "ingredients"],
  "nutritionFacts": {
    "calories": "value if available",
    "protein": "value if available",
    "carbs": "value if available",
    "fat": "value if available"
  }
}

From the front image: Extract product name, brand, and all visible health/marketing claims.
From the back image: Extract ingredients list and nutrition facts if visible.`
          }, {
            inlineData: {
              mimeType: 'image/jpeg',
              data: frontImage.split(',')[1]
            }
          }, {
            inlineData: {
              mimeType: 'image/jpeg', 
              data: backImage.split(',')[1]
            }
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        handleGeminiError(errorData);
      }
      handleGeminiError(response);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new GeminiAPIError('Invalid response format from Gemini API. Please try again.');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    let parsedData;
    
    try {
      const cleanedText = responseText.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(cleanedText);
      }
    } catch (parseError) {
      throw new GeminiAPIError('Failed to parse the response. Please try again.');
    }
    
    return {
      success: true,
      data: parsedData
    };
  } catch (error) {
    console.error('Error analyzing product images:', error);
    
    if (error instanceof GeminiAPIError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred while analyzing the images. Please try again.'
    };
  }
}

export async function analyzeIngredients(
  apiKey: string,
  ingredients: string[]
): Promise<GeminiResponse> {
  try {
    const batchSize = 5;
    const allAnalyzedIngredients: AnalyzedIngredient[] = [];
    
    for (let i = 0; i < ingredients.length; i += batchSize) {
      const batch = ingredients.slice(i, i + batchSize);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze these food ingredients and return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "ingredient name",
    "purpose": "why it's used in food",
    "origin": "natural/synthetic/processed",
    "controversy": "any known issues or none",
    "legalStatus": {
      "bannedCountries": ["list of countries where this ingredient is banned", "or empty array if not banned anywhere"]
    },
    "safeLimit": "daily safe amount or general guideline",
    "riskLevel": "Low/Moderate/High"
  }
]

Ingredients to analyze: ${batch.join(', ')}

For each ingredient:
1. Research and list ALL countries where the ingredient is currently banned or heavily restricted
2. If no countries have banned the ingredient, return an empty array for bannedCountries
3. Include both full country names and common abbreviations (e.g. "United States (USA)")
4. Provide factual, concise information for each ingredient`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          handleGeminiError(errorData);
        }
        handleGeminiError(response);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const responseText = data.candidates[0].content.parts[0].text;
        
        try {
          const cleanedText = responseText.replace(/```json\s*|\s*```/g, '').trim();
          const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
          
          let batchResults;
          if (jsonMatch) {
            batchResults = JSON.parse(jsonMatch[0]);
          } else {
            batchResults = JSON.parse(cleanedText);
          }
          
          allAnalyzedIngredients.push(...batchResults);
        } catch (parseError) {
          throw new GeminiAPIError('Failed to parse ingredient analysis. Please try again.');
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < ingredients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      data: allAnalyzedIngredients
    };
  } catch (error) {
    console.error('Error analyzing ingredients:', error);
    
    if (error instanceof GeminiAPIError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred while analyzing ingredients. Please try again.'
    };
  }
}

export async function verifyClaims(
  apiKey: string,
  claims: string[],
  ingredients: Ingredient[]
): Promise<GeminiResponse> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze these product claims based on the ingredients. Return ONLY a valid JSON array with this exact structure:
[
  {
    "claim": "exact claim text",
    "verdict": "True",
    "reason": "explanation for verdict"
  }
]

Ingredients present: ${ingredients.map(i => i.name).join(', ')}

Claims to verify:
${claims.map((claim, index) => `${index + 1}. ${claim}`).join('\n')}

For each claim, determine if it's "True", "False", or "Misleading" based on the ingredients list. Provide a clear reason for each verdict.`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        handleGeminiError(errorData);
      }
      handleGeminiError(response);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new GeminiAPIError('Invalid response format from Gemini API. Please try again.');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    let parsedData;
    
    try {
      const cleanedText = responseText.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(cleanedText);
      }
    } catch (parseError) {
      throw new GeminiAPIError('Failed to parse claims verification. Please try again.');
    }
    
    return {
      success: true,
      data: parsedData
    };
  } catch (error) {
    console.error('Error verifying claims:', error);
    
    if (error instanceof GeminiAPIError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred while verifying claims. Please try again.'
    };
  }
}

export async function processProductScan(
  apiKey: string,
  frontImage: string,
  backImage: string,
  userPreferences?: UserPreferences | null
): Promise<ScanResult> {
  try {
    console.log('Starting product scan analysis...');
    
    // Step 1: Extract data from images
    const extractionResponse = await analyzeProductImages(apiKey, frontImage, backImage);
    if (!extractionResponse.success) {
      throw new Error(extractionResponse.error || 'Failed to extract data from images');
    }
    
    const extractedData = extractionResponse.data;
    console.log('Extracted data:', extractedData);
    
    // Validate extracted data structure
    if (!extractedData || typeof extractedData !== 'object') {
      throw new Error('Invalid extracted data format');
    }
    
    // Ensure required fields exist with defaults
    const productName = extractedData.productName || extractedData.product_name || 'Unknown Product';
    const brand = extractedData.brand || 'Unknown Brand';
    const claims = Array.isArray(extractedData.claims) ? extractedData.claims : [];
    const ingredients = Array.isArray(extractedData.ingredients) ? extractedData.ingredients : [];
    const nutritionFacts = extractedData.nutritionFacts || extractedData.nutrition_facts || {};
    
    console.log('Processed data:', { productName, brand, claims: claims.length, ingredients: ingredients.length });
    
    // Step 2: Analyze ingredients (only if we have ingredients)
    let analyzedIngredients: Ingredient[] = [];
    if (ingredients.length > 0) {
      console.log('Analyzing ingredients...');
      const ingredientNames = ingredients.map((i: any) => 
        typeof i === 'string' ? i : (i.name || i.ingredient || String(i))
      ).filter((name: string) => name && name.trim());
      
      if (ingredientNames.length > 0) {
        const ingredientAnalysisResponse = await analyzeIngredients(apiKey, ingredientNames);
        if (!ingredientAnalysisResponse.success) {
          console.warn('Failed to analyze ingredients:', ingredientAnalysisResponse.error);
          // Create basic ingredient objects as fallback
          analyzedIngredients = ingredientNames.map((name: string) => ({
            name,
            purpose: "Unknown",
            origin: "Unknown", 
            controversy: "No data available",
            legalStatus: { bannedCountries: [] },
            safeLimit: "Unknown",
            riskLevel: 'Low' as const
          }));
        } else {
          analyzedIngredients = ingredientAnalysisResponse.data;
        }
      }
    }
    
    console.log('Analyzed ingredients:', analyzedIngredients.length);
    
    // Step 3: Verify claims (only if we have claims)
    let verifiedClaims: ClaimVerdict[] = [];
    if (claims.length > 0) {
      console.log('Verifying claims...');
      const claimsVerificationResponse = await verifyClaims(
        apiKey,
        claims,
        analyzedIngredients
      );
      if (!claimsVerificationResponse.success) {
        console.warn('Failed to verify claims:', claimsVerificationResponse.error);
        // Create basic claim verdicts as fallback
        verifiedClaims = claims.map((claim: string) => ({
          claim,
          verdict: 'Unclear' as const,
          reason: 'Unable to verify due to analysis error'
        }));
      } else {
        verifiedClaims = claimsVerificationResponse.data;
      }
    }
    
    console.log('Verified claims:', verifiedClaims.length);
    
    // Step 4: Calculate health score based on ingredient risks and claim verdicts
    const healthScore = calculateHealthScore(analyzedIngredients);

    // Step 5: Generate personalized analysis if user preferences are provided
    let personalizedAnalysis = {};
    if (userPreferences) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this product specifically for this user's health profile and preferences. Return ONLY a valid JSON object with this exact structure:
{
  "concerns": [
    {
      "issue": "brief issue description",
      "explanation": "detailed explanation"
    }
  ],
  "recommendations": [
    "specific recommendation"
  ],
  "compatibility": "High/Moderate/Low"
}

Product Information:
${JSON.stringify({
  productName,
  brand,
  ingredients: analyzedIngredients,
  nutritionFacts,
  claims
}, null, 2)}

User Health Profile:
${JSON.stringify({
  healthConcerns: userPreferences.healthConcerns,
  allergies: userPreferences.allergies,
  dietaryPreferences: userPreferences.dietaryPreferences
}, null, 2)}

Guidelines:
1. Focus on ingredients and nutrition that specifically relate to the user's health concerns, allergies, and dietary preferences
2. Flag any ingredients that might conflict with their health conditions
3. Consider their dietary restrictions when determining compatibility
4. Provide specific, actionable recommendations
5. Keep explanations concise but informative`
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate analysis: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid API response format');
        }

        const responseText = data.candidates[0].content.parts[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid analysis format');
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        if (!analysis.concerns || !analysis.recommendations || !analysis.compatibility) {
          throw new Error('Incomplete analysis data');
        }

        // Generate a hash of the user preferences to use as a key
        const relevantData = {
          healthConcerns: userPreferences.healthConcerns,
          allergies: userPreferences.allergies,
          dietaryPreferences: userPreferences.dietaryPreferences
        };
        const preferenceHash = btoa(JSON.stringify(relevantData));

        personalizedAnalysis = {
          [preferenceHash]: analysis
        };
      } catch (error) {
        console.error('Error generating personalized analysis:', error);
      }
    }
    
    // Build the final scan result
    const scanResult: ScanResult = {
      productName,
      brand,
      claims,
      ingredients: analyzedIngredients,
      nutritionFacts,
      claimVerdicts: verifiedClaims,
      healthScore,
      personalizedAnalysis
    };
    
    console.log('Scan completed successfully');
    return scanResult;
  } catch (error) {
    console.error('Error processing product scan:', error);
    throw error;
  }
};

function calculateHealthScore(ingredients: Ingredient[]): number {
  // Base score starts at 50 (neutral)
  let score = 50;
  
  // 1. Processing Impact (-20 to +10 points)
  const processingScore = ingredients.reduce((sum, ingredient) => {
    if (ingredient.origin === 'natural' || ingredient.origin === 'minimally processed') {
      return sum + 2;
    } else if (ingredient.origin === 'processed') {
      return sum - 2;
    } else if (ingredient.origin === 'highly processed' || ingredient.origin === 'synthetic') {
      return sum - 4;
    }
    return sum;
  }, 0);
  score += Math.max(-20, Math.min(10, processingScore));

  // 2. Banned/Restricted Status Impact (-15 to 0 points)
  const bannedScore = ingredients.reduce((sum, ingredient) => {
    if (ingredient.legalStatus?.bannedCountries.length) {
      return sum - (ingredient.legalStatus.bannedCountries.length * 3);
    }
    return sum;
  }, 0);
  score += Math.max(-15, bannedScore);

  // 3. Risk Level Impact (-20 to +10 points)
  const riskScore = ingredients.reduce((sum, ingredient) => {
    switch (ingredient.riskLevel) {
      case 'Low':
        return sum + 2;
      case 'Moderate':
        return sum - 2;
      case 'High':
        return sum - 4;
      default:
        return sum;
    }
  }, 0);
  score += Math.max(-20, Math.min(10, riskScore));

  // 4. Controversy Impact (-10 to 0 points)
  const controversyScore = ingredients.reduce((sum, ingredient) => {
    if (ingredient.controversy && ingredient.controversy !== 'No data available') {
      return sum - 2;
    }
    return sum;
  }, 0);
  score += Math.max(-10, controversyScore);

  // 5. Purpose/Benefit Impact (0 to +15 points)
  const benefitScore = ingredients.reduce((sum, ingredient) => {
    // Check if purpose indicates nutritional or functional benefits
    if (ingredient.purpose) {
      const purpose = ingredient.purpose.toLowerCase();
      if (purpose.includes('nutrient') || 
          purpose.includes('vitamin') || 
          purpose.includes('mineral') ||
          purpose.includes('fiber') ||
          purpose.includes('protein') ||
          purpose.includes('antioxidant')) {
        return sum + 3;
      } else if (purpose.includes('preservative') ||
                 purpose.includes('color') ||
                 purpose.includes('texture') ||
                 purpose.includes('flavor')) {
        return sum - 1;
      }
    }
    return sum;
  }, 0);
  score += Math.max(0, Math.min(15, benefitScore));

  // 6. Safe Limit Consideration (-10 to +10 points)
  const safeLimitScore = ingredients.reduce((sum, ingredient) => {
    if (ingredient.safeLimit) {
      const limit = ingredient.safeLimit.toLowerCase();
      if (limit.includes('no limit') || limit.includes('unlimited')) {
        return sum + 2;
      } else if (limit.includes('restricted') || limit.includes('limited')) {
        return sum - 2;
      }
    }
    return sum;
  }, 0);
  score += Math.max(-10, Math.min(10, safeLimitScore));

  // Ensure final score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}