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

  // Plans data synced from landing page (PricingSection.jsx)
  const plans = [
    {
      key: 'starter',
      name: 'Starter',
      price: 69,
      currency: '€',
      interval: 'month',
      description: 'For early-stage SaaS',
      features: [
        'Up to 3 pricing plans',
        'Up to 3 competitors',
        'AI-powered pricing analysis',
        '5 AI Insight Credits / month',
        'PDF export of reports'
      ]
    },
    {
      key: 'growth',
      name: 'Growth',
      price: 159,
      currency: '€',
      interval: 'month',
      description: 'For growing SaaS companies',
      features: [
        'Up to 5 pricing plans',
        'Up to 5 competitors',
        'AI-powered pricing analysis',
        'Pricing simulations (what-if)',
        '20 AI Insight Credits / month',
        'PDF export of all reports'
      ],
      popular: true
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 399,
      currency: '€',
      interval: 'month',
      description: 'For larger organizations',
      features: [
        '7+ pricing plans',
        '10+ competitors',
        'Full AI analysis suite',
        'Unlimited simulations',
        '100 AI Insight Credits / month',
        'CSV & Excel export',
        '3 team seats included'
      ]
    }
  ];

  const getPlanCTA = (plan) => {
    if (currentPlanKey === plan.key) return { text: 'Current Plan', disabled: true };
    return { text: 'Upgrade', disabled: false };
  };

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-16">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 
          toast.type === 'warning' ? 'bg-amber-500/90 text-white' : 
          'bg-red-500/90 text-white'
        }`}>
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

      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Subscription Management
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          Upgrade your plan
        </h1>
        <p className="text-lg text-slate-400">
          Scale your pricing intelligence as your business grows.
        </p>
      </div>

      {/* Error Banner */}
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

      {/* Current Plan & Credits Status */}
      <div className="mb-10 p-5 bg-slate-900/30 border border-slate-800/30 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Current Plan */}
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
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        subscriptionStatus === 'trialing' 
                          ? 'bg-violet-500/20 text-violet-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
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

          {/* AI Credits */}
          <div className="flex items-center gap-4">
            <div className="flex-1 md:w-48">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">AI Credits</span>
                {creditsLoading ? (
                  <span className="text-xs text-slate-500">...</span>
                ) : (
                  <span className={`text-xs font-medium ${
                    remainingCredits === 0 ? 'text-red-400' : remainingCredits <= 2 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {remainingCredits} / {monthlyCredits}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    remainingCredits === 0 
                      ? 'bg-red-500' 
                      : remainingCredits <= 2 
                      ? 'bg-amber-500' 
                      : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                  }`}
                  style={{ width: `${Math.max(creditsPercentage, 2)}%` }}
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

      {/* Plans Grid - 3 Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {plans.map((plan) => {
          const cta = getPlanCTA(plan);
          const isCurrentPlan = currentPlanKey === plan.key;
          const isPopular = plan.popular;
          
          return (
            <div
              key={plan.key}
              className={`relative p-6 rounded-xl border transition-all ${
                isPopular 
                  ? 'bg-violet-500/5 border-violet-500/30' 
                  : isCurrentPlan
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-slate-900/20 border-slate-800/30 hover:border-slate-700/50'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-violet-500 text-white text-xs font-semibold rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              {/* Current Badge */}
              {isCurrentPlan && !isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
                    Current
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-5 pt-2">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">{plan.currency}{plan.price}</span>
                  <span className="text-slate-500 text-sm">/{plan.interval}</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <svg 
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        isPopular ? 'text-violet-400' : isCurrentPlan ? 'text-emerald-400' : 'text-slate-500'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => !cta.disabled && handleUpgradeClick(plan.key)}
                disabled={cta.disabled || checkoutLoading === plan.key}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:cursor-not-allowed ${
                  cta.disabled
                    ? 'bg-slate-800/50 text-slate-500'
                    : isPopular
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
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
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl">
        <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Frequently Asked Questions</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { q: 'What are AI Insight Credits?', a: '1 pricing analysis = 1 credit. 1 pricing simulation = 1 credit. Credits are shared between analyses and simulations each month.' },
            { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade anytime with prorated billing.' },
            { q: 'Is there a free trial?', a: 'Yes. 14-day free trial on all paid plans, no card required.' },
            { q: 'What payment methods do you accept?', a: 'All major credit cards and SEPA transfers via Stripe.' },
          ].map((faq, i) => (
            <div key={i} className="p-4 bg-slate-800/20 rounded-lg">
              <h4 className="text-sm text-slate-300 font-medium mb-1">{faq.q}</h4>
              <p className="text-sm text-slate-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-600 mt-6 text-center">
        No refunds for unused time or credits, unless required by law. Cancel anytime from your dashboard.
      </p>
    </div>
  );
};

export default Billing;
