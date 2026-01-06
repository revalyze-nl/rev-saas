import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postJson } from '../../lib/apiClient';

const Verdict = () => {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is on paid plan
  const isPaidUser = user?.plan && user.plan !== 'free';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await postJson('/api/verdict', { websiteUrl: websiteUrl.trim() });
      setVerdict(response.data);
    } catch (err) {
      console.error('Verdict error:', err);
      setError('Failed to generate verdict. Please try again.');
    } finally {
      setLoading(false);
    }
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
    switch (level) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getRiskStyle = (level) => {
    switch (level) {
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
          AI pricing recommendation
        </p>

        {/* Main Verdict - The Star */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          {isPaidUser ? verdict.recommendation : (
            <BlurredText>{verdict.recommendation}</BlurredText>
          )}
        </h1>

        {/* Single Verbal Outcome - Replaces Metric Cards */}
        <p className="text-lg text-slate-300 mb-4">
          {verdict.outcome}
        </p>

        {/* Qualitative Confidence - Advisory, Not Statistical */}
        <p className="text-sm text-slate-500">
          Confidence: <span className={`font-medium capitalize ${getConfidenceStyle(verdict.confidence)}`}>{verdict.confidence}</span>
          <span className="text-slate-600"> — based on {verdict.confidenceReason}</span>
        </p>
      </div>

      {/* Timing Advisory */}
      {verdict.timing && (
        <div className="mb-8 py-4 px-5 bg-slate-900/30 border-l-2 border-violet-500/50 rounded-r-lg">
          <p className="text-sm text-white font-medium">{verdict.timing.recommendation}</p>
          <p className="text-sm text-slate-500 mt-1">{verdict.timing.reasoning}</p>
        </div>
      )}

      {/* Primary Action - Softer Language */}
      <div className="mb-10">
        <button
          className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isPaidUser}
        >
          {isPaidUser ? 'Proceed with this decision' : 'Upgrade to proceed'}
        </button>

        {!isPaidUser && (
          <p className="text-center text-xs text-slate-500 mt-3">
            Upgrade to act on recommendations
          </p>
        )}
      </div>

      {/* Collapsible Sections - Secondary, Calm */}
      <div className="space-y-3">
        {/* Why We Recommend This */}
        {verdict.reasoning && verdict.reasoning.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('reasoning')}
              className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
            >
              <span className="text-sm text-slate-400">Why we recommend this</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.reasoning ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.reasoning && (
              <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl space-y-4">
                {verdict.reasoning.map((item, index) => (
                  <div key={index}>
                    <h4 className="text-sm font-medium text-slate-300 mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Risk Considerations */}
        {verdict.risks && verdict.risks.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('risks')}
              className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
            >
              <span className="text-sm text-slate-400">What to expect</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.risks ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.risks && (
              <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl space-y-3">
                {verdict.risks.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border capitalize ${getRiskStyle(risk.level)}`}>
                      {risk.level}
                    </span>
                    <p className="text-sm text-slate-500">{risk.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detailed Numbers - Only Here, Not Above */}
        {isPaidUser && verdict.details && (
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
                  <span className="text-sm text-slate-500">Expected revenue</span>
                  <span className="text-sm text-slate-300">{verdict.details.revenueImpact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Churn outlook</span>
                  <span className="text-sm text-slate-300">{verdict.details.churnRisk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Your positioning</span>
                  <span className="text-sm text-slate-300">{verdict.details.marketPosition}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamp - Subtle */}
      <p className="text-xs text-slate-600 mt-8 text-center">
        Analysis completed {formatDate(verdict.createdAt)}
      </p>
    </div>
  );
};

export default Verdict;
