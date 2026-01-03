import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { aiCreditsApi } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const AiCreditsContext = createContext();

export const AiCreditsProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) {
      setCredits(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data } = await aiCreditsApi.get();
      setCredits(data);
    } catch (err) {
      console.error('Failed to fetch AI credits:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch credits when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchCredits();
    }
  }, [authLoading, fetchCredits]);

  // Decrement credits optimistically (for immediate UI feedback)
  const decrementCredits = useCallback((amount = 1) => {
    setCredits(prev => {
      if (!prev) return prev;
      const remaining = (prev.remaining_credits ?? prev.remainingCredits ?? 0) - amount;
      return {
        ...prev,
        remaining_credits: Math.max(0, remaining),
        remainingCredits: Math.max(0, remaining),
      };
    });
  }, []);

  const value = {
    credits,
    loading,
    error,
    refetch: fetchCredits,
    decrementCredits,
  };

  return (
    <AiCreditsContext.Provider value={value}>
      {children}
    </AiCreditsContext.Provider>
  );
};

export const useAiCreditsContext = () => {
  const context = useContext(AiCreditsContext);
  if (!context) {
    throw new Error('useAiCreditsContext must be used within AiCreditsProvider');
  }
  return context;
};

export default AiCreditsContext;


