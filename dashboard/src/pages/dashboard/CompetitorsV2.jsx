import { useState, useEffect } from 'react';
import { competitorsV2Api } from '../../lib/apiClient';

const CompetitorsV2 = () => {
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

  // Fetch saved competitors on mount
  useEffect(() => {
    fetchSavedCompetitors();
  }, []);

  const fetchSavedCompetitors = async () => {
    try {
      setLoading(true);
      const { data } = await competitorsV2Api.list();
      setSavedCompetitors(data?.competitors || []);
      setLimit(data?.limit || 3);
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
      await competitorsV2Api.save(toSave);
      setSuccessMessage(`${toSave.length} competitor(s) saved successfully!`);
      setDiscoveredCompetitors([]);
      setSelectedCompetitors([]);
      setWebsiteUrl('');
      await fetchSavedCompetitors();
      setActiveTab('saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save competitors');
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                Competitors
              </h1>
              <p className="text-slate-400 text-lg">
                Discover and track your market competitors using AI
              </p>
            </div>
          </div>
        </div>
      </div>

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
              <h3 className="text-2xl font-bold text-white mb-3">No competitors yet</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Use the discovery tool to find and save competitors for your pricing analysis.
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
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                        {comp.why}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompetitorsV2;
