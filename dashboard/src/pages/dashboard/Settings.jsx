import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { stripeApi, workspaceApi } from '../../lib/apiClient';

// Skeleton Loading Component
const SkeletonField = () => (
  <div className="animate-pulse">
    <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
    <div className="h-12 w-full bg-slate-800 rounded-xl" />
  </div>
);

const SkeletonCard = ({ rows = 4 }) => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <div className="h-10 w-10 bg-slate-700 rounded-xl" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'danger', loading = false }) => {
  if (!isOpen) return null;

  const buttonStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-900',
    primary: 'bg-violet-500 hover:bg-violet-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonStyles[confirmStyle]}`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Component
const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-500/90 text-white',
    error: 'bg-red-500/90 text-white',
    warning: 'bg-amber-500/90 text-slate-900',
    info: 'bg-violet-500/90 text-white',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 ${styles[toast.type] || styles.info}`}>
      {icons[toast.type] || icons.info}
      <span className="font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ id, title, children, defaultOpen = true, badge = null, icon = null, expandedSections, toggleSection }) => {
  const isOpen = expandedSections[id] ?? defaultOpen;
  
  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 to-slate-700 rounded-3xl blur opacity-5 group-hover:opacity-10 transition-opacity" />
      <div className="relative bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
            {badge}
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="px-6 pb-6 pt-0 border-t border-slate-800/50">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, updateProfile } = useSettings();

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    stripe: true,
    defaults: false,
    danger: false,
  });

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState({ connected: false, loading: true });
  const [stripeAction, setStripeAction] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [stripeSyncWarnings, setStripeSyncWarnings] = useState([]);

  // Toast state (unified)
  const [toast, setToast] = useState(null);

  // Confirmation modal state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Workspace defaults state
  const [workspaceDefaults, setWorkspaceDefaults] = useState({
    companyStage: '',
    businessModel: '',
    primaryKpi: '',
    market: { type: '', segment: '' }
  });
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);

  // Toggle section
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Show toast helper
  const showToast = useCallback((type, message, duration = 5000) => {
    setToast({ type, message });
    if (duration > 0) {
      setTimeout(() => setToast(null), duration);
    }
  }, []);

  // Fetch Stripe status
  const fetchStripeStatus = useCallback(async () => {
    try {
      const { data } = await stripeApi.getStatus();
      setStripeStatus({ ...data, loading: false });
    } catch (err) {
      console.error('Failed to fetch Stripe status:', err);
      setStripeStatus({ connected: false, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchStripeStatus();
  }, [fetchStripeStatus]);

  // Fetch workspace defaults
  const fetchWorkspaceDefaults = useCallback(async () => {
    try {
      const { data } = await workspaceApi.getProfile();
      if (data?.defaults) {
        setWorkspaceDefaults({
          companyStage: data.defaults.companyStage || '',
          businessModel: data.defaults.businessModel || '',
          primaryKpi: data.defaults.primaryKpi || '',
          market: {
            type: data.defaults.market?.type || '',
            segment: data.defaults.market?.segment || ''
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch workspace defaults:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceDefaults();
  }, [fetchWorkspaceDefaults]);

  // Save workspace defaults
  const handleSaveWorkspaceDefaults = async () => {
    setWorkspaceSaving(true);
    try {
      const payload = {
        companyStage: workspaceDefaults.companyStage || undefined,
        businessModel: workspaceDefaults.businessModel || undefined,
        primaryKpi: workspaceDefaults.primaryKpi || undefined,
        market: (workspaceDefaults.market.type || workspaceDefaults.market.segment) ? {
          type: workspaceDefaults.market.type || undefined,
          segment: workspaceDefaults.market.segment || undefined,
        } : undefined,
      };
      await workspaceApi.updateDefaults(payload);
      showToast('success', 'Workspace defaults saved!');
    } catch (err) {
      showToast('error', err.message || 'Failed to save defaults');
    } finally {
      setWorkspaceSaving(false);
    }
  };

  // Handle ?stripe=connected query param
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'connected') {
      showToast('success', 'Stripe account connected successfully!');
      fetchStripeStatus();
      searchParams.delete('stripe');
      setSearchParams(searchParams, { replace: true });
    } else if (stripeParam === 'error') {
      const errorCode = searchParams.get('error') || 'unknown';
      showToast('error', `Failed to connect Stripe: ${errorCode}`);
      searchParams.delete('stripe');
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchStripeStatus, showToast]);

  // Stripe handlers
  const handleStripeConnect = async () => {
    setStripeAction('connecting');
    setStripeError(null);
    try {
      const { data } = await stripeApi.connect();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setStripeError(err.message || 'Failed to start Stripe connection');
      setStripeAction(null);
    }
  };

  const handleStripeSync = async () => {
    setStripeAction('syncing');
    setStripeError(null);
    setStripeSyncWarnings([]);
    try {
      const { data } = await stripeApi.syncMetrics();
      if (data.ok) {
        showToast('success', 'Metrics synced from Stripe!');
        fetchStripeStatus();
        if (data.warnings?.length > 0) setStripeSyncWarnings(data.warnings);
      }
    } catch (err) {
      setStripeError(err.message || 'Failed to sync metrics');
    } finally {
      setStripeAction(null);
    }
  };

  const handleStripeDisconnect = async () => {
    setStripeAction('disconnecting');
    setStripeError(null);
    try {
      await stripeApi.disconnect();
      setStripeStatus({ connected: false, loading: false });
      showToast('success', 'Stripe account disconnected');
      setShowDisconnectModal(false);
    } catch (err) {
      setStripeError(err.message || 'Failed to disconnect Stripe');
    } finally {
      setStripeAction(null);
    }
  };

  const handleInputChange = (field, value) => {
    updateProfile({ [field]: value });
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleStripeDisconnect}
        title="Disconnect Stripe?"
        message="This will remove the connection to your Stripe account. Your synced data will remain, but automatic syncing will stop."
        confirmText={stripeAction === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
        confirmStyle="danger"
        loading={stripeAction === 'disconnecting'}
      />

      {/* Hero Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-400 text-lg">
                Manage your account and integrations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* User Profile Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">User Profile</h2>
                  <p className="text-sm text-slate-400">Your personal account information</p>
                </div>
              </div>
              {showSavedMessage && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'fullName', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
                { id: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
                { id: 'role', label: 'Role', placeholder: 'Founder, Head of Product...', type: 'text' },
              ].map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={profile[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
              
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Display Currency</label>
                <select
                  value={profile.currency || 'USD'}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Company Settings Link */}
            <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Company & Metrics</p>
                    <p className="text-xs text-slate-500">Company profile and business metrics</p>
                  </div>
                </div>
                <Link 
                  to="/app/company"
                  className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/20 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  Manage
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Integration */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#635BFF] to-indigo-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#635BFF] rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Stripe Integration</h2>
                  <p className="text-sm text-slate-400">Connect to auto-sync MRR and customer data</p>
                </div>
              </div>
              {stripeStatus.loading ? (
                <div className="px-3 py-1 rounded-full bg-slate-700 animate-pulse">
                  <div className="h-4 w-16 bg-slate-600 rounded" />
                </div>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  stripeStatus.connected 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {stripeStatus.connected ? 'Connected' : 'Not connected'}
                </span>
              )}
            </div>

            {stripeError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
                <p className="text-sm text-red-400">{stripeError}</p>
                <button onClick={() => setStripeError(null)} className="text-red-400 hover:text-red-300 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {stripeSyncWarnings.length > 0 && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-sm font-medium text-amber-400 mb-1">Sync completed with warnings:</p>
                <ul className="text-sm text-amber-300/80 list-disc list-inside">
                  {stripeSyncWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {stripeStatus.loading ? (
                <SkeletonCard rows={1} />
              ) : stripeStatus.connected ? (
                <>
                  <button
                    onClick={handleStripeSync}
                    disabled={stripeAction === 'syncing'}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {stripeAction === 'syncing' ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync from Stripe
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={stripeAction === 'disconnecting'}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-medium hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                  {stripeStatus.last_sync_at && (
                    <span className="text-xs text-slate-500">
                      Last synced: {new Date(stripeStatus.last_sync_at).toLocaleString()}
                    </span>
                  )}
                </>
              ) : (
                <button
                  onClick={handleStripeConnect}
                  disabled={stripeAction === 'connecting'}
                  className="px-4 py-2.5 bg-[#635BFF] text-white rounded-xl font-medium hover:bg-[#5851DB] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {stripeAction === 'connecting' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Connect Stripe
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Defaults Section - Collapsible */}
        <CollapsibleSection
          id="defaults"
          title="Decision Defaults"
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          defaultOpen={false}
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          badge={
            <span className="text-xs text-slate-500 ml-2">Pre-fill context for new decisions</span>
          }
        >
          <div className="pt-4">
            {workspaceLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonField key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Company Stage */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Company Stage
                    </label>
                    <select
                      value={workspaceDefaults.companyStage}
                      onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, companyStage: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select stage...</option>
                      <option value="pre_seed">Pre-Seed</option>
                      <option value="seed">Seed</option>
                      <option value="series_a">Series A</option>
                      <option value="series_b">Series B</option>
                      <option value="series_c_plus">Series C+</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  {/* Business Model */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Business Model
                    </label>
                    <select
                      value={workspaceDefaults.businessModel}
                      onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, businessModel: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select model...</option>
                      <option value="saas">SaaS</option>
                      <option value="marketplace">Marketplace</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="services">Services</option>
                      <option value="hardware">Hardware</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  {/* Primary KPI */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Primary KPI
                    </label>
                    <select
                      value={workspaceDefaults.primaryKpi}
                      onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, primaryKpi: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select KPI...</option>
                      <option value="arr">ARR</option>
                      <option value="mrr">MRR</option>
                      <option value="gmv">GMV</option>
                      <option value="revenue">Revenue</option>
                      <option value="users">Users</option>
                      <option value="retention">Retention</option>
                    </select>
                  </div>

                  {/* Market Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Market Type
                    </label>
                    <select
                      value={workspaceDefaults.market.type}
                      onChange={(e) => setWorkspaceDefaults(prev => ({
                        ...prev,
                        market: { ...prev.market, type: e.target.value }
                      }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select type...</option>
                      <option value="b2b">B2B</option>
                      <option value="b2c">B2C</option>
                      <option value="b2b2c">B2B2C</option>
                    </select>
                  </div>

                  {/* Market Segment */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Market Segment
                    </label>
                    <select
                      value={workspaceDefaults.market.segment}
                      onChange={(e) => setWorkspaceDefaults(prev => ({
                        ...prev,
                        market: { ...prev.market, segment: e.target.value }
                      }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select segment...</option>
                      <option value="devtools">DevTools</option>
                      <option value="fintech">Fintech</option>
                      <option value="healthtech">Healthtech</option>
                      <option value="edtech">Edtech</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="crm">CRM</option>
                      <option value="hr">HR</option>
                      <option value="marketing">Marketing</option>
                      <option value="analytics">Analytics</option>
                      <option value="security">Security</option>
                      <option value="productivity">Productivity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    These defaults will auto-fill when analyzing new companies
                  </p>
                  <button
                    onClick={handleSaveWorkspaceDefaults}
                    disabled={workspaceSaving}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {workspaceSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Defaults
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Danger Zone - Collapsible */}
        <CollapsibleSection
          id="danger"
          title="Danger Zone"
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          defaultOpen={false}
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          badge={
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 ml-2">
              Destructive actions
            </span>
          }
        >
          <div className="pt-4 space-y-4">
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-1">Delete Account</h4>
                  <p className="text-xs text-slate-500">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Export Data</h4>
                  <p className="text-xs text-slate-500">
                    Download all your data including decisions, outcomes, and settings.
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-slate-700 text-slate-400 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default Settings;
