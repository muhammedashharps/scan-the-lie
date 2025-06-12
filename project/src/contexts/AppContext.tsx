import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ProductScan, ScanResult } from '../types/types';
import { UserPreferences } from '../types/questionnaire';
import { LocalStorageKeys } from '../constants/storage';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

interface AppContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  isApiKeyValid: boolean;
  scanHistory: ProductScan[];
  addToHistory: (scan: ProductScan) => Promise<void>;
  clearHistory: () => void;
  deleteScan: (id: string) => void;
  getScanById: (id: string) => ProductScan | undefined;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  userPreferences: UserPreferences | null;
  setUserPreferences: (preferences: UserPreferences) => void;
  hasCompletedQuestionnaire: boolean;
  updateScanResult: (id: string, result: ScanResult) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LocalStorageKeys.API_KEY) || '');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ProductScan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false);
  const { user, loading: authLoading } = useAuth();

  // Load user data when user changes
  useEffect(() => {
    const loadUserData = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setScanHistory([]);
        setUserPreferences(null);
        setPreferencesLoaded(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Load user preferences
        const preferences = await userService.getUserPreferences(user.uid);
        setUserPreferences(preferences);
        setPreferencesLoaded(true);

        // Load scan history
        const history = await userService.getScanHistory(user.uid);
        setScanHistory(history);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, authLoading]);

  useEffect(() => {
    localStorage.setItem(LocalStorageKeys.API_KEY, apiKey);
    setIsApiKeyValid(apiKey.length >= 20);
  }, [apiKey]);

  const addToHistory = useCallback(async (scan: ProductScan) => {
    if (!user) {
      throw new Error('User must be logged in to save scans');
    }

    try {
      await userService.addToScanHistory(user.uid, scan);
      setScanHistory(prev => {
        const exists = prev.some(item => item.id === scan.id);
        if (exists) {
          return prev.map(item => item.id === scan.id ? scan : item);
        }
        return [scan, ...prev];
      });
    } catch (error) {
      console.error('Error adding scan to history:', error);
      throw error;
    }
  }, [user]);

  const updateScanResult = useCallback(async (id: string, result: ScanResult) => {
    if (!user) {
      throw new Error('User must be logged in to update scans');
    }

    try {
      const updatedScan: ProductScan = {
        ...scanHistory.find(scan => scan.id === id)!,
        result,
        status: 'completed' as const
      };
      await userService.updateScanResult(id, updatedScan);
      setScanHistory(prev => prev.map(scan => scan.id === id ? updatedScan : scan));
    } catch (error) {
      console.error('Error updating scan result:', error);
      throw error;
    }
  }, [user, scanHistory]);

  const clearHistory = useCallback(async () => {
    if (!user) {
      throw new Error('User must be logged in to clear history');
    }

    try {
      await userService.clearScanHistory(user.uid);
      setScanHistory([]);
      toast.info('Scan history cleared');
    } catch (error) {
      console.error('Error clearing scan history:', error);
      toast.error('Failed to clear scan history');
    }
  }, [user]);

  const deleteScan = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('User must be logged in to delete scans');
    }

    try {
      await userService.deleteScan(id);
      setScanHistory(prev => prev.filter(scan => scan.id !== id));
      toast.info('Scan deleted');
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast.error('Failed to delete scan');
    }
  }, [user]);

  const getScanById = useCallback((id: string): ProductScan | undefined => {
    return scanHistory.find(scan => scan.id === id);
  }, [scanHistory]);

  const handleSetUserPreferences = useCallback(async (preferences: UserPreferences) => {
    if (!user) {
      throw new Error('User must be logged in to save preferences');
    }

    try {
      await userService.saveUserPreferences(user.uid, preferences);
      setUserPreferences(preferences);
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }, [user]);

  const value = {
    apiKey,
    setApiKey,
    isApiKeyValid,
    scanHistory,
    addToHistory,
    clearHistory,
    deleteScan,
    getScanById,
    loading: loading || authLoading || !preferencesLoaded,
    setLoading,
    error,
    setError,
    userPreferences,
    setUserPreferences: handleSetUserPreferences,
    hasCompletedQuestionnaire: Boolean(userPreferences?.completedQuestionnaire),
    updateScanResult
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};