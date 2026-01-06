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
    confidence: 85,
    lastUpdated: 'Today at 2:34 PM',
    metrics: {
      revenueImpact: { value: '+$24K', subtext: '/month' },
      churnRisk: { value: '2.1%', subtext: 'expected' },
      confidence: { value: '85%', subtext: 'score' },
    },
    reasoning: [
      {
        title: 'Competitor Analysis',
        content: 'Your main competitors have all increased prices by 12-20% in the last quarter. Your current pricing puts you 23% below the market average for similar feature sets.',
      },
      {
        title: 'Customer Willingness',
        content: 'Based on your NPS scores and feature usage patterns, 78% of your customer base shows high product dependency. Historical data suggests this segment tolerates price increases up to 18% without significant churn.',
      },
      {
        title: 'Timing Signal',
        content: 'Q1 is historically your strongest retention quarter. Implementing the increase now capitalizes on annual renewal cycles and minimizes mid-contract friction.',
      },
    ],
    risks: [
      { level: 'low', text: 'Enterprise segment may request custom pricing negotiations' },
      { level: 'medium', text: '5-8% of SMB customers may downgrade to lower tier' },
      { level: 'low', text: 'Competitors may respond with promotional pricing' },
    ],
    timing: {
      recommendation: 'Implement within 2 weeks',
      reasoning: 'Before Q1 renewals cycle begins on Feb 1st',
    },
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const BlurredValue = ({ children, className = '' }) => (
    <span className={`blur-sm select-none ${className}`}>{children}</span>
  );

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Section 1: The Verdict (Hero) */}
      <div className="mb-12">
        <div className="mb-4">
          <span className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            New verdict ready
          </span>
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          {isPaidUser ? verdict.recommendation : (
            <BlurredValue>Increase prices by 15%</BlurredValue>
          )}
        </h1>

        <p className="text-slate-500 text-sm">
          Last updated {verdict.lastUpdated}
        </p>
      </div>

      {/* Section 2: The Numbers */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Revenue Impact</p>
          {isPaidUser ? (
            <p className="text-2xl font-bold text-emerald-400">
              {verdict.metrics.revenueImpact.value}
              <span className="text-sm font-normal text-slate-500">{verdict.metrics.revenueImpact.subtext}</span>
            </p>
          ) : (
            <p className="text-2xl font-bold">
              <BlurredValue className="text-emerald-400">+$24K</BlurredValue>
              <span className="text-sm font-normal text-slate-500">/month</span>
            </p>
          )}
        </div>

        <div className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Churn Risk</p>
          {isPaidUser ? (
            <p className="text-2xl font-bold text-amber-400">
              {verdict.metrics.churnRisk.value}
              <span className="text-sm font-normal text-slate-500 ml-1">{verdict.metrics.churnRisk.subtext}</span>
            </p>
          ) : (
            <p className="text-2xl font-bold">
              <BlurredValue className="text-amber-400">2.1%</BlurredValue>
              <span className="text-sm font-normal text-slate-500 ml-1">expected</span>
            </p>
          )}
        </div>

        <div className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Confidence</p>
          <p className="text-2xl font-bold text-white">
            {verdict.metrics.confidence.value}
            <span className="text-sm font-normal text-slate-500 ml-1">{verdict.metrics.confidence.subtext}</span>
          </p>
        </div>
      </div>

      {/* Section 3: Unlock CTA (Free users only) */}
      {!isPaidUser && (
        <div className="mb-10 p-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">See your full verdict</h3>
              <p className="text-sm text-slate-400">Unlock detailed recommendations and exact numbers</p>
            </div>
            <button className="px-5 py-2.5 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Section 4: Why This Verdict (Collapsible) */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('reasoning')}
          className="w-full flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl hover:bg-slate-900/50 transition-colors"
        >
          <span className="text-sm font-medium text-white">Why this verdict?</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.reasoning ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.reasoning && (
          <div className="mt-2 p-5 bg-slate-900/30 border border-slate-800/50 rounded-xl space-y-5">
            {verdict.reasoning.map((item, index) => (
              <div key={index}>
                <h4 className="text-sm font-semibold text-white mb-2">{item.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Risk Assessment (Collapsible) */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('risks')}
          className="w-full flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl hover:bg-slate-900/50 transition-colors"
        >
          <span className="text-sm font-medium text-white">Risk assessment</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.risks ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.risks && (
          <div className="mt-2 p-5 bg-slate-900/30 border border-slate-800/50 rounded-xl space-y-3">
            {verdict.risks.map((risk, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRiskColor(risk.level)}`}>
                  {risk.level}
                </span>
                <p className="text-sm text-slate-400">{risk.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 6: When to Act */}
      <div className="mb-10 p-5 bg-slate-900/30 border border-slate-800/50 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-white">{verdict.timing.recommendation}</span>
        </div>
        <p className="text-sm text-slate-400 ml-8">{verdict.timing.reasoning}</p>
      </div>

      {/* Section 7: Apply Verdict */}
      <button
        className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isPaidUser}
      >
        {isPaidUser ? 'Apply This Recommendation' : 'Upgrade to Apply'}
      </button>

      {!isPaidUser && (
        <p className="text-center text-xs text-slate-500 mt-3">
          Free users can view verdicts. Upgrade to apply recommendations.
        </p>
      )}
    </div>
  );
};

export default Verdict;
