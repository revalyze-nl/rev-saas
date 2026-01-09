import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getJson } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const UsageContext = createContext();

export const UsageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch usage stats from backend
  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) {
      setUsage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await getJson('/api/usage');
      setUsage(data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch usage on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsage();
    } else {
      setUsage(null);
    }
  }, [isAuthenticated, fetchUsage]);

  // Helper functions to check limits
  const canCreateDecision = useCallback(() => {
    if (!usage) return true; // Allow if not loaded yet
    if (usage.is_unlimited) return true;
    
    const limit = usage.limits?.decisions_per_month;
    const used = usage.used?.decisions_this_month || 0;
    
    if (limit === null || limit === undefined) return true; // unlimited
    return used < limit;
  }, [usage]);

  const canGenerateScenarios = useCallback(() => {
    if (!usage) return true;
    if (usage.is_unlimited) return true;
    
    const limit = usage.limits?.scenarios_per_month;
    const used = usage.used?.scenarios_this_month || 0;
    
    if (limit === null || limit === undefined) return true;
    return used < limit;
  }, [usage]);

  // Feature checks
  const hasFeature = useCallback((feature) => {
    if (!usage) return false;
    if (usage.is_unlimited) return true;
    return usage.features?.[feature] || false;
  }, [usage]);

  const canUseOutcomeKPIs = useCallback(() => hasFeature('outcome_kpis'), [hasFeature]);
  const canUseDecisionTimeline = useCallback(() => hasFeature('decision_timeline'), [hasFeature]);
  const canUseLearning = useCallback(() => hasFeature('learning'), [hasFeature]);
  const canUseExports = useCallback(() => hasFeature('exports'), [hasFeature]);

  // Get remaining count
  const getRemainingDecisions = useCallback(() => {
    if (!usage || usage.is_unlimited) return null;
    const limit = usage.limits?.decisions_per_month;
    const used = usage.used?.decisions_this_month || 0;
    if (limit === null || limit === undefined) return null;
    return Math.max(0, limit - used);
  }, [usage]);

  const getRemainingScenarios = useCallback(() => {
    if (!usage || usage.is_unlimited) return null;
    const limit = usage.limits?.scenarios_per_month;
    const used = usage.used?.scenarios_this_month || 0;
    if (limit === null || limit === undefined) return null;
    return Math.max(0, limit - used);
  }, [usage]);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || usage?.role === 'admin';

  const value = {
    usage,
    isLoading,
    error,
    refetch: fetchUsage,
    
    // Plan info
    plan: usage?.plan || 'free',
    isAdmin,
    isUnlimited: usage?.is_unlimited || false,
    
    // Limit checks
    canCreateDecision,
    canGenerateScenarios,
    getRemainingDecisions,
    getRemainingScenarios,
    
    // Feature checks
    canUseOutcomeKPIs,
    canUseDecisionTimeline,
    canUseLearning,
    canUseExports,
    hasFeature,
    
    // Raw limits/used for display
    limits: usage?.limits || {},
    used: usage?.used || {},
    features: usage?.features || {},
  };

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsage = () => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within UsageProvider');
  }
  return context;
};

export default UsageContext;

