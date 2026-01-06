import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { usePlans } from '../../context/PlansContext';
import { useBusinessMetrics } from '../../context/BusinessMetricsContext';
import { competitorsV2Api } from '../../lib/apiClient';

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="relative bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const MyCompany = () => {
  const { profile, updateProfile } = useSettings();
  const { plans } = usePlans();
  const { metrics, saveMetrics, isSaving } = useBusinessMetrics();
  
  // Fetch competitors from V2 API
  const [competitors, setCompetitors] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);
  
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [metricsSaved, setMetricsSaved] = useState(false);
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    companyWebsite: '',
    industry: '',
    description: '',
    targetAudience: '',
    valueProposition: ''
  });
  
  // Metrics form
  const [metricsForm, setMetricsForm] = useState({
    currency: 'USD',
    mrr: '',
    customers: '',
    monthly_churn_rate: ''
  });
  
  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        const { data } = await competitorsV2Api.list();
        setCompetitors(data?.competitors || []);
      } catch (err) {
        console.error('Failed to fetch competitors:', err);
      } finally {
        setCompetitorsLoading(false);
      }
    };
    fetchCompetitors();
  }, []);
  
  // Sync profile form with context
  useEffect(() => {
    setProfileForm({
      companyName: profile.companyName || '',
      companyWebsite: profile.companyWebsite || '',
      industry: profile.industry || '',
      description: profile.description || '',
      targetAudience: profile.targetAudience || '',
      valueProposition: profile.valueProposition || ''
    });
  }, [profile]);
  
  // Sync metrics form with context
  useEffect(() => {
    if (metrics) {
      setMetricsForm({
        currency: metrics.currency || 'USD',
        mrr: metrics.mrr?.toString() || '',
        customers: metrics.customers?.toString() || '',
        monthly_churn_rate: metrics.monthly_churn_rate?.toString() || ''
      });
    }
  }, [metrics]);

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    const symbols = { USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || '$'}${amount?.toLocaleString() || '0'}`;
  };
  
  // Handle profile save
  const handleProfileSave = () => {
    updateProfile(profileForm);
    setProfileSaved(true);
    setTimeout(() => {
      setProfileSaved(false);
      setShowProfileModal(false);
    }, 1500);
  };
  
  // Handle metrics save
  const handleMetricsSave = async () => {
    const payload = {
      currency: metricsForm.currency,
      mrr: parseFloat(metricsForm.mrr) || 0,
      customers: parseInt(metricsForm.customers) || 0,
      monthly_churn_rate: parseFloat(metricsForm.monthly_churn_rate) || 0
    };
    
    const result = await saveMetrics(payload);
    if (result.success) {
      setMetricsSaved(true);
      setTimeout(() => {
        setMetricsSaved(false);
        setShowMetricsModal(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Profile Modal */}
      <Modal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)}
        title="Edit Company Profile"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Company Name</label>
              <input
                type="text"
                value={profileForm.companyName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                placeholder="Acme Inc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Website</label>
              <input
                type="url"
                value={profileForm.companyWebsite}
                onChange={(e) => setProfileForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                placeholder="https://acme.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Industry</label>
              <select
                value={profileForm.industry}
                onChange={(e) => setProfileForm(prev => ({ ...prev, industry: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all appearance-none"
              >
                <option value="">Select industry...</option>
                <option value="saas">SaaS / Software</option>
                <option value="ecommerce">E-commerce</option>
                <option value="fintech">Fintech</option>
                <option value="healthtech">Healthtech</option>
                <option value="edtech">Edtech</option>
                <option value="marketing">Marketing / AdTech</option>
                <option value="hr">HR / Recruitment</option>
                <option value="productivity">Productivity</option>
                <option value="developer_tools">Developer Tools</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Target Audience</label>
              <input
                type="text"
                value={profileForm.targetAudience}
                onChange={(e) => setProfileForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                placeholder="SMBs, Startups, Enterprises..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Company Description</label>
            <textarea
              value={profileForm.description}
              onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all resize-none"
              placeholder="What does your company do?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Value Proposition</label>
            <textarea
              value={profileForm.valueProposition}
              onChange={(e) => setProfileForm(prev => ({ ...prev, valueProposition: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all resize-none"
              placeholder="What makes your product unique?"
            />
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleProfileSave}
              disabled={profileSaved}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-70 flex items-center gap-2"
            >
              {profileSaved ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : 'Save Changes'}
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Metrics Modal */}
      <Modal 
        isOpen={showMetricsModal} 
        onClose={() => setShowMetricsModal(false)}
        title="Edit Business Metrics"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Revenue Currency</label>
              <select
                value={metricsForm.currency}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Monthly Recurring Revenue (MRR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={metricsForm.mrr}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, mrr: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="e.g., 15000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Number of Customers</label>
              <input
                type="number"
                min="0"
                value={metricsForm.customers}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, customers: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="e.g., 120"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Monthly Churn Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={metricsForm.monthly_churn_rate}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, monthly_churn_rate: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="e.g., 2.5"
              />
            </div>
          </div>
          
          {/* Calculated ARPU */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Calculated ARPU</span>
              <span className="text-lg font-bold text-emerald-400">
                {metricsForm.customers && parseFloat(metricsForm.customers) > 0
                  ? formatCurrency(
                      Math.round((parseFloat(metricsForm.mrr) || 0) / parseFloat(metricsForm.customers)),
                      metricsForm.currency
                    )
                  : '-'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleMetricsSave}
              disabled={isSaving || metricsSaved}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : metricsSaved ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : 'Save Metrics'}
            </button>
            <button
              onClick={() => setShowMetricsModal(false)}
              className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Hero Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                {profile.companyName ? (
                  <span className="text-2xl font-bold text-white">
                    {profile.companyName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  {profile.companyName || 'My Company'}
                </h1>
                <p className="text-slate-400 text-lg">
                  {profile.companyWebsite || 'Complete your company profile'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Pricing Plans', 
            value: plans.length, 
            icon: '💰',
            color: 'violet',
            link: '/app/plans',
            isLink: true
          },
          { 
            label: 'Competitors', 
            value: competitors.length, 
            icon: '🎯',
            color: 'fuchsia',
            link: '/app/competitors',
            isLink: true
          },
          { 
            label: 'MRR', 
            value: formatCurrency(metrics?.mrr, metrics?.currency), 
            icon: '📈',
            color: 'emerald',
            onClick: () => setShowMetricsModal(true),
            isLink: false
          },
          { 
            label: 'Customers', 
            value: metrics?.customers || 0, 
            icon: '👥',
            color: 'cyan',
            onClick: () => setShowMetricsModal(true),
            isLink: false
          }
        ].map((stat, index) => {
          const CardContent = (
            <>
              <div className={`absolute -inset-1 bg-gradient-to-r ${
                stat.color === 'violet' ? 'from-violet-600 to-purple-600' :
                stat.color === 'fuchsia' ? 'from-fuchsia-600 to-pink-600' :
                stat.color === 'emerald' ? 'from-emerald-600 to-teal-600' :
                'from-cyan-600 to-blue-600'
              } rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity`} />
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {stat.isLink ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    )}
                  </svg>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            </>
          );
          
          return stat.isLink ? (
            <Link key={index} to={stat.link} className="group relative">
              {CardContent}
            </Link>
          ) : (
            <button key={index} onClick={stat.onClick} className="group relative text-left">
              {CardContent}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Profile Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Company Profile</h2>
              </div>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-slate-500 text-sm min-w-[100px]">Industry</span>
                <span className="text-white font-medium">
                  {profile.industry ? profile.industry.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 text-sm min-w-[100px]">Target</span>
                <span className="text-white font-medium">{profile.targetAudience || '-'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 text-sm min-w-[100px]">Description</span>
                <span className="text-slate-300 text-sm leading-relaxed">{profile.description || 'No description yet'}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-500 text-sm min-w-[100px]">Value Prop</span>
                <span className="text-slate-300 text-sm leading-relaxed">{profile.valueProposition || 'Not defined yet'}</span>
              </div>
            </div>
            
            {!profile.companyName && (
              <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <p className="text-sm text-violet-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete your profile to get more accurate AI insights.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Business Metrics Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Business Metrics</h2>
              </div>
              <button 
                onClick={() => setShowMetricsModal(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            </div>
            
            {metrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">MRR</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(metrics.mrr, metrics.currency)}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Customers</p>
                  <p className="text-xl font-bold text-white">{metrics.customers || 0}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">ARPU</p>
                  <p className="text-xl font-bold text-white">
                    {metrics.customers > 0 
                      ? formatCurrency(Math.round(metrics.mrr / metrics.customers), metrics.currency)
                      : '-'}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Churn Rate</p>
                  <p className="text-xl font-bold text-white">
                    {metrics.monthly_churn_rate ? `${metrics.monthly_churn_rate}%` : '-'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-2">Add Business Metrics</h4>
                <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
                  Metrics like MRR and churn rate help calibrate simulation projections.
                </p>
                <button
                  onClick={() => setShowMetricsModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                >
                  Add Business Metrics
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Plans Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Pricing Plans</h2>
              </div>
              <Link to="/app/plans" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                Manage →
              </Link>
            </div>
            
            {plans.length > 0 ? (
              <div className="space-y-3">
                {plans.slice(0, 4).map((plan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div>
                      <p className="text-white font-medium">{plan.name}</p>
                      <p className="text-xs text-slate-400">{plan.billingPeriod || plan.interval || 'monthly'}</p>
                    </div>
                    <span className="text-lg font-bold text-cyan-400">
                      {formatCurrency(plan.price, plan.currency)}
                    </span>
                  </div>
                ))}
                {plans.length > 4 && (
                  <p className="text-sm text-slate-500 text-center pt-2">
                    +{plans.length - 4} more plans
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-slate-400 mb-4">No pricing plans yet</p>
                <Link 
                  to="/app/plans" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors text-sm font-medium"
                >
                  Add Your Plans
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Competitors Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-fuchsia-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Competitors</h2>
              </div>
              <Link to="/app/competitors" className="text-sm text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
                View All →
              </Link>
            </div>
            
            {competitors.length > 0 ? (
              <div className="space-y-3">
                {competitors.slice(0, 4).map((comp, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-fuchsia-400 font-bold text-sm">
                          {comp.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{comp.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{comp.url}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {comp.plans?.length || 0} plans
                    </span>
                  </div>
                ))}
                {competitors.length > 4 && (
                  <p className="text-sm text-slate-500 text-center pt-2">
                    +{competitors.length - 4} more competitors
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-2">Track Competitors</h4>
                <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
                  Competitor pricing helps benchmark your position in the market.
                </p>
                <Link
                  to="/app/competitors"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/20 transition-colors text-sm font-medium"
                >
                  Discover Competitors
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Run Analysis', icon: '⚡', to: '/app/analyses', color: 'violet' },
            { label: 'Add Competitor', icon: '🎯', to: '/app/competitors', color: 'fuchsia' },
            { label: 'Create Plan', icon: '💰', to: '/app/plans', color: 'emerald' },
            { label: 'View Reports', icon: '📊', to: '/app/reports', color: 'cyan' }
          ].map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="group p-4 bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all flex items-center gap-3"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyCompany;
