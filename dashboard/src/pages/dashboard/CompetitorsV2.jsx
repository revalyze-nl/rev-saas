import { useState, useEffect } from 'react';
import { competitorsV2Api } from '../../lib/apiClient';
import { useBusinessMetrics } from '../../context/BusinessMetricsContext';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingGuidanceBanner from '../../components/onboarding/OnboardingGuidanceBanner';
import DemoBadge from '../../components/demo/DemoBadge';

const CompetitorsV2 = () => {
  const { metrics: businessMetrics } = useBusinessMetrics();
  const { handleCompletionEvent, updateCompetitorsCount } = useOnboarding();
  const [savedCompetitors, setSavedCompetitors] = useState([]);
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [limit, setLimit] = useState(3);
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'saved'
  
  // Pricing extraction states
  const [extractingPricing, setExtractingPricing] = useState(null); // competitor id being extracted
  const [pricingModal, setPricingModal] = useState(null); // competitor to show in modal
  const [editedPlans, setEditedPlans] = useState([]);
  
  // Bulk pricing extraction modal (after adding competitors)
  const [bulkPricingModal, setBulkPricingModal] = useState(null); // { competitors: [], currentIndex: 0, results: {} }
  const [bulkExtracting, setBulkExtracting] = useState(false);

  // Pre-fill website URL from business metrics
  useEffect(() => {
    if (businessMetrics?.companyWebsite && !websiteUrl) {
      setWebsiteUrl(businessMetrics.companyWebsite);
    }
  }, [businessMetrics]);

  // Fetch saved competitors on mount
  useEffect(() => {
    fetchSavedCompetitors();
  }, []);

  const fetchSavedCompetitors = async () => {
    try {
      setLoading(true);
      const { data } = await competitorsV2Api.list();
      const competitors = data?.competitors || [];
      setSavedCompetitors(competitors);
      setLimit(data?.limit || 3);
      // Update onboarding context with competitors count
      updateCompetitorsCount(competitors.length);
    } catch (err) {
      console.error('Failed to fetch competitors:', err);
      setError('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }

    setError('');
    setDiscovering(true);
    setDiscoveredCompetitors([]);
    setSelectedCompetitors([]);

    try {
      const { data } = await competitorsV2Api.discover(websiteUrl);
      const discovered = data?.competitors || [];
      setDiscoveredCompetitors(discovered);
      
      // Auto-select only up to remaining slots based on plan limit
      // limit and savedCompetitors are current state values
      const slotsAvailable = limit - savedCompetitors.length;
      const autoSelectCount = Math.min(discovered.length, Math.max(0, slotsAvailable));
      setSelectedCompetitors(discovered.slice(0, autoSelectCount).map((_, i) => i));
    } catch (err) {
      console.error('Discovery failed:', err);
      setError(err.message || 'Failed to discover competitors');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSelection = (index) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(index)) {
        // Always allow deselection
        return prev.filter(i => i !== index);
      } else {
        // Only allow selection if under limit
        const slotsAvailable = limit - savedCompetitors.length;
        if (prev.length >= slotsAvailable) {
          // Can't select more - at limit
          return prev;
        }
        return [...prev, index];
      }
    });
  };

  const handleSave = async () => {
    if (selectedCompetitors.length === 0) {
      setError('Please select at least one competitor to save');
      return;
    }

    const toSave = selectedCompetitors.map(i => discoveredCompetitors[i]);
    
    setError('');
    setSaving(true);

    try {
      const { data } = await competitorsV2Api.save(toSave);
      const savedIds = data?.saved || [];
      
      setDiscoveredCompetitors([]);
      setSelectedCompetitors([]);
      setWebsiteUrl('');
      await fetchSavedCompetitors();
      
      // Dispatch onboarding completion event
      handleCompletionEvent('competitors_saved');

      // Open bulk pricing extraction modal for newly added competitors
      if (savedIds.length > 0) {
        setBulkPricingModal({
          competitors: savedIds,
          currentIndex: 0,
          results: {}
        });
        // Start extracting pricing for all
        startBulkPricingExtraction(savedIds);
      } else {
        setActiveTab('saved');
        setSuccessMessage(`${toSave.length} competitor(s) saved successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save competitors');
    } finally {
      setSaving(false);
    }
  };

  // Start bulk pricing extraction for all newly added competitors
  const startBulkPricingExtraction = async (competitors) => {
    setBulkExtracting(true);
    const results = {};
    
    for (const comp of competitors) {
      try {
        const { data } = await competitorsV2Api.extractPricing(comp.id);
        results[comp.id] = { success: true, pricing: data };
      } catch (err) {
        results[comp.id] = { success: false, error: err.message };
      }
      // Update results as we go
      setBulkPricingModal(prev => prev ? { ...prev, results: { ...prev.results, ...results } } : null);
    }
    
    setBulkExtracting(false);
    // Refresh saved competitors to get updated pricing
    await fetchSavedCompetitors();
  };

  // Close bulk modal and go to saved tab
  const closeBulkPricingModal = () => {
    setBulkPricingModal(null);
    setActiveTab('saved');
    setSuccessMessage('Competitors added! Review and edit pricing as needed.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;

    try {
      await competitorsV2Api.delete(id);
      await fetchSavedCompetitors();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete competitor');
    }
  };

  // Extract pricing from competitor's website
  const handleExtractPricing = async (competitor) => {
    setExtractingPricing(competitor.id);
    setError('');

    try {
      const { data } = await competitorsV2Api.extractPricing(competitor.id);
      // Refresh competitors to get updated pricing
      await fetchSavedCompetitors();
      // Show success and open modal for verification
      const updatedCompetitors = await competitorsV2Api.list();
      const updated = updatedCompetitors.data?.competitors?.find(c => c.id === competitor.id);
      if (updated && updated.pricing) {
        setPricingModal(updated);
        setEditedPlans(updated.pricing.plans || []);
      }
      setSuccessMessage('Pricing extracted! Please verify the data below.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Extract pricing failed:', err);
      setError(err.message || 'Failed to extract pricing');
    } finally {
      setExtractingPricing(null);
    }
  };

  // Open pricing modal for editing
  const handleEditPricing = (competitor) => {
    setPricingModal(competitor);
    setEditedPlans(competitor.pricing?.plans || []);
  };

  // Save edited pricing
  const handleSavePricing = async () => {
    if (!pricingModal) return;

    try {
      await competitorsV2Api.updatePricing(pricingModal.id, editedPlans);
      await fetchSavedCompetitors();
      setPricingModal(null);
      setSuccessMessage('Pricing updated and verified!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Save pricing failed:', err);
      setError(err.message || 'Failed to save pricing');
    }
  };

  // Verify pricing without changes
  const handleVerifyPricing = async (competitorId) => {
    try {
      await competitorsV2Api.verifyPricing(competitorId);
      await fetchSavedCompetitors();
      setPricingModal(null);
      setSuccessMessage('Pricing verified!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Verify pricing failed:', err);
      setError(err.message || 'Failed to verify pricing');
    }
  };

  // Add new plan to edited plans
  const addPlan = () => {
    setEditedPlans([...editedPlans, { name: '', price_monthly: 0, price_yearly: 0, currency: 'USD', features: [] }]);
  };

  // Remove plan from edited plans
  const removePlan = (index) => {
    setEditedPlans(editedPlans.filter((_, i) => i !== index));
  };

  // Update plan field
  const updatePlan = (index, field, value) => {
    const updated = [...editedPlans];
    updated[index] = { ...updated[index], [field]: value };
    setEditedPlans(updated);
  };

  // Add feature to plan
  const addFeature = (planIndex) => {
    const updated = [...editedPlans];
    updated[planIndex].features = [...(updated[planIndex].features || []), ''];
    setEditedPlans(updated);
  };

  // Update feature
  const updateFeature = (planIndex, featureIndex, value) => {
    const updated = [...editedPlans];
    updated[planIndex].features[featureIndex] = value;
    setEditedPlans(updated);
  };

  // Remove feature
  const removeFeature = (planIndex, featureIndex) => {
    const updated = [...editedPlans];
    updated[planIndex].features = updated[planIndex].features.filter((_, i) => i !== featureIndex);
    setEditedPlans(updated);
  };

  const remainingSlots = limit - savedCompetitors.length;

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                  Competitors
                </h1>
                <DemoBadge />
              </div>
              <p className="text-slate-400 text-lg">
                Discover and track your market competitors using AI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Guidance Banner */}
      <OnboardingGuidanceBanner pageId="competitors" />

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'discover'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Discover
          </span>
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'saved'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Saved
            {savedCompetitors.length > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                {savedCompetitors.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-emerald-300 font-medium">{successMessage}</p>
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Discovery Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Discover Competitors</h3>
                  <p className="text-slate-400">Enter your website URL and AI will find your competitors</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                    placeholder="https://www.yourcompany.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800/50 border-2 border-slate-700 text-white text-lg placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleDiscover}
                  disabled={discovering || !websiteUrl.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
                >
                  {discovering ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Discover
                    </span>
                  )}
                </button>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {remainingSlots} slots remaining on your plan
              </div>
            </div>
          </div>

          {/* Loading State */}
          {discovering && (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-16 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-lg text-white font-medium mb-2">Analyzing your market...</p>
              <p className="text-slate-400">AI is identifying potential competitors</p>
            </div>
          )}

          {/* Discovered Competitors */}
          {discoveredCompetitors.length > 0 && !discovering && (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Found {discoveredCompetitors.length} Competitors
                  </h3>
                  <span className="text-sm text-slate-400">
                    {selectedCompetitors.length} selected
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {discoveredCompetitors.map((comp, index) => {
                  const isSelected = selectedCompetitors.includes(index);
                  const slotsAvailable = limit - savedCompetitors.length;
                  const isDisabled = !isSelected && selectedCompetitors.length >= slotsAvailable;
                  
                  return (
                  <div
                    key={index}
                    onClick={() => !isDisabled && toggleSelection(index)}
                    className={`p-5 rounded-2xl border-2 transition-all hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10 cursor-pointer'
                        : isDisabled
                        ? 'bg-slate-800/20 border-slate-700/30 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedCompetitors.includes(index)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-600'
                      }`}>
                        {selectedCompetitors.includes(index) && (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-bold text-white">{comp.name}</h4>
                          <span className="text-xs px-3 py-1 rounded-full bg-slate-700 text-slate-300 font-medium">
                            {Math.round(comp.confidence * 100)}% match
                          </span>
                        </div>
                        <p className="text-sm text-emerald-400 mb-2">{comp.domain}</p>
                        <p className="text-sm text-slate-400">{comp.why}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={handleSave}
                  disabled={saving || selectedCompetitors.length === 0 || selectedCompetitors.length > remainingSlots}
                  className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save {selectedCompetitors.length} Competitor{selectedCompetitors.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {selectedCompetitors.length > remainingSlots && (
                  <p className="text-sm text-amber-400 mt-3 text-center">
                    You can only save {remainingSlots} more competitor(s). Upgrade your plan for more.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div>
          {loading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-16 text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading your competitors...</p>
            </div>
          ) : savedCompetitors.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Add Competitors for Market Context</h3>
              <p className="text-slate-400 mb-2 max-w-md mx-auto">
                Competitor data helps us benchmark your pricing against the market and identify opportunities.
              </p>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                We'll auto-discover competitors based on your website.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                Discover Competitors
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Your Competitors</h2>
                <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
                  {savedCompetitors.length} / {limit} used
                </span>
              </div>
              
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {savedCompetitors.map((comp) => (
                  <div
                    key={comp.id}
                    className="group relative bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative">
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(comp.id)}
                        className="absolute top-0 right-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Delete competitor"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-emerald-400">
                            {comp.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{comp.name}</h4>
                          <p className="text-xs text-emerald-400">{comp.domain}</p>
                        </div>
                      </div>

                      {/* Confidence */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                          <span>Confidence</span>
                          <span className="text-white font-medium">{Math.round((comp.confidence || 0) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                            style={{ width: `${(comp.confidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4">
                        {comp.why}
                      </p>

                      {/* Pricing Section */}
                      {comp.pricing && comp.pricing.plans?.length > 0 ? (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-white flex items-center gap-2">
                              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pricing Plans
                              {comp.pricing.verified && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Verified</span>
                              )}
                            </h5>
                            <button
                              onClick={() => handleEditPricing(comp)}
                              className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="space-y-2">
                            {comp.pricing.plans.map((plan, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{plan.name}</span>
                                <span className="text-emerald-400 font-medium">
                                  ${plan.price_monthly || plan.priceMonthly}/mo
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <button
                            onClick={() => handleExtractPricing(comp)}
                            disabled={extractingPricing === comp.id}
                            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {extractingPricing === comp.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Extracting...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Extract Pricing
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Pricing Extraction Modal - shown after adding competitors */}
      {bulkPricingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    {bulkExtracting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-emerald-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Extracting Pricing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Pricing Extraction Complete
                      </>
                    )}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {bulkExtracting 
                      ? 'Please wait while we extract pricing from competitor websites...'
                      : 'Review the extracted pricing below. You can edit or add manually if needed.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {bulkPricingModal.competitors.map((comp) => {
                const result = bulkPricingModal.results[comp.id];
                const isExtracting = !result && bulkExtracting;
                
                return (
                  <div key={comp.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-emerald-400">
                            {comp.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{comp.name}</h4>
                          <p className="text-xs text-slate-400">{comp.domain}</p>
                        </div>
                      </div>
                      
                      {isExtracting ? (
                        <span className="text-xs text-slate-400 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Extracting...
                        </span>
                      ) : result?.success ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {result.pricing?.plans?.length || 0} plans found
                        </span>
                      ) : result ? (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Could not extract - add manually
                        </span>
                      ) : null}
                    </div>
                    
                    {result?.success && result.pricing?.plans?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {result.pricing.plans.map((plan, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-slate-700/30 rounded-lg px-3 py-2">
                            <span className="text-slate-300">{plan.name}</span>
                            <span className="text-emerald-400 font-medium">
                              ${plan.price_monthly || plan.priceMonthly || 0}/mo
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!isExtracting && (
                      <button
                        onClick={() => {
                          // Find the updated competitor from savedCompetitors
                          const updated = savedCompetitors.find(c => c.id === comp.id);
                          if (updated) {
                            handleEditPricing(updated);
                          }
                        }}
                        className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        {result?.success ? 'Edit pricing' : 'Add pricing manually'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-700">
              <button
                onClick={closeBulkPricingModal}
                disabled={bulkExtracting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50"
              >
                {bulkExtracting ? 'Please wait...' : 'Done - View Saved Competitors'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Edit Modal */}
      {pricingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Edit Pricing - {pricingModal.name}
                </h3>
                <button
                  onClick={() => setPricingModal(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Verify and edit the extracted pricing data. Features will be used in analysis.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editedPlans.map((plan, planIdx) => (
                <div key={planIdx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(planIdx, 'name', e.target.value)}
                      placeholder="Plan name"
                      className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none text-lg font-medium"
                    />
                    <button
                      onClick={() => removePlan(planIdx)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Monthly Price ($)</label>
                      <input
                        type="number"
                        value={plan.price_monthly || plan.priceMonthly || 0}
                        onChange={(e) => updatePlan(planIdx, 'price_monthly', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Yearly Price ($)</label>
                      <input
                        type="number"
                        value={plan.price_yearly || plan.priceYearly || 0}
                        onChange={(e) => updatePlan(planIdx, 'price_yearly', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-slate-400">Features</label>
                      <button
                        onClick={() => addFeature(planIdx)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        + Add Feature
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(plan.features || []).map((feature, featureIdx) => (
                        <div key={featureIdx} className="flex gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => updateFeature(planIdx, featureIdx, e.target.value)}
                            placeholder="Feature description"
                            className="flex-1 bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                          />
                          <button
                            onClick={() => removeFeature(planIdx, featureIdx)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addPlan}
                className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Plan
              </button>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setPricingModal(null)}
                className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              {!pricingModal.pricing?.verified && (
                <button
                  onClick={() => handleVerifyPricing(pricingModal.id)}
                  className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
                >
                  Verify as Correct
                </button>
              )}
              <button
                onClick={handleSavePricing}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorsV2;
