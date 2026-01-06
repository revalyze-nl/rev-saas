import { useOnboarding } from '../../context/OnboardingContext';

const OnboardingGuidanceBanner = ({ pageId }) => {
  const { isOnboardingMode, getGuidanceMessage, openModal } = useOnboarding();

  // Only show in onboarding mode
  if (!isOnboardingMode) return null;

  const message = getGuidanceMessage(pageId);

  // Don't show if no message for this page
  if (!message) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
              Setup Guide
            </p>
            <p className="text-sm text-slate-300">
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View steps
        </button>
      </div>
    </div>
  );
};

export default OnboardingGuidanceBanner;
