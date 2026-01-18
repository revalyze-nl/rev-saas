import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { stripeApi, workspaceApi } from '../../lib/apiClient';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'danger', loading = false }) => {
  if (!isOpen) return null;

  const buttonStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-900',
    primary: 'bg-white hover:bg-slate-100 text-slate-900',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonStyles[confirmStyle]}`}
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
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => onClose(), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/30 text-red-300',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 border rounded-xl flex items-center gap-2 ${styles[toast.type] || styles.success}`}>
      {toast.type === 'success' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, updateProfile } = useSettings();

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    profile: false,
    stripe: false,
    defaults: false,
    danger: false,
  });

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState({ connected: false, loading: true });
  const [stripeAction, setStripeAction] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [stripeSyncWarnings, setStripeSyncWarnings] = useState([]);

  // Toast state
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
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
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
  };

  return (
    <div className="max-w-2xl mx-auto pt-8">
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

      {/* Header - matches Verdict page exactly */}
      <div className="text-center mb-12">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Account Management
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          Settings
        </h1>
        <p className="text-lg text-slate-400">
          Manage your account, integrations and preferences.
        </p>
      </div>

      {/* Form sections - matches Verdict form style */}
      <div className="space-y-4">

        {/* User Profile Section (Collapsible) */}
        <div className="border border-slate-800/30 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('profile')}
            className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
          >
            <span className="text-sm text-slate-400">
              User profile
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.profile ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.profile && (
            <div className="p-4 bg-slate-900/20 border-t border-slate-800/30 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Role</label>
                <input
                  type="text"
                  value={profile.role || ''}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  placeholder="Founder, Product Lead..."
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Display Currency</label>
                <select
                  value={profile.currency || 'USD'}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stripe Integration (Collapsible) */}
        <div className="border border-slate-800/30 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('stripe')}
            className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                Stripe integration
              </span>
              {!stripeStatus.loading && (
                <span className={`px-2 py-0.5 text-xs rounded ${stripeStatus.connected
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                  }`}>
                  {stripeStatus.connected ? 'Connected' : 'Not connected'}
                </span>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.stripe ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.stripe && (
            <div className="p-4 bg-slate-900/20 border-t border-slate-800/30">
              <p className="text-sm text-slate-400 mb-4">
                Connect your Stripe account to auto-sync MRR and customer data.
              </p>

              {stripeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-sm text-red-400">{stripeError}</p>
                </div>
              )}

              {stripeSyncWarnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                  <p className="text-sm font-medium text-amber-400 mb-1">Sync completed with warnings:</p>
                  <ul className="text-sm text-amber-300/80 list-disc list-inside">
                    {stripeSyncWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                {stripeStatus.connected ? (
                  <>
                    <button
                      onClick={handleStripeSync}
                      disabled={stripeAction === 'syncing'}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {stripeAction === 'syncing' && (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      Sync now
                    </button>
                    <button
                      onClick={() => setShowDisconnectModal(true)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20"
                    >
                      Disconnect
                    </button>
                    {stripeStatus.last_sync_at && (
                      <span className="text-xs text-slate-500 flex items-center">
                        Last synced: {new Date(stripeStatus.last_sync_at).toLocaleString()}
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeAction === 'connecting'}
                    className="px-3 py-1.5 bg-[#635BFF] hover:bg-[#5851DB] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {stripeAction === 'connecting' && (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Connect Stripe
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Decision Defaults (Collapsible) */}
        <div className="border border-slate-800/30 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('defaults')}
            className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
          >
            <span className="text-sm text-slate-400">
              Decision defaults
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.defaults ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.defaults && (
            <div className="p-4 bg-slate-900/20 border-t border-slate-800/30">
              {workspaceLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-slate-800/50 rounded-lg" />
                  <div className="h-8 bg-slate-800/50 rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">Company Stage</label>
                      <select
                        value={workspaceDefaults.companyStage}
                        onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, companyStage: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
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

                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">Business Model</label>
                      <select
                        value={workspaceDefaults.businessModel}
                        onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, businessModel: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
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

                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">Primary KPI</label>
                      <select
                        value={workspaceDefaults.primaryKpi}
                        onChange={(e) => setWorkspaceDefaults(prev => ({ ...prev, primaryKpi: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
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

                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">Market Type</label>
                      <select
                        value={workspaceDefaults.market.type}
                        onChange={(e) => setWorkspaceDefaults(prev => ({
                          ...prev,
                          market: { ...prev.market, type: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                      >
                        <option value="">Select type...</option>
                        <option value="b2b">B2B</option>
                        <option value="b2c">B2C</option>
                        <option value="b2b2c">B2B2C</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveWorkspaceDefaults}
                    disabled={workspaceSaving}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {workspaceSaving && (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Save defaults
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone (Collapsible) */}
        <div className="border border-slate-800/30 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('danger')}
            className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                Danger zone
              </span>
              <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                Destructive
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.danger ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.danger && (
            <div className="p-4 bg-slate-900/20 border-t border-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Delete Account</p>
                  <p className="text-xs text-slate-600">Permanently delete your account and all data.</p>
                </div>
                <button
                  disabled
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 opacity-50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Export Data</p>
                  <p className="text-xs text-slate-600">Download all your decisions and settings.</p>
                </div>
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-medium rounded-lg opacity-50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Company & Metrics Link - Main CTA like Verdict page */}
        <Link
          to="/app/company"
          className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          Manage Company & Metrics
        </Link>

        {/* Footer note */}
        <p className="text-xs text-slate-600 mt-4 text-center">
          Changes are saved automatically.
        </p>
      </div>
    </div>
  );
};

export default Settings;
