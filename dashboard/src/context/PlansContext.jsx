import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { plansApi } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const PlansContext = createContext();

export const PlansProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch plans from backend when authenticated
  const fetchPlans = useCallback(async () => {
    if (!isAuthenticated) {
      setPlans([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await plansApi.list();
      // Transform backend data to match frontend expectations
      const transformedPlans = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency || 'USD',
        interval: plan.billing_cycle || 'monthly',
        description: '',
        stripePriceId: plan.stripe_price_id || '',
        createdAt: plan.created_at
      }));
      setPlans(transformedPlans);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError(err.message || 'Failed to load plans');
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch plans when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchPlans();
    }
  }, [authLoading, fetchPlans]);

  // Add a new plan via API
  const addPlan = async ({ name, price, currency, interval, description, stripePriceId }) => {
    setError(null);

    try {
      const { data } = await plansApi.create(
        name, 
        Number(price), 
        currency || 'USD', 
        interval || 'monthly',
        stripePriceId || ''
      );
      
      // Add the new plan to state with local-only fields
      const newPlan = {
        id: data.id,
        name: data.name,
        price: data.price,
        currency: data.currency || currency || 'USD',
        interval: data.billing_cycle || interval || 'monthly',
        description: description || '',
        stripePriceId: data.stripe_price_id || stripePriceId || '',
        createdAt: data.created_at
      };
      
      setPlans(prev => [...prev, newPlan]);
      return { success: true, plan: newPlan };
    } catch (err) {
      console.error('Failed to add plan:', err);
      setError(err.message || 'Failed to add plan');
      return { success: false, error: err.message };
    }
  };

  // Remove a plan via API
  const removePlan = async (id) => {
    setError(null);

    try {
      await plansApi.delete(id);
      setPlans(prev => prev.filter(plan => plan.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Failed to remove plan:', err);
      setError(err.message || 'Failed to remove plan');
      return { success: false, error: err.message };
    }
  };

  // Update a plan via API
  const updatePlan = async (id, partialData) => {
    setError(null);

    try {
      // Convert frontend keys to backend keys
      const backendData = {};
      if (partialData.name !== undefined) backendData.name = partialData.name;
      if (partialData.price !== undefined) backendData.price = Number(partialData.price);
      if (partialData.currency !== undefined) backendData.currency = partialData.currency;
      if (partialData.interval !== undefined) backendData.billing_cycle = partialData.interval;
      if (partialData.stripePriceId !== undefined) backendData.stripe_price_id = partialData.stripePriceId;

      const { data } = await plansApi.update(id, backendData);
      
      // Update the plan in state
      const updatedPlan = {
        id: data.id,
        name: data.name,
        price: data.price,
        currency: data.currency || 'USD',
        interval: data.billing_cycle || 'monthly',
        description: '',
        stripePriceId: data.stripe_price_id || '',
        createdAt: data.created_at
      };

      setPlans(prev =>
        prev.map(plan =>
          plan.id === id ? updatedPlan : plan
        )
      );
      return { success: true, plan: updatedPlan };
    } catch (err) {
      console.error('Failed to update plan:', err);
      setError(err.message || 'Failed to update plan');
      return { success: false, error: err.message };
    }
  };

  // Clear all plans locally (for reset demo data feature)
  const clearPlans = () => {
    setPlans([]);
  };

  // Reset plans by refetching from backend
  const resetPlans = () => {
    fetchPlans();
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value = {
    plans,
    isLoading,
    error,
    addPlan,
    removePlan,
    updatePlan,
    clearPlans,
    resetPlans,
    clearError,
    refetch: fetchPlans
  };

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
};

export const usePlans = () => {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans must be used within PlansProvider');
  }
  return context;
};
