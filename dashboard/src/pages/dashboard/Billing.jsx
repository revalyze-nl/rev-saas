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
  const [checkoutLoading, setCheckoutLoading] = useState(null); // plan key being processed
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

  // Initial fetch
  useEffect(() => {
    fetchBillingStatus();
    fetchCredits();
  }, [fetchBillingStatus, fetchCredits]);

  // Handle query params (success/canceled from Stripe)
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === '1') {
      setToast({ type: 'success', message: 'Subscription updated successfully!' });
      // Refresh billing status
      fetchBillingStatus();
      fetchCredits();
      // Clean URL
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

  // Redirect admin users away from billing page
  useEffect(() => {
    if (isAdmin) {
      navigate('/app/overview', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Handle upgrade click - create checkout session
  const handleUpgradeClick = async (planKey) => {
    setCheckoutLoading(planKey);
    setBillingError(null);
    
    try {
      const { data } = await billingApi.createCheckoutSession(planKey);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setBillingError(err.message || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  // Handle manage billing click - create portal session
  const handleManageBilling = async () => {
    setPortalLoading(true);
    setBillingError(null);
    
    try {
      const { data } = await billingApi.createPortalSession();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      setBillingError(err.message || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  // Don't render billing content for admin users
  if (isAdmin) {
    return null;
  }

  // Derive display values
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

  // Credits display values
  const remainingCredits = credits?.remaining_credits ?? credits?.remainingCredits ?? 0;
  const monthlyCredits = credits?.monthly_credits ?? credits?.monthlyCredits ?? 0;

  const plans = [
    {
      key: 'starter',
      name: 'Starter',
      price: 69,
      currency: '€',
      interval: 'month',
      description: 'For small SaaS teams',
      features: [
        'Up to 3 pricing plans',
        'Up to 3 competitors',
        'AI-powered pricing analysis',
        '5 AI Insight Credits / month',
        'PDF export of pricing reports',
        'Email support'
      ],
      creditNote: 'AI analyses only',
      simulationNote: 'Pricing simulations not included',
      popular: false
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
        'Pricing simulations (what-if analysis)',
        '20 AI Insight Credits / month',
        'PDF export of analyses & simulations',
        'Priority email support'
      ],
      creditNote: 'AI analyses + simulations',
      simulationNote: 'Includes pricing simulations (what-if analysis)',
      popular: true
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 399,
      currency: '€',
      interval: 'month',
      description: 'For larger SaaS companies',
      features: [
        '7+ pricing plans',
        '10+ competitors',
        'Full AI-powered pricing analysis',
        'Full pricing simulations access',
        '100 AI Insight Credits / month',
        'CSV & Excel export',
        '3 team seats (multi-user access)',
        'Dedicated onboarding & priority support'
      ],
      creditNote: 'AI analyses + simulations',
      simulationNote: 'Full simulations, advanced exports and team seats',
      popular: false
    }
  ];

  // Determine CTA for each plan
  const getPlanCTA = (plan) => {
    if (currentPlanKey === plan.key) {
      return { text: 'Current Plan', disabled: true };
    }
    return { text: 'Upgrade', disabled: false };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 text-white' 
            : toast.type === 'warning'
            ? 'bg-amber-500/90 text-white'
            : 'bg-red-500/90 text-white'
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

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Billing & Subscription
        </h1>
        <p className="text-slate-400">
          Manage your subscription and explore upgrade options.
        </p>
      </div>

      {/* Error Banner */}
      {billingError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-400">{billingError}</p>
          <button onClick={() => setBillingError(null)} className="text-red-400 hover:text-red-300 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Current Plan & Credits Section */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Current Plan */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-4">
              Current Plan
            </h2>
            
            {billingLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-blue-400">
                    {planDisplayName}
                  </span>
                  {/* Status Badge */}
                  {hasActiveSubscription && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscriptionStatus === 'trialing' 
                        ? 'bg-purple-500/10 text-purple-400' 
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {subscriptionStatus === 'trialing' ? 'Trial' : 'Active'}
                    </span>
                  )}
                  {isPastDue && (
                    <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm font-medium">
                      Payment Issue
                    </span>
                  )}
                </div>

                {/* Renewal/Cancel Info */}
                {hasActiveSubscription && currentPeriodEnd && (
                  <div className={`p-4 rounded-xl border mb-4 ${
                    cancelAtPeriodEnd 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-slate-800/30 border-slate-700'
                  }`}>
                    {cancelAtPeriodEnd ? (
                      <p className="text-amber-400 text-sm">
                        <span className="font-medium">Cancels on:</span>{' '}
                        {currentPeriodEnd.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    ) : (
                      <p className="text-slate-300 text-sm">
                        <span className="font-medium">Renews on:</span>{' '}
                        {currentPeriodEnd.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Past Due Warning */}
                {isPastDue && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                    <p className="text-red-400 text-sm">
                      <span className="font-medium">Payment failed.</span>{' '}
                      Please update your payment method to continue using premium features.
                    </p>
                  </div>
                )}

                {/* Manage Billing Button */}
                {hasStripeCustomer && (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-xl font-medium hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {portalLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Opening...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Manage Billing
                      </>
                    )}
                  </button>
                )}

                {/* No subscription CTA */}
                {!hasActiveSubscription && !isPastDue && currentPlanKey === 'free' && (
                  <p className="text-slate-400 text-sm mt-4">
                    You're on the free plan. Upgrade below to unlock more features.
                  </p>
                )}
              </>
            )}
          </div>

          {/* AI Credits Card */}
          <div className="lg:w-72 p-5 bg-slate-800/30 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-white font-semibold">AI Insight Credits</h3>
            </div>

            {creditsLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-3xl font-bold ${remainingCredits === 0 ? 'text-red-400' : 'text-white'}`}>
                    {remainingCredits}
                  </span>
                  <span className="text-slate-400">/ {monthlyCredits}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Credits remaining this month
                </p>

                {/* Credits progress bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all ${
                      remainingCredits === 0 ? 'bg-red-500' : 
                      remainingCredits <= 2 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${monthlyCredits > 0 ? (remainingCredits / monthlyCredits) * 100 : 0}%` }}
                  />
                </div>

                {/* Next reset date */}
                {currentPeriodEnd && (
                  <p className="text-xs text-slate-500">
                    Resets on {currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Available Plans Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Choose Your Plan
          </h2>
          <p className="text-slate-400">
            Scale your pricing intelligence as your business grows.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {plans.map((plan) => {
            const cta = getPlanCTA(plan);
            const isCurrentPlan = currentPlanKey === plan.key;
            
            return (
              <div
                key={plan.key}
                className={`relative bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border transition-all hover:border-slate-600 ${
                  plan.popular 
                    ? 'border-blue-500/50 shadow-xl shadow-blue-500/10' 
                    : isCurrentPlan
                    ? 'border-emerald-500/50'
                    : 'border-slate-800'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg">
                      Recommended
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
                      Current
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="text-slate-400 text-sm">
                      /{plan.interval}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <svg 
                        className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2.5} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-slate-300 text-sm">
                          {feature}
                        </span>
                        {feature.includes('AI Insight Credits') && plan.creditNote && (
                          <span className="text-xs text-slate-500 mt-0.5">
                            ({plan.creditNote})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                {/* Simulation Note */}
                {plan.simulationNote && (
                  <div className={`text-xs mb-4 px-3 py-2 rounded-lg ${
                    plan.key === 'starter' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {plan.simulationNote}
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => !cta.disabled && handleUpgradeClick(plan.key)}
                  disabled={cta.disabled || checkoutLoading === plan.key}
                  className={`w-full py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed ${
                    cta.disabled
                      ? 'bg-slate-800/50 text-slate-500'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:scale-105 shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {checkoutLoading === plan.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : cta.text}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-5">
          Frequently Asked Questions
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-1.5">
              What are AI Insight Credits?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              1 pricing analysis = 1 credit. 1 pricing simulation = 1 credit. Credits are shared between analyses and simulations each month.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-1.5">
              Can I change plans later?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Yes. Upgrade or downgrade anytime with prorated billing.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-1.5">
              Is there a free trial?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Yes. 14-day free trial on all paid plans, no card required.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-1.5">
              What payment methods do you accept?
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              All major credit cards and SEPA transfers via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
