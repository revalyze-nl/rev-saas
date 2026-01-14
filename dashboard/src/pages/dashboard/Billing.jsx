// Nebula Aurora Pricing Card Component
const NebulaPricingCard = ({ plan }) => {
    const cta = getPlanCTA(plan);
    const isCurrentPlan = currentPlanKey === plan.key;
    const isPopular = plan.popular;

    let buttonClass = 'bg-white text-slate-900 hover:bg-white/95 shadow-lg hover:shadow-xl';
    if (cta.disabled) {
        buttonClass = 'bg-white/20 text-white/60 backdrop-blur-sm border border-white/20';
    }

    // Different gradient configs per plan
    const gradientConfigs = {
        starter: {
            glow1: { color: 'rgba(59,130,246,0.7)', pos: '-top-10 -right-10' },
            glow2: { color: 'rgba(99,102,241,0.6)', pos: 'top-5 right-1/3' },
            glow3: { color: 'rgba(139,92,246,0.5)', pos: 'bottom-10 -left-5' },
            accent: 'from-blue-500 via-indigo-500 to-violet-600'
        },
        growth: {
            glow1: { color: 'rgba(236,72,153,0.8)', pos: '-top-5 -right-5' },
            glow2: { color: 'rgba(251,113,133,0.6)', pos: 'top-0 left-1/4' },
            glow3: { color: 'rgba(244,63,94,0.5)', pos: 'bottom-5 right-1/3' },
            accent: 'from-pink-500 via-rose-500 to-red-500'
        },
        enterprise: {
            glow1: { color: 'rgba(168,85,247,0.7)', pos: '-top-10 left-1/4' },
            glow2: { color: 'rgba(192,132,252,0.6)', pos: 'top-10 -right-10' },
            glow3: { color: 'rgba(126,34,206,0.5)', pos: 'bottom-0 left-10' },
            accent: 'from-purple-500 via-violet-500 to-fuchsia-600'
        }
    };

    const config = gradientConfigs[plan.key] || gradientConfigs.starter;

    return (
        <div className="relative group">
            <div className={"absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500 " + config.accent}></div>
            
            <div className="relative flex flex-col h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/50">
                <div className="relative h-52">
                    <div className="absolute inset-0 bg-slate-900"></div>
                    
                    <div 
                        className={"absolute w-44 h-44 rounded-full blur-3xl opacity-70 " + config.glow1.pos}
                        style={{ background: 'radial-gradient(circle, ' + config.glow1.color + ' 0%, transparent 70%)' }}
                    ></div>
                    
                    <div 
                        className={"absolute w-36 h-36 rounded-full blur-3xl opacity-55 " + config.glow2.pos}
                        style={{ background: 'radial-gradient(circle, ' + config.glow2.color + ' 0%, transparent 65%)' }}
                    ></div>
                    
                    <div 
                        className={"absolute w-40 h-40 rounded-full blur-2xl opacity-45 " + config.glow3.pos}
                        style={{ background: 'radial-gradient(circle, ' + config.glow3.color + ' 0%, transparent 60%)' }}
                    ></div>

                    <div className="absolute top-8 right-12 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                    <div className="absolute top-16 right-8 w-0.5 h-0.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
                    <div className="absolute top-10 left-1/3 w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>

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
