import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useAiCredits from '../../hooks/useAiCredits';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { credits, loading: creditsLoading } = useAiCredits();

  // Check if user is on free plan
  const isFreePlan = !user?.plan || user.plan === 'free';
  const isAdmin = user?.role === 'admin' || user?.plan === 'admin';

  // Credits calculations
  const remainingCredits = credits?.remaining_credits ?? credits?.remainingCredits ?? 0;
  const monthlyCredits = credits?.monthly_credits ?? credits?.monthlyCredits ?? 0;
  const percentage = monthlyCredits > 0 ? (remainingCredits / monthlyCredits) * 100 : 0;
  const isLow = remainingCredits > 0 && remainingCredits <= 2;
  const isEmpty = remainingCredits === 0 && !creditsLoading;

  // Main navigation items
  const navItems = [
    {
      name: 'Verdict',
      path: '/verdict',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      )
    },
    {
      name: 'Scenarios',
      path: '/scenarios',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      )
    },
    {
      name: 'History',
      path: '/history',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      )
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.full_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get plan display name
  const getPlanDisplay = () => {
    const plan = user?.plan || 'free';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  return (
    <div className="w-56 bg-slate-950 border-r border-slate-800/50 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800/30">
        <img
          src="/revalyze-logo.png"
          alt="Revalyze"
          className="h-8 w-auto"
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 pt-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg
                    className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800/30">
        {/* AI Credits Section */}
        <div className="p-3">
          <button
            onClick={() => navigate('/upgrade')}
            className={`w-full p-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
              isEmpty
                ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                : isLow
                ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                : 'bg-slate-900/50 border-slate-700/50 hover:border-violet-500/30'
            }`}
          >
            {creditsLoading ? (
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading...</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isEmpty ? 'bg-red-500/20' : isLow ? 'bg-amber-500/20' : 'bg-violet-500/20'
                    }`}>
                      <svg 
                        className={`w-3.5 h-3.5 ${
                          isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-violet-400'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-slate-400">AI Credits</span>
                  </div>
                  {isEmpty && (
                    <span className="text-[10px] font-semibold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                      EMPTY
                    </span>
                  )}
                  {isLow && !isEmpty && (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                      LOW
                    </span>
                  )}
                </div>

                {/* Credits Count */}
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className={`text-xl font-bold ${
                    isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'
                  }`}>
                    {remainingCredits}
                  </span>
                  <span className="text-xs text-slate-500">/ {monthlyCredits}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">this month</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isEmpty 
                        ? 'bg-red-500' 
                        : isLow 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                    }`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>

                {/* Upgrade hint for empty state */}
                {isEmpty && (
                  <div className="mt-2 pt-2 border-t border-red-500/20">
                    <span className="text-[10px] text-red-400 flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Click to upgrade
                    </span>
                  </div>
                )}
              </>
            )}
          </button>
        </div>

        {/* Upgrade Plan Button - Show for free users and admin */}
        {(isFreePlan || isAdmin) && (
          <div className="px-3 pb-3">
            <NavLink
              to="/upgrade"
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Upgrade Plan</span>
            </NavLink>
          </div>
        )}

        {/* Settings */}
        <div className="p-3 pt-0">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg
                  className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </div>

        {/* Account Info */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-900/50">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-slate-500">{getPlanDisplay()} Plan</p>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-3 pt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;