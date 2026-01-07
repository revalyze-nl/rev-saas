import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postJson } from '../../lib/apiClient';

// Context options
const COMPANY_STAGES = [
  { value: 'unknown', label: 'Select stage...' },
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b_plus', label: 'Series B+' },
  { value: 'public', label: 'Public' },
];

const BUSINESS_MODELS = [
  { value: 'unknown', label: 'Select model...' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'agency', label: 'Agency' },
  { value: 'enterprise_license', label: 'Enterprise License' },
  { value: 'usage_based', label: 'Usage-based' },
];

const PRIMARY_KPIS = [
  { value: 'unknown', label: 'Select KPI...' },
  { value: 'mrr_growth', label: 'MRR Growth' },
  { value: 'churn_reduction', label: 'Churn Reduction' },
  { value: 'activation', label: 'Activation' },
  { value: 'arpu', label: 'ARPU' },
  { value: 'nrr', label: 'NRR' },
  { value: 'cvr', label: 'Conversion Rate' },
  { value: 'retention', label: 'Retention' },
];

const MARKETS = [
  { value: 'unknown', label: 'Select market...' },
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b2c', label: 'B2B2C' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];

const Verdict = () => {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState({
    companyStage: 'unknown',
    businessModel: 'saas',
    primaryKpi: 'mrr_growth',
    market: 'b2b',
  });

  // Check if user is on paid plan
  const isPaidUser = user?.plan && user.plan !== 'free';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await postJson('/api/verdict', {
        websiteUrl: websiteUrl.trim(),
        context: context,
      });
      setVerdict(response.data);
    } catch (err) {
      console.error('Verdict error:', err);
      setError('Failed to generate verdict. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContextChange = (field, value) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const BlurredText = ({ children }) => (
    <span className="blur-sm select-none">{children}</span>
  );

  const getConfidenceStyle = (level) => {
    const lowerLevel = level?.toLowerCase();
    switch (lowerLevel) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getRiskStyle = (level) => {
    const lowerLevel = level?.toLowerCase();
    switch (lowerLevel) {
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show input form when no verdict exists
  if (!verdict) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-12">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            AI pricing recommendation
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Get your pricing verdict
          </h1>
          <p className="text-lg text-slate-400">
            Paste your website URL and we will analyze your pricing strategy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
              disabled={loading}
            />
          </div>

          {/* Context Section (Collapsible) */}
          <div className="border border-slate-800/30 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
            >
              <span className="text-sm text-slate-400">
                Add context for better recommendations
              </span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${showContext ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showContext && (
              <div className="p-4 bg-slate-900/20 border-t border-slate-800/30 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Company Stage</label>
                  <select
                    value={context.companyStage}
                    onChange={(e) => handleContextChange('companyStage', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {COMPANY_STAGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Business Model</label>
                  <select
                    value={context.businessModel}
                    onChange={(e) => handleContextChange('businessModel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {BUSINESS_MODELS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Primary KPI</label>
                  <select
                    value={context.primaryKpi}
                    onChange={(e) => handleContextChange('primaryKpi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {PRIMARY_KPIS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Target Market</label>
                  <select
                    value={context.market}
                    onChange={(e) => handleContextChange('market', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {MARKETS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !websiteUrl.trim()}
            className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Analyzing your pricing...</span>
              </>
            ) : (
              'Generate verdict'
            )}
          </button>
        </form>

        <p className="text-xs text-slate-600 mt-8 text-center">
          We analyze your website content to provide personalized pricing recommendations.
        </p>
      </div>
    );
  }

  // Show verdict result
  return (
    <div className="max-w-2xl mx-auto pt-8">
      {/* New Analysis Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setVerdict(null);
            setWebsiteUrl('');
            setExpandedSections({});
          }}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Analyze another website
        </button>
      </div>

      {/* The Verdict - Hero */}
      <div className="mb-10">
        {/* AI Framing - Subtle authority signal */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          AI pricing verdict
        </p>

        {/* Main Headline - The Star */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          {isPaidUser ? verdict.headline : (
            <BlurredText>{verdict.headline}</BlurredText>
          )}
        </h1>

        {/* Summary */}
        <p className="text-lg text-slate-300 mb-4">
          {verdict.summary}
        </p>

        {/* Confidence */}
        <p className="text-sm text-slate-500">
          Confidence: <span className={`font-medium ${getConfidenceStyle(verdict.confidence)}`}>{verdict.confidence}</span>
        </p>
      </div>

      {/* Primary Action */}
      <div className="mb-10">
        <button
          className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isPaidUser}
        >
          {isPaidUser ? (verdict.cta || 'Proceed with this decision') : 'Upgrade to proceed'}
        </button>

        {!isPaidUser && (
          <p className="text-center text-xs text-slate-500 mt-3">
            Upgrade to act on recommendations
          </p>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Why This Decision */}
        {verdict.whyThisDecision && verdict.whyThisDecision.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('why')}
              className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
            >
              <span className="text-sm text-slate-400">Why this decision</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.why ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.why && (
              <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl space-y-3">
                {verdict.whyThisDecision.map((reason, index) => (
                  <p key={index} className="text-sm text-slate-400 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-600 mt-0.5">•</span>
                    {reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* What to Expect */}
        {verdict.whatToExpect && (
          <div>
            <button
              onClick={() => toggleSection('expectations')}
              className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
            >
              <span className="text-sm text-slate-400">What to expect</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.expectations ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.expectations && (
              <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(verdict.whatToExpect.riskLevel)}`}>
                    {verdict.whatToExpect.riskLevel} Risk
                  </span>
                </div>
                <p className="text-sm text-slate-400">{verdict.whatToExpect.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Supporting Details */}
        {isPaidUser && verdict.supportingDetails && (
          <div>
            <button
              onClick={() => toggleSection('details')}
              className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
            >
              <span className="text-sm text-slate-400">Supporting details</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.details ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.details && (
              <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Expected revenue impact</span>
                  <span className="text-sm text-slate-300">{verdict.supportingDetails.expectedRevenueImpact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Churn outlook</span>
                  <span className="text-sm text-slate-300">{verdict.supportingDetails.churnOutlook}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Market positioning</span>
                  <span className="text-sm text-slate-300">{verdict.supportingDetails.marketPositioning}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <p className="text-xs text-slate-600 mt-8 text-center">
        Analysis completed {formatDate(verdict.createdAt)}
      </p>
    </div>
  );
};

export default Verdict;
