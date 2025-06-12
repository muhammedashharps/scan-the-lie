import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Questionnaire from './components/questionnaire/Questionnaire';
import { useAppContext } from './context/AppContext';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { hasCompletedQuestionnaire, setUserPreferences, loading } = useAppContext();
  const { user } = useAuth();

  const handleQuestionnaireComplete = (preferences: {
    healthConcerns: string[];
    allergies: string[];
    dietaryPreferences: string[];
  }) => {
    setUserPreferences({
      ...preferences,
      completedQuestionnaire: true
    });
  };

  return (
    <>
      {user && !loading && !hasCompletedQuestionnaire && (
        <Questionnaire onComplete={async (preferences) => {
          await handleQuestionnaireComplete(preferences);
        }} />
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="results/:id" element={<ResultsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;