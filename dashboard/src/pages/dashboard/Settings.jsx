import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { usePlans } from '../../context/PlansContext';
import { useCompetitors } from '../../context/CompetitorsContext';
import { useAnalysis } from '../../context/AnalysisV2Context';
import { useBusinessMetrics } from '../../context/BusinessMetricsContext';
import { toPlanKey, computeTotalFromPlanCounts, hasPlanCounts } from '../../lib/planUtils';
import { stripeApi } from '../../lib/apiClient';

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, updateProfile } = useSettings();
  const { plans, clearPlans } = usePlans();
  const { clearCompetitors } = useCompetitors();
  const { clearAnalyses } = useAnalysis();
  const { metrics, saveMetrics, isSaving, error: metricsError, clearError, refetch: refetchMetrics } = useBusinessMetrics();

  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [metricsForm, setMetricsForm] = useState({
    currency: 'USD',
    mrr: '',
    customers: '',
    monthly_churn_rate: '',
    total_active_customers: '',
    plan_customer_counts: {}
  });
  const [metricsSaved, setMetricsSaved] = useState(false);
  const [showPlanCounts, setShowPlanCounts] = useState(false);

  // Stripe state
  const [stripeStatus, setStripeStatus] = useState({ connected: false, loading: true });
  const [stripeAction, setStripeAction] = useState(null); // 'connecting' | 'syncing' | 'disconnecting'
  const [stripeError, setStripeError] = useState(null);
  const [stripeSyncWarnings, setStripeSyncWarnings] = useState([]);
  const [stripeToast, setStripeToast] = useState(null);

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

  // Initial fetch
  useEffect(() => {
    fetchStripeStatus();
  }, [fetchStripeStatus]);

  // Handle ?stripe=connected query param
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'connected') {
      setStripeToast({ type: 'success', message: 'Stripe account connected successfully!' });
      fetchStripeStatus();
      // Remove query param
      searchParams.delete('stripe');
      setSearchParams(searchParams, { replace: true });
      // Auto-hide toast
      setTimeout(() => setStripeToast(null), 5000);
    } else if (stripeParam === 'error') {
      const errorCode = searchParams.get('error') || 'unknown';
      setStripeToast({ type: 'error', message: `Failed to connect Stripe: ${errorCode}` });
      searchParams.delete('stripe');
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setStripeToast(null), 5000);
    }
  }, [searchParams, setSearchParams, fetchStripeStatus]);

  // Stripe handlers
  const handleStripeConnect = async () => {
    setStripeAction('connecting');
    setStripeError(null);
    try {
      const { data } = await stripeApi.connect();
      if (data.url) {
        window.location.href = data.url;
      }
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
        setStripeToast({ type: 'success', message: 'Metrics synced from Stripe!' });
        setTimeout(() => setStripeToast(null), 5000);
        // Refresh metrics and stripe status
        if (refetchMetrics) refetchMetrics();
        fetchStripeStatus();
        if (data.warnings && data.warnings.length > 0) {
          setStripeSyncWarnings(data.warnings);
        }
      }
    } catch (err) {
      setStripeError(err.message || 'Failed to sync metrics');
    } finally {
      setStripeAction(null);
    }
  };

  const handleStripeDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account?')) return;
    
    setStripeAction('disconnecting');
    setStripeError(null);
    try {
      await stripeApi.disconnect();
      setStripeStatus({ connected: false, loading: false });
      setStripeToast({ type: 'success', message: 'Stripe account disconnected' });
      setTimeout(() => setStripeToast(null), 5000);
    } catch (err) {
      setStripeError(err.message || 'Failed to disconnect Stripe');
    } finally {
      setStripeAction(null);
    }
  };

  // Initialize form with existing metrics
  useEffect(() => {
    if (metrics) {
      const planCounts = metrics.plan_customer_counts || {};
      setMetricsForm({
        currency: metrics.currency || 'USD',
        mrr: metrics.mrr?.toString() || '',
        customers: metrics.customers?.toString() || '',
        monthly_churn_rate: metrics.monthly_churn_rate?.toString() || '',
        total_active_customers: metrics.total_active_customers?.toString() || '',
        plan_customer_counts: planCounts
      });
      // Show plan counts section if there are existing values
      if (hasPlanCounts(planCounts)) {
        setShowPlanCounts(true);
      }
    }
  }, [metrics]);

  const handleInputChange = (field, value) => {
    updateProfile({ [field]: value });
    
    // Show "saved" message briefly
    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
    }, 2000);
  };

  const handleMetricsChange = (field, value) => {
    setMetricsForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (metricsError) clearError();
    if (metricsSaved) setMetricsSaved(false);
  };

  const handlePlanCountChange = (planKey, value) => {
    const numValue = value === '' ? '' : parseInt(value) || 0;
    setMetricsForm(prev => {
      const updatedCounts = {
        ...prev.plan_customer_counts,
        [planKey]: numValue,
      };
      
      // Auto-update total if plan counts are filled
      let newTotal = prev.total_active_customers;
      if (hasPlanCounts(updatedCounts)) {
        newTotal = computeTotalFromPlanCounts(updatedCounts).toString();
      }
      
      return {
        ...prev,
        plan_customer_counts: updatedCounts,
        total_active_customers: newTotal
      };
    });
    if (metricsError) clearError();
    if (metricsSaved) setMetricsSaved(false);
  };

  // Compute if total is auto-calculated
  const isAutoTotal = hasPlanCounts(metricsForm.plan_customer_counts);
  const computedTotal = isAutoTotal ? computeTotalFromPlanCounts(metricsForm.plan_customer_counts) : null;

  const handleMetricsSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      currency: metricsForm.currency,
      mrr: parseFloat(metricsForm.mrr) || 0,
      customers: parseInt(metricsForm.customers) || 0,
      monthly_churn_rate: parseFloat(metricsForm.monthly_churn_rate) || 0
    };

    // Include total_active_customers if set
    const totalValue = isAutoTotal ? computedTotal : parseInt(metricsForm.total_active_customers);
    if (!isNaN(totalValue) && totalValue >= 0) {
      payload.total_active_customers = totalValue;
    }

    // Include plan_customer_counts if any values are filled
    if (metricsForm.plan_customer_counts && Object.keys(metricsForm.plan_customer_counts).length > 0) {
      const cleanedCounts = {};
      for (const [key, value] of Object.entries(metricsForm.plan_customer_counts)) {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0) {
          cleanedCounts[key] = numValue;
        }
      }
      if (Object.keys(cleanedCounts).length > 0) {
        payload.plan_customer_counts = cleanedCounts;
      }
    }

    const result = await saveMetrics(payload);

    if (result.success) {
      setMetricsSaved(true);
      setTimeout(() => setMetricsSaved(false), 3000);
    }
  };

  const handleResetDemoData = () => {
    const confirmed = window.confirm(
      'This will clear all local plans, competitors, and analyses. Are you sure?'
    );

    if (confirmed) {
      clearPlans();
      clearCompetitors();
      clearAnalyses();
      
      // Show success message or feedback
      alert('Demo data has been reset successfully.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Settings
        </h1>
        <p className="text-slate-400">
          Manage your profile, business metrics, and workspace preferences.
        </p>
      </div>

      {/* Profile & Workspace Section */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Profile & Workspace
          </h2>
          <p className="text-sm text-slate-400">
            Your personal information and company details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-300 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={profile.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-slate-300 mb-2">
              Role
            </label>
            <input
              id="role"
              type="text"
              value={profile.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="Founder, Head of Product, etc."
            />
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-semibold text-slate-300 mb-2">
              Display Currency
            </label>
            <select
              id="currency"
              value={profile.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.5rem'
              }}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-slate-300 mb-2">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              value={profile.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="Acme Inc."
            />
          </div>

          {/* Company Website */}
          <div>
            <label htmlFor="companyWebsite" className="block text-sm font-semibold text-slate-300 mb-2">
              Company Website <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="companyWebsite"
              type="url"
              value={profile.companyWebsite}
              onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="https://acme.com"
            />
          </div>
        </div>

        {/* Saved Indicator */}
        {showSavedMessage && (
          <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-400">
              Changes saved locally
            </p>
          </div>
        )}
      </div>

      {/* Stripe Toast */}
      {stripeToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
          stripeToast.type === 'success' 
            ? 'bg-emerald-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          {stripeToast.type === 'success' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span className="font-medium">{stripeToast.message}</span>
          <button onClick={() => setStripeToast(null)} className="ml-2 hover:opacity-80">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stripe Integration Card */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Stripe Logo */}
            <div className="w-10 h-10 bg-[#635BFF] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Stripe Integration</h3>
              <p className="text-sm text-slate-400">Connect to auto-sync MRR and customer data</p>
            </div>
          </div>

          {/* Status Pill */}
          {!stripeStatus.loading && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              stripeStatus.connected 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {stripeStatus.connected ? 'Connected' : 'Not connected'}
            </span>
          )}
        </div>

        {/* Error */}
        {stripeError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
            <p className="text-sm text-red-400">{stripeError}</p>
            <button onClick={() => setStripeError(null)} className="text-red-400 hover:text-red-300 p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Sync Warnings */}
        {stripeSyncWarnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm font-medium text-amber-400 mb-1">Sync completed with warnings:</p>
            <ul className="text-sm text-amber-300/80 list-disc list-inside">
              {stripeSyncWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {stripeStatus.loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          ) : stripeStatus.connected ? (
            <>
              <button
                onClick={handleStripeSync}
                disabled={stripeAction === 'syncing'}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {stripeAction === 'syncing' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
                onClick={handleStripeDisconnect}
                disabled={stripeAction === 'disconnecting'}
                className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl font-medium hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stripeAction === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
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
              className="px-4 py-2 bg-[#635BFF] text-white rounded-xl font-medium hover:bg-[#5851DB] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {stripeAction === 'connecting' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

        {/* Info text */}
        {!stripeStatus.connected && !stripeStatus.loading && (
          <p className="mt-3 text-xs text-slate-500">
            Connect your Stripe account to automatically sync MRR, customer counts, and currency data.
          </p>
        )}
      </div>

      {/* Business Metrics Section */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Business Metrics
          </h2>
          <p className="text-sm text-slate-400">
            Your current SaaS metrics. These will be used to provide more accurate pricing recommendations.
          </p>
        </div>

        <form onSubmit={handleMetricsSubmit}>
          {/* Error Banner */}
          {metricsError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
              <p className="text-sm text-red-400">{metricsError}</p>
              <button 
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Currency */}
            <div>
              <label htmlFor="metricsCurrency" className="block text-sm font-semibold text-slate-300 mb-2">
                Revenue Currency
              </label>
              <select
                id="metricsCurrency"
                value={metricsForm.currency}
                onChange={(e) => handleMetricsChange('currency', e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none pr-10 disabled:opacity-50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.5rem'
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* MRR */}
            <div>
              <label htmlFor="mrr" className="block text-sm font-semibold text-slate-300 mb-2">
                Monthly Recurring Revenue (MRR)
              </label>
              <input
                id="mrr"
                type="number"
                step="0.01"
                min="0"
                value={metricsForm.mrr}
                onChange={(e) => handleMetricsChange('mrr', e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                placeholder="e.g., 15000"
              />
            </div>

            {/* Customers */}
            <div>
              <label htmlFor="customers" className="block text-sm font-semibold text-slate-300 mb-2">
                Number of Customers
              </label>
              <input
                id="customers"
                type="number"
                min="0"
                value={metricsForm.customers}
                onChange={(e) => handleMetricsChange('customers', e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                placeholder="e.g., 120"
              />
            </div>

            {/* Monthly Churn Rate */}
            <div>
              <label htmlFor="churnRate" className="block text-sm font-semibold text-slate-300 mb-2">
                Monthly Churn Rate (%)
              </label>
              <input
                id="churnRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={metricsForm.monthly_churn_rate}
                onChange={(e) => handleMetricsChange('monthly_churn_rate', e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                placeholder="e.g., 2.5"
              />
            </div>

            {/* Total Active Customers */}
            <div>
              <label htmlFor="totalActiveCustomers" className="block text-sm font-semibold text-slate-300 mb-2">
                Total Active Customers <span className="text-slate-500 font-normal">(optional)</span>
                {isAutoTotal && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">Auto</span>
                )}
              </label>
              <input
                id="totalActiveCustomers"
                type="number"
                min="0"
                value={isAutoTotal ? computedTotal : metricsForm.total_active_customers}
                onChange={(e) => handleMetricsChange('total_active_customers', e.target.value)}
                disabled={isSaving || isAutoTotal}
                className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 ${isAutoTotal ? 'cursor-not-allowed' : ''}`}
                placeholder="e.g., 500"
              />
              <p className="mt-1 text-xs text-slate-500">
                {isAutoTotal 
                  ? 'Calculated from customers by plan below.'
                  : 'Optional. Expand below to enter customers by plan.'}
              </p>
            </div>
          </div>

          {/* Customers by Plan (Collapsible) */}
          {plans && plans.length > 0 && (
            <div className="mt-6 border border-slate-700 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPlanCounts(!showPlanCounts)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-300">
                  Customers by Plan <span className="text-slate-500 font-normal">(optional)</span>
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${showPlanCounts ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPlanCounts && (
                <div className="p-4 space-y-4 bg-slate-900/30">
                  <p className="text-xs text-slate-500 mb-3">
                    Enter the number of active customers on each plan. Total will be calculated automatically.
                  </p>
                  {plans.map((plan) => {
                    const planKey = toPlanKey(plan);
                    const count = metricsForm.plan_customer_counts?.[planKey] ?? '';
                    return (
                      <div key={planKey} className="flex items-center gap-4">
                        <label className="flex-1 text-sm text-slate-300">
                          {plan.name} customers
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) => handlePlanCountChange(planKey, e.target.value)}
                          disabled={isSaving}
                          className="w-32 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-right disabled:opacity-50"
                          placeholder="0"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Metrics'
              )}
            </button>

            {metricsSaved && (
              <span className="text-sm text-emerald-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Metrics saved successfully
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Demo Environment Section */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Demo Environment
          </h2>
          <p className="text-sm text-slate-400">
            This environment is currently running in demo mode. You can clear all local pricing data (plans, competitors, and analyses) to start over.
          </p>
        </div>

        <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700 mb-6">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-white font-medium mb-1">
              Warning
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Resetting demo data will permanently delete all plans, competitors, and pricing analyses from your browser. This action cannot be undone.
            </p>
          </div>
        </div>

        <button
          onClick={handleResetDemoData}
          className="px-6 py-3 bg-slate-800 text-red-400 border border-red-500/30 rounded-xl font-semibold hover:bg-red-500/10 hover:border-red-500/50 transition-all"
        >
          Reset Demo Data
        </button>

        <p className="mt-4 text-sm text-slate-500">
          This only affects local demo data in your browser. No real accounts or billing data are involved yet.
        </p>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-500/5 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-white font-semibold mb-1">
              About Demo Mode
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              You're currently using Revalyze in demo mode. All data is stored locally in your browser. Once we launch full accounts and billing, you'll be able to sync your data across devices and collaborate with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
