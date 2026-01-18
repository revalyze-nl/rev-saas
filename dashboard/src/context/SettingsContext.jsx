import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { workspaceApi } from '../lib/apiClient';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { user, updateUser: authUpdateUser } = useAuth();

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    companyName: '',
    companyWebsite: '',
    currency: 'EUR'
  });
  const [loading, setLoading] = useState(true);

  // Sync with AuthContext user and fetch workspace info
  useEffect(() => {
    // Immediate update from user object (AuthContext)
    if (user) {
      setProfile(prev => ({
        ...prev,
        fullName: user.full_name || user.name || '',
        email: user.email || '',
        role: user.role || '',
        currency: user.currency || 'EUR'
      }));
    }

    const loadWorkspaceProfile = async () => {
      try {
        setLoading(true);

        if (user) {
          // Fetch workspace/company info via apiClient
          const { data } = await workspaceApi.getProfile();

          if (data) {
            setProfile(prev => ({
              ...prev,
              companyName: data.companyName || '',
              companyWebsite: data.companyWebsite || ''
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load workspace profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadWorkspaceProfile();
    }
  }, [user]);

  const updateProfile = async (updates) => {
    try {
      // Split updates between user and workspace
      const userUpdates = {};
      const wsUpdates = {};
      let hasUserUpdates = false;
      let hasWsUpdates = false;

      if ('fullName' in updates) { userUpdates.full_name = updates.fullName; hasUserUpdates = true; }
      if ('role' in updates) { userUpdates.role = updates.role; hasUserUpdates = true; }
      if ('currency' in updates) { userUpdates.currency = updates.currency; hasUserUpdates = true; }

      if ('companyName' in updates) { wsUpdates.companyName = updates.companyName; hasWsUpdates = true; }
      if ('companyWebsite' in updates) { wsUpdates.companyWebsite = updates.companyWebsite; hasWsUpdates = true; }

      if (hasUserUpdates) {
        // Use AuthContext update method to keep global state in sync
        await authUpdateUser(userUpdates);
      }

      if (hasWsUpdates) {
        // Use workspaceApi which handles base URL and headers
        await workspaceApi.updateProfile(wsUpdates);
      }

      // Update local state
      setProfile(prev => ({
        ...prev,
        ...updates
      }));

      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const resetProfile = () => {
    // Basic reset
    setProfile({
      fullName: '',
      email: '',
      role: '',
      companyName: '',
      companyWebsite: '',
      currency: 'EUR'
    });
  };

  const value = {
    profile,
    updateProfile,
    resetProfile,
    loading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
