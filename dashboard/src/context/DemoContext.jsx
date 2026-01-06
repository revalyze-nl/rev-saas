import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { demoApi } from '../lib/apiClient';

const DemoContext = createContext();

export const DemoProvider = ({ children }) => {
  const { user } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  // Demo mode is ON when user.role === "investor" and demo is not disabled
  const isDemoMode = user?.role === 'investor' && !user?.demo_disabled;

  // Dismiss banner for this session only
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  // Show banner if in demo mode and not dismissed
  const showBanner = isDemoMode && !bannerDismissed;

  // Replace demo data with real data
  const replaceDemoData = useCallback(async () => {
    setIsReplacing(true);
    try {
      await demoApi.replace();
      // Force reload to clear all cached data and refresh user state
      window.location.href = '/app';
      return { success: true };
    } catch (err) {
      console.error('Failed to replace demo data:', err);
      setIsReplacing(false);
      return { success: false, error: err.message };
    }
  }, []);

  const value = {
    isDemoMode,
    showBanner,
    isReplacing,
    dismissBanner,
    replaceDemoData,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }
  return context;
};
