import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { analysisV2Api, LimitError, AICreditsError } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const AnalysisV2Context = createContext();

export const AnalysisV2Provider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [limitError, setLimitError] = useState(null);

  // Derived values
  const lastAnalysis = analyses.length > 0 ? analyses[0] : null;

  const selectedAnalysis = useMemo(() => {
    if (!selectedAnalysisId) return lastAnalysis;
    return analyses.find(a => a.id === selectedAnalysisId) || lastAnalysis;
  }, [analyses, selectedAnalysisId, lastAnalysis]);

  // Fetch analysis history from backend
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setAnalyses([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await analysisV2Api.list(20);
      // V2 analyses are already in the correct format
      const transformedAnalyses = (data || []).map(transformAnalysis);
      setAnalyses(transformedAnalyses);
      
      // Select the first (latest) analysis if none selected
      if (transformedAnalyses.length > 0 && !selectedAnalysisId) {
        setSelectedAnalysisId(transformedAnalyses[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch V2 analyses:', err);
      setError(err.message || 'Failed to load analysis history');
      setAnalyses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedAnalysisId]);

  // Fetch history when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchHistory();
    }
  }, [authLoading, fetchHistory]);

  // Transform backend V2 analysis to frontend format
  const transformAnalysis = (backendAnalysis) => {
    return {
      id: backendAnalysis.id,
      createdAt: backendAnalysis.created_at,
      version: backendAnalysis.version,
      
      // Input data
      input: {
        userPlans: backendAnalysis.input?.user_plans || [],
        competitors: backendAnalysis.input?.competitors || [],
        businessMetrics: backendAnalysis.input?.business_metrics || {},
      },
      
      // Rule engine results (deterministic)
      ruleResult: {
        insights: backendAnalysis.rule_result?.insights || [],
        numPlans: backendAnalysis.rule_result?.num_plans || 0,
        numCompetitors: backendAnalysis.rule_result?.num_competitors || 0,
        churnCategory: backendAnalysis.rule_result?.churn_category || 'unknown',
        priceSpread: backendAnalysis.rule_result?.price_spread || 'unknown',
        hasCompetitors: backendAnalysis.rule_result?.has_competitors || false,
        hasMetrics: backendAnalysis.rule_result?.has_metrics || false,
      },
      
      // LLM output (structured)
      llmOutput: {
        executiveSummary: backendAnalysis.llm_output?.executive_summary || '',
        pricingInsights: backendAnalysis.llm_output?.pricing_insights || [],
        recommendations: backendAnalysis.llm_output?.recommendations || [],
        riskAnalysis: backendAnalysis.llm_output?.risk_analysis || [],
        suggestedNextActions: backendAnalysis.llm_output?.suggested_next_actions || [],
      },
    };
  };

  // Run a new V2 analysis
  const runAnalysis = async () => {
    setIsRunning(true);
    setError(null);
    setLimitError(null);

    try {
      const { data } = await analysisV2Api.run();
      const transformedAnalysis = transformAnalysis(data);
      
      // Prepend to history
      setAnalyses(prev => [transformedAnalysis, ...prev]);
      setSelectedAnalysisId(transformedAnalysis.id);
      
      return { success: true, analysis: transformedAnalysis };
    } catch (err) {
      console.error('Failed to run V2 analysis:', err);
      
      // Handle AI credits errors
      if (err instanceof AICreditsError) {
        setLimitError({
          errorCode: err.code,
          reason: err.message,
          plan: null,
          limit: null,
          current: null,
          isAICreditsError: true,
        });
        return { 
          success: false, 
          error: err.message,
          isLimitError: true,
          isAICreditsError: true,
        };
      }
      
      // Handle limit errors
      if (err instanceof LimitError) {
        setLimitError({
          errorCode: err.errorCode,
          reason: err.reason,
          plan: err.plan,
          limit: err.limit,
          current: err.current,
        });
        return { 
          success: false, 
          error: err.reason,
          isLimitError: true,
        };
      }
      
      setError(err.message || 'Failed to run analysis');
      return { success: false, error: err.message };
    } finally {
      setIsRunning(false);
    }
  };

  const clearLimitError = () => {
    setLimitError(null);
  };

  const selectAnalysis = (id) => {
    setSelectedAnalysisId(id);
  };

  const clearError = () => {
    setError(null);
  };

  const reset = () => {
    setAnalyses([]);
    setSelectedAnalysisId(null);
  };

  const value = {
    analyses,
    lastAnalysis,
    selectedAnalysis,
    isLoading,
    isRunning,
    error,
    limitError,
    runAnalysis,
    fetchHistory,
    selectAnalysis,
    clearError,
    clearLimitError,
    reset,
  };

  return (
    <AnalysisV2Context.Provider value={value}>
      {children}
    </AnalysisV2Context.Provider>
  );
};

export const useAnalysisV2 = () => {
  const context = useContext(AnalysisV2Context);
  if (!context) {
    throw new Error('useAnalysisV2 must be used within AnalysisV2Provider');
  }
  return context;
};

