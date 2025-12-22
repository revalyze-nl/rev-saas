import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAiCredits } from '../../hooks/useAiCredits';

// AI Credits Indicator Component
const AICreditsIndicator = ({ credits, loading, onClick }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-400">Loading...</span>
      </div>
    );
  }

  if (!credits) return null;

  // Support both snake_case (from API) and camelCase
  const remainingCredits = credits.remaining_credits ?? credits.remainingCredits ?? 0;
  const usedCredits = credits.used_credits ?? credits.usedCredits ?? 0;
  const monthlyCredits = credits.monthly_credits ?? credits.monthlyCredits ?? 0;

  const isLow = remainingCredits <= 2;
  const isEmpty = remainingCredits === 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105 ${
        isEmpty
          ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
          : isLow
          ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }`}
      title={isEmpty ? 'Upgrade your plan to get more AI Insight Credits' : 'AI Insight Credits remaining this month'}
    >
      {/* Sparkle icon */}
      <svg className={`w-4 h-4 ${isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span className={`text-xs font-medium ${isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-300'}`}>
        {remainingCredits} / {monthlyCredits}
      </span>
      {isEmpty && (
        <span className="text-xs text-red-400 font-medium">Upgrade</span>
      )}
    </button>
  );
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { credits, loading } = useAiCredits();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('overview')) return 'Overview';
    if (path.includes('analyses')) return 'Analyses';
    if (path.includes('simulation')) return 'Pricing Simulation';
    if (path.includes('competitors')) return 'Competitors';
    if (path.includes('plans')) return 'My Pricing';
    if (path.includes('reports')) return 'Reports';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('billing')) return 'Billing & Subscription';
    return 'Dashboard';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="h-16 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-white">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* AI Credits Indicator */}
        {!isAdmin && (
          <AICreditsIndicator 
            credits={credits} 
            loading={loading}
            onClick={() => navigate('/app/billing')}
          />
        )}

        {/* Upgrade Button - hidden for admin users */}
        {!isAdmin && (
          <button 
            onClick={() => navigate('/app/billing')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all hover:scale-105 text-sm shadow-lg shadow-blue-500/20"
          >
            Upgrade
          </button>
        )}

        {/* User Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {getUserInitials()}
        </div>
      </div>
    </div>
  );
};

export default Topbar;


