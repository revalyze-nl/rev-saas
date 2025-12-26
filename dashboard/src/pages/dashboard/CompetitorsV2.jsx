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
      setDiscoveredCompetitors(data?.competitors || []);
      // Auto-select all discovered
      setSelectedCompetitors((data?.competitors || []).map((_, i) => i));
    } catch (err) {
      console.error('Discovery failed:', err);
      setError(err.message || 'Failed to discover competitors');
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSelection = (index) => {
    setSelectedCompetitors(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Competitors</h1>
        <p className="text-slate-400 mt-1">Discover and track your market competitors using AI</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-sm text-emerald-400">{successMessage}</p>
        </div>
      )}

      {/* Discovery Section */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Discover Competitors</h2>
        
        <div className="flex gap-4">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Enter your website URL (e.g., yourcompany.com)"
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
          <button
            onClick={handleDiscover}
            disabled={discovering || !websiteUrl.trim()}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {discovering ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover
              </>
            )}
          </button>
        </div>

        {/* Discovered Competitors */}
        {discoveredCompetitors.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-slate-300">
                Found {discoveredCompetitors.length} potential competitors
              </h3>
              <span className="text-sm text-slate-500">
                {selectedCompetitors.length} selected • {remainingSlots} slots remaining
              </span>
            </div>

            <div className="grid gap-3">
              {discoveredCompetitors.map((comp, index) => (
                <div
                  key={index}
                  onClick={() => toggleSelection(index)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedCompetitors.includes(index)
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-slate-900/30 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectedCompetitors.includes(index)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedCompetitors.includes(index) && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{comp.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {Math.round(comp.confidence * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm text-emerald-400 mt-1">{comp.domain}</p>
                      <p className="text-sm text-slate-400 mt-2">{comp.why}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || selectedCompetitors.length === 0 || selectedCompetitors.length > remainingSlots}
              className="mt-4 w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : `Save ${selectedCompetitors.length} Competitor(s)`}
            </button>

            {selectedCompetitors.length > remainingSlots && (
              <p className="text-sm text-amber-400 mt-2 text-center">
                You can only save {remainingSlots} more competitor(s). Upgrade your plan for more.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Saved Competitors */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Your Competitors</h2>
          <span className="text-sm text-slate-400">
            {savedCompetitors.length} / {limit} used
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-emerald-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : savedCompetitors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">No competitors yet</h3>
            <p className="text-sm text-slate-500">Use the discovery tool above to find and save competitors.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedCompetitors.map((comp) => (
              <div
                key={comp.id}
                className="group relative p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-all"
              >
                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(comp.id)}
                  className="absolute top-3 right-3 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-400">
                      {comp.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{comp.name}</h4>
                    <p className="text-xs text-emerald-400">{comp.domain}</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Confidence</span>
                    <span>{Math.round((comp.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                      style={{ width: `${(comp.confidence || 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Reason */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {comp.why}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitorsV2;
