import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { billingApi, aiCreditsApi } from '../../lib/apiClient';

const Billing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();

  // Billing state
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Credits state
  const [credits, setCredits] = useState(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  // Toast state
  const [toast, setToast] = useState(null);

  // Fetch billing status
  const fetchBillingStatus = useCallback(async () => {
    try {
      setBillingLoading(true);
      const { data } = await billingApi.getStatus();
      setBillingStatus(data);
      setBillingError(null);
    } catch (err) {
      console.error('Failed to fetch billing status:', err);
      setBillingError(err.message);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  // Fetch credits
  const fetchCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      const { data } = await aiCreditsApi.get();
      setCredits(data);
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingStatus();
    fetchCredits();
  }, [fetchBillingStatus, fetchCredits]);

  // Handle query params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === '1') {
      setToast({ type: 'success', message: 'Subscription updated successfully!' });
      fetchBillingStatus();
      fetchCredits();
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setToast(null), 5000);
    } else if (canceled === '1') {
      setToast({ type: 'warning', message: 'Checkout was canceled.' });
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setToast(null), 5000);
    }
  }, [searchParams, setSearchParams, fetchBillingStatus, fetchCredits]);

  const handleUpgradeClick = async (planKey) => {
    setCheckoutLoading(planKey);
    setBillingError(null);
    try {
      const { data } = await billingApi.createCheckoutSession(planKey);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setBillingError(err.message || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setBillingError(null);
    try {
      const { data } = await billingApi.createPortalSession();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
      setBillingError(err.message || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const currentPlanKey = billingStatus?.plan_key || 'free';
  const subscriptionStatus = billingStatus?.status || '';
  const cancelAtPeriodEnd = billingStatus?.cancel_at_period_end || false;
  const currentPeriodEnd = billingStatus?.current_period_end ? new Date(billingStatus.current_period_end) : null;
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isPastDue = subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid';
  const hasStripeCustomer = !!billingStatus?.stripe_customer_id;

  const planDisplayName = {
    free: 'Free Preview',
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
    admin: 'Admin'
  }[currentPlanKey] || 'Free Preview';

  const remainingCredits = credits?.remaining_credits ?? credits?.remainingCredits ?? 0;
  const monthlyCredits = credits?.monthly_credits ?? credits?.monthlyCredits ?? 0;
  const creditsPercentage = monthlyCredits > 0 ? (remainingCredits / monthlyCredits) * 100 : 0;

  // Plans data
  const plans = [
    {
      key: 'starter',
      name: 'Starter',
      price: 69,
      currency: '€',
      interval: 'month',
      description: 'For teams exploring better decisions',
      features: [
        'Make decisions visible',
        'Explore alternatives',
        'See what might happen'
      ],
      limits: [
        '3 decisions / month',
        '3 scenarios / month',
        'Notes-only outcomes'
      ],
      ctaText: 'Start small'
    },
    {
      key: 'growth',
      name: 'Growth',
      price: 159,
      currency: '€',
      interval: 'month',
      description: 'For teams that want to learn from outcomes',
      features: [
        'Compare scenarios',
        'Choose paths intentionally',
        'Track measurable outcomes',
        'Build a decision history'
      ],
      limits: [
        '10 decisions / month',
        '10 scenarios / month',
        'Outcome KPIs',
        'Decision timeline'
      ],
      popular: true,
      ctaText: 'Upgrade to Growth'
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 399,
      currency: '€',
      interval: 'month',
      description: "For organizations that don't want to repeat mistakes",
      features: [
        'Learn from past decisions',
        'Recognize patterns over time',
        'Share insights with leadership',
        'Export decisions and results'
      ],
      limits: [
        '50 decisions / month',
        '50 scenarios / month',
        'Learning across decisions',
        'Exports & reports',
        'Team-level visibility (coming soon)'
      ],
      ctaText: 'Start with Enterprise'
    }
  ];

  const getPlanCTA = (plan) => {
    if (currentPlanKey === plan.key) return { text: 'Current Plan', disabled: true };
    return { text: plan.ctaText || 'Upgrade', disabled: false };
  };

  // Nebula Aurora Pricing Card Component - Different colors per plan
  const NebulaPricingCard = ({ plan }) => {
    const cta = getPlanCTA(plan);
    const isCurrentPlan = currentPlanKey === plan.key;
    const isPopular = plan.popular;

    let buttonClass = 'bg-white text-slate-900 hover:bg-white/95 shadow-lg hover:shadow-xl';
    if (cta.disabled) {
      buttonClass = 'bg-white/20 text-white/60 backdrop-blur-sm border border-white/20';
    }

    // Define color themes for each plan
    const colorThemes = {
      starter: {
        glow: 'from-cyan-500 via-blue-500 to-indigo-600',
        orb1: 'radial-gradient(circle, rgba(34,211,238,0.8) 0%, rgba(6,182,212,0.6) 40%, transparent 70%)',
        orb2: 'radial-gradient(circle, rgba(59,130,246,0.7) 0%, rgba(37,99,235,0.5) 50%, transparent 70%)',
        orb3: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(79,70,229,0.4) 50%, transparent 70%)',
        orb4: 'radial-gradient(circle, rgba(14,165,233,0.5) 0%, rgba(2,132,199,0.3) 50%, transparent 70%)',
        orb5: 'radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 60%)',
      },
      growth: {
        glow: 'from-rose-500 via-fuchsia-500 to-violet-600',
        orb1: 'radial-gradient(circle, rgba(251,113,133,0.8) 0%, rgba(244,63,94,0.6) 40%, transparent 70%)',
        orb2: 'radial-gradient(circle, rgba(236,72,153,0.7) 0%, rgba(219,39,119,0.5) 50%, transparent 70%)',
        orb3: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(109,40,217,0.4) 50%, transparent 70%)',
        orb4: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(37,99,235,0.3) 50%, transparent 70%)',
        orb5: 'radial-gradient(circle, rgba(251,146,60,0.6) 0%, transparent 60%)',
      },
      enterprise: {
        glow: 'from-amber-500 via-orange-500 to-emerald-600',
        orb1: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(245,158,11,0.6) 40%, transparent 70%)',
        orb2: 'radial-gradient(circle, rgba(251,146,60,0.7) 0%, rgba(234,88,12,0.5) 50%, transparent 70%)',
        orb3: 'radial-gradient(circle, rgba(52,211,153,0.6) 0%, rgba(16,185,129,0.4) 50%, transparent 70%)',
        orb4: 'radial-gradient(circle, rgba(253,224,71,0.5) 0%, rgba(250,204,21,0.3) 50%, transparent 70%)',
        orb5: 'radial-gradient(circle, rgba(249,115,22,0.6) 0%, transparent 60%)',
      },
    };

    const theme = colorThemes[plan.key] || colorThemes.growth;

    return (
      <div className="relative group">
        <div className={`absolute -inset-0.5 bg-gradient-to-r ${theme.glow} rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500`}></div>

        <div className="relative flex flex-col h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/50">
          <div className="relative h-52">
            <div className="absolute inset-0 bg-slate-900"></div>

            <div
              className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-70"
              style={{ background: theme.orb1 }}
            ></div>

            <div
              className="absolute top-0 right-1/4 w-40 h-40 rounded-full blur-3xl opacity-60"
              style={{ background: theme.orb2 }}
            ></div>

            <div
              className="absolute bottom-10 -left-10 w-44 h-44 rounded-full blur-3xl opacity-50"
              style={{ background: theme.orb3 }}
            ></div>

            <div
              className="absolute bottom-5 left-10 w-32 h-32 rounded-full blur-2xl opacity-40"
              style={{ background: theme.orb4 }}
            ></div>

            <div
              className="absolute top-5 right-5 w-24 h-24 rounded-full blur-2xl opacity-50"
              style={{ background: theme.orb5 }}
            ></div>

            <div className="absolute top-8 right-10 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-14 right-20 w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-20 right-8 w-0.5 h-0.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-6 right-1/3 w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute top-12 left-1/4 w-0.5 h-0.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }}></div>

            {isPopular && (
              <div className="absolute top-4 right-4 z-20">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/30">
                  Popular
                </span>
              </div>
            )}

            {isCurrentPlan && (
              <div className="absolute top-4 right-4 z-20">
                <span className="px-2.5 py-1 bg-white/25 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/40">
                  Current
                </span>
              </div>
            )}

            <div className="absolute top-6 left-6 z-10">
              <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">{plan.currency}{plan.price}</span>
              </div>
              <p className="text-white/70 text-sm mt-1">per month / billed annually</p>
            </div>

            <div className="absolute bottom-4 left-6 right-6 z-20">
              <button
                onClick={() => !cta.disabled && handleUpgradeClick(plan.key)}
                disabled={cta.disabled || checkoutLoading === plan.key}
                className={"w-full py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:cursor-not-allowed " + buttonClass}
              >
                {checkoutLoading === plan.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                ) : cta.text}
              </button>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.5) 40%, rgb(15, 23, 42) 100%)'
              }}
            ></div>
          </div>

          <div className="flex-1 px-6 py-5 bg-slate-900">
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-800 my-4"></div>

            <ul className="space-y-2">
              {plan.limits.map((limit, index) => (
                <li key={index} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Helper functions for dynamic classes
  const getToastClass = () => {
    if (toast?.type === 'success') return 'bg-emerald-500/90 text-white';
    if (toast?.type === 'warning') return 'bg-amber-500/90 text-white';
    return 'bg-red-500/90 text-white';
  };

  const getCreditsBarClass = () => {
    if (remainingCredits === 0) return 'bg-red-500';
    if (remainingCredits <= 2) return 'bg-amber-500';
    return 'bg-gradient-to-r from-violet-500 to-fuchsia-500';
  };

  const getCreditsTextClass = () => {
    if (remainingCredits === 0) return 'text-red-400';
    if (remainingCredits <= 2) return 'text-amber-400';
    return 'text-slate-300';
  };

  const getSubscriptionBadgeClass = () => {
    if (subscriptionStatus === 'trialing') return 'bg-violet-500/20 text-violet-400';
    return 'bg-emerald-500/20 text-emerald-400';
  };

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-16">
      {toast && (
        <div className={"fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 " + getToastClass()}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="text-center mb-10">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Subscription Management
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          Upgrade your plan
        </h1>
        <p className="text-lg text-slate-400">
          Scale your decision intelligence as your team grows.
        </p>
      </div>

      {billingError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-400">{billingError}</p>
          <button onClick={() => setBillingError(null)} className="text-red-400 hover:text-red-300 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mb-10 p-5 bg-slate-900/30 border border-slate-800/30 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 012.91 2.91 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-2.91 2.91 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-2.91-2.91 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 012.91-2.91z" />
              </svg>
            </div>
            <div>
              {billingLoading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">{planDisplayName}</span>
                    {hasActiveSubscription && (
                      <span className={"px-2 py-0.5 rounded text-xs font-medium " + getSubscriptionBadgeClass()}>
                        {subscriptionStatus === 'trialing' ? 'Trial' : 'Active'}
                      </span>
                    )}
                    {isPastDue && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                        Payment Issue
                      </span>
                    )}
                  </div>
                  {currentPeriodEnd && hasActiveSubscription && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 md:w-48">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">AI Credits</span>
                {creditsLoading ? (
                  <span className="text-xs text-slate-500">...</span>
                ) : (
                  <span className={"text-xs font-medium " + getCreditsTextClass()}>
                    {remainingCredits} / {monthlyCredits}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={"h-full rounded-full transition-all " + getCreditsBarClass()}
                  style={{ width: Math.max(creditsPercentage, 2) + '%' }}
                />
              </div>
            </div>

            {hasStripeCustomer && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Opening...' : 'Manage'}
              </button>
            )}
          </div>
        </div>

        {isPastDue && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              <span className="font-medium">Payment failed.</span> Please update your payment method.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => (
          <NebulaPricingCard key={plan.key} plan={plan} />
        ))}
      </div>

      <div className="p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl">
        <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Frequently Asked Questions</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/20 rounded-lg">
            <h4 className="text-sm text-slate-300 font-medium mb-1">What counts as a decision?</h4>
            <p className="text-sm text-slate-500">Each verdict you create counts as one decision. Scenarios within a decision are tracked separately.</p>
          </div>
          <div className="p-4 bg-slate-800/20 rounded-lg">
            <h4 className="text-sm text-slate-300 font-medium mb-1">Can I change plans later?</h4>
            <p className="text-sm text-slate-500">Yes. Upgrade or downgrade anytime with prorated billing.</p>
          </div>
          <div className="p-4 bg-slate-800/20 rounded-lg">
            <h4 className="text-sm text-slate-300 font-medium mb-1">Is there a free trial?</h4>
            <p className="text-sm text-slate-500">Yes. 14-day free trial on all paid plans, no card required.</p>
          </div>
          <div className="p-4 bg-slate-800/20 rounded-lg">
            <h4 className="text-sm text-slate-300 font-medium mb-1">What payment methods do you accept?</h4>
            <p className="text-sm text-slate-500">All major credit cards and SEPA transfers via Stripe.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-6 text-center">
        No refunds for unused time or credits, unless required by law. Cancel anytime from your dashboard.
      </p>
    </div>
  );
};

export default Billing;