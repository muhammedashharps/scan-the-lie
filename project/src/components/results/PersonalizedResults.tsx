import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, ShieldAlert, Heart } from 'lucide-react';
import Card from '../common/Card';
import { ScanResult, PersonalizedAnalysis } from '../../types/types';
import { UserPreferences } from '../../types/questionnaire';
import { useAppContext } from '../../context/AppContext';
import { userService } from '../../services/userService';

interface PersonalizedResultsProps {
  scanId: string;
  scanResult: ScanResult;
  userPreferences: UserPreferences;
  apiKey: string;
}

const PersonalizedResults: React.FC<PersonalizedResultsProps> = ({
  scanId,
  scanResult,
  userPreferences,
  apiKey
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatePreferenceHash = useCallback((preferences: UserPreferences): string => {
    const relevantData = {
      healthConcerns: preferences.healthConcerns,
      allergies: preferences.allergies,
      dietaryPreferences: preferences.dietaryPreferences
    };
    return btoa(JSON.stringify(relevantData));
  }, []);

  useEffect(() => {
    if (!scanId || !apiKey || !userPreferences || !scanResult) {
      setError('Missing required data for analysis');
      setLoading(false);
      return;
    }

    const preferenceHash = generatePreferenceHash(userPreferences);
    const analysis = scanResult.personalizedAnalysis?.[preferenceHash];

    if (!analysis) {
      setError('No personalized analysis available for your current preferences');
    } else {
      setError(null);
    }
    setLoading(false);
  }, [scanResult, userPreferences, apiKey, generatePreferenceHash, scanId]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Loading analysis...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center text-danger-600 mb-2">
          <AlertCircle size={20} className="mr-2" />
          <h3 className="font-semibold">Analysis Error</h3>
        </div>
        <p className="text-gray-600">{error}</p>
      </Card>
    );
  }

  const preferenceHash = generatePreferenceHash(userPreferences);
  const personalizedAnalysis = scanResult.personalizedAnalysis?.[preferenceHash];

  if (!personalizedAnalysis) {
    return null;
  }

  const getCompatibilityColor = () => {
    switch (personalizedAnalysis.compatibility) {
      case 'High':
        return 'text-success-600';
      case 'Moderate':
        return 'text-warning-600';
      case 'Low':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Heart size={20} className="text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold">Personalized Analysis</h3>
          </div>
          <div className={`flex items-center ${getCompatibilityColor()}`}>
            <span className="text-sm font-medium">
              {personalizedAnalysis.compatibility} Compatibility
            </span>
          </div>
        </div>

        {personalizedAnalysis.concerns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Health Considerations</h4>
            <div className="space-y-3">
              {personalizedAnalysis.concerns.map((concern, index) => (
                <div key={index} className="bg-danger-50 p-3 rounded-md">
                  <div className="flex items-start">
                    <ShieldAlert size={16} className="text-danger-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-danger-700">{concern.issue}</p>
                      <p className="text-sm text-danger-600 mt-1">{concern.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {personalizedAnalysis.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommendations</h4>
            <ul className="list-disc list-inside space-y-1">
              {personalizedAnalysis.recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-700">{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PersonalizedResults; 