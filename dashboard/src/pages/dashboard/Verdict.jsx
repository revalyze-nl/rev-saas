import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Verdict = () => {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState({});

  // Check if user is on paid plan
  const isPaidUser = user?.plan && user.plan !== 'free';

  const verdict = {
    status: 'ready',
    recommendation: 'Increase prices by 15%',
    // Qualitative confidence instead of numeric
    confidence: 'high',
    confidenceReason: 'strong market alignment and customer data',
    // Single verbal outcome statement
    outcome: 'This change is expected to increase revenue with low churn risk.',
    lastUpdated: 'Today at 2:34 PM',
    // Detailed numbers - softened to ranges/directional signals
    details: {
      revenueImpact: '~$20–30K/month additional revenue',
      churnRisk: 'Low single-digit churn expected',
      marketPosition: 'Significantly below market average',
    },
    reasoning: [
      {
        title: 'Competitor Analysis',
        content: 'Your main competitors have increased prices by 12-20% in the last quarter. Your current pricing positions you below market average for similar feature sets.',
      },
      {
        title: 'Customer Signals',
        content: 'Based on product engagement and customer feedback, your user base shows strong product dependency. This segment historically tolerates price adjustments without significant churn.',
      },
      {
        title: 'Timing',
        content: 'Q1 is historically your strongest retention quarter. Acting now capitalizes on annual renewal cycles.',
      },
    ],
    risks: [
      { level: 'low', text: 'Enterprise customers may request pricing discussions' },
      { level: 'medium', text: 'Some SMB customers may adjust their tier' },
      { level: 'low', text: 'Competitors may respond with promotions' },
    ],
    timing: {
      recommendation: 'Act within the next 2 weeks',
      reasoning: 'Ahead of Q1 renewal cycle beginning Feb 1st',
    },
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

  return (
    <div className="max-w-2xl mx-auto pt-8">
      {/* The Verdict - Hero */}
      <div className="mb-10">
        {/* AI Framing - Subtle authority signal */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          AI pricing recommendation
        </p>

        {/* Main Verdict - The Star */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          {isPaidUser ? verdict.recommendation : (
            <BlurredText>Increase prices by 15%</BlurredText>
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
      <div className="mb-8 py-4 px-5 bg-slate-900/30 border-l-2 border-violet-500/50 rounded-r-lg">
        <p className="text-sm text-white font-medium">{verdict.timing.recommendation}</p>
        <p className="text-sm text-slate-500 mt-1">{verdict.timing.reasoning}</p>
      </div>

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

        {/* Risk Considerations */}
        <div>
          <button
            onClick={() => toggleSection('risks')}
            className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
          >
            <span className="text-sm text-slate-400">Risk considerations</span>
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

        {/* Detailed Numbers - Only Here, Not Above */}
        {isPaidUser && (
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
        Last updated {verdict.lastUpdated}
      </p>
    </div>
  );
};

export default Verdict;
