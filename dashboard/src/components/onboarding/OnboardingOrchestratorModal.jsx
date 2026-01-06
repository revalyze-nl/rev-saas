import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';

const OnboardingOrchestratorModal = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    currentStepIndex,
    steps,
    completedSteps,
    isOnboardingComplete,
    isModalOpen,
    dismissModal,
  } = useOnboarding();

  // Don't render if onboarding is complete or modal is closed
  if (isOnboardingComplete || !isModalOpen || !currentStep) {
    return null;
  }

  const handleCTA = () => {
    dismissModal();
    navigate(currentStep.ctaPath);
  };

  const handleDismiss = () => {
    dismissModal();
  };

  // Calculate progress
  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-fadeIn">
        {/* Progress Bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Step indicator */}
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <span className="text-2xl font-bold text-white">{currentStepIndex + 1}</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Step {currentStepIndex + 1} of {totalSteps}
                </p>
                <h2 className="text-xl font-bold text-white">
                  {currentStep.title}
                </h2>
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-slate-300 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Why it matters */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                  Why this matters
                </p>
                <p className="text-sm text-slate-400">
                  {currentStep.whyItMatters}
                </p>
              </div>
            </div>
          </div>

          {/* Steps Progress */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-violet-500/10' : ''
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-violet-500'
                        : 'bg-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-white font-medium'
                      : 'text-slate-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 bg-slate-800/30 border-t border-slate-800 flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all"
          >
            I'll do this later
          </button>
          <button
            onClick={handleCTA}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
          >
            {currentStep.ctaText}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Resume hint */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-slate-500">
            This guide will reappear when you return to help you complete setup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOrchestratorModal;
