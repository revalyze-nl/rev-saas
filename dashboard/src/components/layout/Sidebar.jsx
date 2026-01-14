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

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.name) return user.name;
    return user?.email || 'User';
  };

  // Get user initials
  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (name && name !== user?.email) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
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

  // Circular progress component
  const CircularProgress = ({ percentage, size = 44, strokeWidth = 3.5 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#creditGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease'
            }}
          />
          <defs>
            <linearGradient id="creditGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#8b5cf6'} />
              <stop offset="100%" stopColor={isEmpty ? '#dc2626' : isLow ? '#f97316' : '#d946ef'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className={`w-4 h-4 ${isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-violet-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    );
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

      {/* Bottom Card Section */}
      <div className="p-3">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/50 overflow-hidden">
          {/* Credits Section with Circular Progress */}
          <button
            onClick={() => navigate('/upgrade')}
            className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors"
          >
            {creditsLoading ? (
              <div className="flex items-center justify-center gap-2 py-2 w-full">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading...</span>
              </div>
            ) : (
              <>
                <CircularProgress percentage={percentage} size={44} strokeWidth={3.5} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{getPlanDisplay()} Plan</p>
                    {isEmpty && (
                      <span className="text-[9px] font-semibold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                        EMPTY
                      </span>
                    )}
                    {isLow && !isEmpty && (
                      <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                        LOW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    <span className={`font-semibold ${isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-violet-400'}`}>
                      {remainingCredits}
                    </span>
                    <span className="text-slate-500">/{monthlyCredits}</span>
                    <span className="text-slate-500 ml-1">Credits</span>
                  </p>
                </div>
              </>
            )}
          </button>

          {/* Upgrade Button - Inside Card for Free Users */}
          {(isFreePlan || isAdmin) && (
            <NavLink
              to="/upgrade"
              className="flex items-center justify-center gap-2 mx-3 mb-3 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Upgrade Plan</span>
            </NavLink>
          )}

          {/* User Profile Section */}
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-3 hover:bg-slate-800/30 transition-colors border-t border-slate-800/50 group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-md flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{getUserDisplayName()}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </NavLink>

          {/* Settings Link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 border-t border-slate-800/50 transition-colors ${
                isActive
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              }`
            }
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">Settings</span>
          </NavLink>
        </div>

        {/* Sign Out - Outside Card */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span>Sign Out</span>
        </button>

        {/* Copyright */}
        <p className="text-[10px] text-slate-600 text-center mt-2">
          © {new Date().getFullYear()} Revalyze B.V.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
