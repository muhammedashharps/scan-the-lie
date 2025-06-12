import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { processProductScan } from '../services/geminiService';
import { ScanResult, ProductScan } from '../types/types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import IngredientTree from '../components/results/IngredientTree';
import ClaimVerifier from '../components/results/ClaimVerifier';
import NutritionCard from '../components/results/NutritionCard';
import HealthScore from '../components/results/HealthScore';
import EmptyState from '../components/common/EmptyState';
import ChatBot from '../components/results/ChatBot';
import PersonalizedResults from '../components/results/PersonalizedResults';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToHistory, apiKey, loading: contextLoading, setLoading, userPreferences } = useAppContext();
  const { user } = useAuth();
  
  const [scan, setScan] = useState<ProductScan | undefined>(undefined);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'personal' | 'claims'>('ingredients');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  useEffect(() => {
    if (userPreferences !== null) {
      setPreferencesLoaded(true);
    }
  }, [userPreferences]);
  
  useEffect(() => {
    if (activeTab === 'personal' && !userPreferences?.completedQuestionnaire) {
      setActiveTab('ingredients');
    }
  }, [activeTab, userPreferences]);
  
  const processScan = async (scanData: ProductScan) => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }
    
    try {
      setProcessing(true);
      setLoading(true);
      
      const result = await processProductScan(apiKey, scanData.frontImage, scanData.backImage);
      
      const updatedScan: ProductScan = {
        ...scanData,
        result,
        status: 'completed'
      };
      
      await addToHistory(updatedScan);
      setScan(updatedScan);
    } catch (err) {
      console.error('Error processing scan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process scan';
      
      const updatedScan: ProductScan = {
        ...scanData,
        status: 'failed',
        error: errorMessage
      };
      
      await addToHistory(updatedScan);
      setScan(updatedScan);
      setError(errorMessage);
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const loadScan = async () => {
      if (!id || !user) {
        navigate('/scan');
        return;
      }
      
      try {
        setLoading(true);
        const scanData = await userService.getScanById(id);
        
        if (!scanData) {
          setError('Scan not found');
          return;
        }
        
        if (scanData.userId !== user.uid) {
          setError('You do not have permission to view this scan');
          return;
        }
        
        setScan(scanData);
        
        if (scanData.status === 'pending' && !scanData.result) {
          processScan(scanData);
        }
      } catch (err) {
        console.error('Error loading scan:', err);
        setError('Failed to load scan');
      } finally {
        setLoading(false);
      }
    };
    
    loadScan();
  }, [id, user, navigate]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft size={16} />} className="mb-6">
          Back
        </Button>
        
        <EmptyState
          title="Error Loading Results"
          description={error}
          icon={<AlertTriangle size={48} className="text-danger-500" />}
          actionText="Return to Scan"
          onAction={() => navigate('/scan')}
        />
      </div>
    );
  }
  
  if (contextLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft size={16} />} className="mb-6">
          Back
        </Button>
        
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
            <p className="text-gray-500 text-center max-w-md">
              Fetching your data...
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (!scan || processing) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft size={16} />} className="mb-6">
          Back
        </Button>
        
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {scan?.status === 'pending' ? 'Analyzing Product' : 'Fetching food data from the database...'}
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {scan?.status === 'pending' 
                ? "Our AI is examining your product's images, extracting ingredients, and verifying claims. This may take a moment."
                : 'Retrieving your scan results. Please wait...'}
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  const { result } = scan;
  
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft size={16} />} className="mb-6">
          Back
        </Button>
        
        <EmptyState
          title="No Results Available"
          description="This scan doesn't have any results. Try scanning again."
          actionText="Scan Again"
          onAction={() => navigate('/scan')}
        />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="outline" size="sm" onClick={handleBack} leftIcon={<ArrowLeft size={16} />} className="mb-6">
        Back
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-32 md:h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                <img 
                  src={scan.frontImage} 
                  alt={result.productName} 
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{result.productName}</h1>
                {result.brand && (
                  <p className="text-lg text-gray-600 mb-4">{result.brand}</p>
                )}
                
                {result.claims.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Product Claims:</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.claims.map((claim, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                        >
                          {claim}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-gray-500">
                  Scanned on {new Date(scan.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        <div>
          {result.healthScore !== undefined && (
            <HealthScore score={result.healthScore} />
          )}
        </div>
      </div>

      <Card className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('ingredients')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'ingredients'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ingredient Breakdown
            </button>
            {!contextLoading && userPreferences?.completedQuestionnaire && (
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'personal'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal Analysis
              </button>
            )}
            <button
              onClick={() => setActiveTab('claims')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'claims'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Claim Verification
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'ingredients' && (
            <IngredientTree ingredients={result.ingredients} />
          )}
          
          {activeTab === 'personal' && !contextLoading && userPreferences?.completedQuestionnaire && (
            <PersonalizedResults
              scanId={id!}
              scanResult={result}
              userPreferences={userPreferences}
              apiKey={apiKey}
            />
          )}
          
          {activeTab === 'claims' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ClaimVerifier claimVerdicts={result.claimVerdicts} />
              </div>
              <div>
                <NutritionCard nutritionFacts={result.nutritionFacts} />
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Disclaimer</h3>
        <p className="text-blue-800 text-sm">
          This analysis is for informational purposes only and should not be considered medical advice. 
          Always consult with a healthcare professional for specific dietary concerns. Ingredient analysis 
          is based on generally available information and may not account for individual sensitivities or allergies.
        </p>
      </div>

      <ChatBot scanResult={result} apiKey={apiKey} />
    </div>
  );
};

export default ResultsPage;