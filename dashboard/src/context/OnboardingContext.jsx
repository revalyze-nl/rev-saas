import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePlans } from './PlansContext';
import { useAnalysis } from './AnalysisV2Context';

const OnboardingContext = createContext();

// Onboarding steps configuration
const ONBOARDING_STEPS = [
  {
    id: 'pricing_plans',
    title: 'Add Your Pricing Plans',
    description: 'Import your current pricing plans so Revalyze can analyze them against the market.',
    whyItMatters: 'Your pricing data is the foundation for all analyses and recommendations.',
    ctaText: 'Go to My Pricing',
    ctaPath: '/app/plans',
    completionCheck: (state) => state.hasPlans,
  },
  {
    id: 'competitors',
    title: 'Add Competitors',
    description: 'Discover and add competitors to benchmark your pricing against the market.',
    whyItMatters: 'Competitor data helps identify pricing gaps and opportunities.',
    ctaText: 'Go to Competitors',
    ctaPath: '/app/competitors',
    completionCheck: (state) => state.hasCompetitors,
  },
  {
    id: 'first_analysis',
    title: 'Run Your First Analysis',
    description: 'Generate your first AI-powered pricing analysis to get actionable insights.',
    whyItMatters: 'The analysis combines your data with market intelligence to find opportunities.',
    ctaText: 'Run Analysis',
    ctaPath: '/app/overview',
    completionCheck: (state) => state.hasAnalysis,
  },
];

// Local storage key for persisting onboarding state
const ONBOARDING_STORAGE_KEY = 'revalyze_onboarding_state';

export const OnboardingProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { plans } = usePlans();
  const { analyses } = useAnalysis();

  // Onboarding state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  // Competitors count (fetched separately since context may not be available)
  const [competitorsCount, setCompetitorsCount] = useState(0);

  // Derived completion state
  const completionState = {
    hasPlans: plans.length > 0,
    hasCompetitors: competitorsCount > 0,
    hasAnalysis: analyses.length > 0,
  };

  // Load persisted state
  useEffect(() => {
    if (isAuthenticated && user) {
      const stored = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCompletedSteps(new Set(parsed.completedSteps || []));
          setIsOnboardingComplete(parsed.isComplete || false);
          setIsModalDismissed(parsed.isModalDismissed || false);
        } catch (e) {
          console.error('Failed to parse onboarding state:', e);
        }
      }
    }
  }, [isAuthenticated, user]);

  // Persist state changes
  const persistState = useCallback((completed, isComplete, dismissed) => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, JSON.stringify({
        completedSteps: Array.from(completed),
        isComplete,
        isModalDismissed: dismissed,
      }));
    }
  }, [user]);

  // Update competitors count (called from CompetitorsProvider or feature pages)
  const updateCompetitorsCount = useCallback((count) => {
    setCompetitorsCount(count);
  }, []);

  // Check step completion and update state
  useEffect(() => {
    if (!isAuthenticated) return;

    const newCompletedSteps = new Set();
    let firstIncompleteIndex = -1;

    ONBOARDING_STEPS.forEach((step, index) => {
      if (step.completionCheck(completionState)) {
        newCompletedSteps.add(step.id);
      } else if (firstIncompleteIndex === -1) {
        firstIncompleteIndex = index;
      }
    });

    setCompletedSteps(newCompletedSteps);

    // Check if all steps are complete
    const allComplete = ONBOARDING_STEPS.every(step =>
      step.completionCheck(completionState)
    );

    if (allComplete && !isOnboardingComplete) {
      setIsOnboardingComplete(true);
      setIsModalOpen(false);
      persistState(newCompletedSteps, true, isModalDismissed);
    } else if (!allComplete) {
      setIsOnboardingComplete(false);
      // Set current step to first incomplete
      if (firstIncompleteIndex !== -1) {
        setCurrentStepIndex(firstIncompleteIndex);
      }
      persistState(newCompletedSteps, false, isModalDismissed);
    }
  }, [completionState.hasPlans, completionState.hasCompetitors, completionState.hasAnalysis, isAuthenticated, isOnboardingComplete, isModalDismissed, persistState]);

  // Auto-open modal on load if onboarding not complete
  // Reset dismissed state if user has no data at all (fresh start)
  useEffect(() => {
    if (isAuthenticated && !isOnboardingComplete) {
      // If user has no data at all, reset the dismissed state
      const hasNoData = !completionState.hasPlans && !completionState.hasCompetitors && !completionState.hasAnalysis;

      if (hasNoData && isModalDismissed) {
        // Reset dismissed state for fresh users
        setIsModalDismissed(false);
        persistState(completedSteps, false, false);
      }

      if (!isModalDismissed || hasNoData) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setIsModalOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, isOnboardingComplete, isModalDismissed, completionState.hasPlans, completionState.hasCompetitors, completionState.hasAnalysis, completedSteps, persistState]);

  // Handle completion events from feature pages
  const handleCompletionEvent = useCallback((eventType) => {
    const eventToStepMap = {
      'plan_created': 'pricing_plans',
      'plans_imported': 'pricing_plans',
      'competitor_added': 'competitors',
      'competitors_saved': 'competitors',
      'analysis_run': 'first_analysis',
    };

    const stepId = eventToStepMap[eventType];
    if (stepId) {
      setCompletedSteps(prev => {
        const updated = new Set(prev);
        updated.add(stepId);
        return updated;
      });

      // Reopen modal to show next step (after a small delay)
      if (!isOnboardingComplete) {
        setTimeout(() => {
          setIsModalDismissed(false);
          setIsModalOpen(true);
        }, 1000);
      }
    }
  }, [isOnboardingComplete]);

  // Dismiss modal (will reopen on next page load)
  const dismissModal = useCallback(() => {
    setIsModalOpen(false);
    setIsModalDismissed(true);
    persistState(completedSteps, isOnboardingComplete, true);
  }, [completedSteps, isOnboardingComplete, persistState]);

  // Open modal manually
  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setIsModalDismissed(false);
  }, []);

  // Navigate to step CTA
  const goToStep = useCallback((stepIndex) => {
    setCurrentStepIndex(stepIndex);
    setIsModalOpen(false);
  }, []);

  // Get current step
  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  // Check if in onboarding mode (not complete)
  const isOnboardingMode = !isOnboardingComplete;

  // Get guidance message for current step
  const getGuidanceMessage = useCallback((pageId) => {
    if (isOnboardingComplete) return null;

    const pageToStepMap = {
      'plans': 'pricing_plans',
      'competitors': 'competitors',
      'overview': 'first_analysis',
      'analyses': 'first_analysis',
    };

    const stepId = pageToStepMap[pageId];
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);

    if (!step || completedSteps.has(stepId)) return null;

    const messages = {
      'pricing_plans': 'Add at least one pricing plan to continue',
      'competitors': 'Add at least one competitor to continue',
      'first_analysis': 'Run your first pricing analysis to complete setup',
    };

    return messages[stepId] || null;
  }, [isOnboardingComplete, completedSteps]);

  const value = {
    // State
    currentStep,
    currentStepIndex,
    steps: ONBOARDING_STEPS,
    completedSteps,
    isOnboardingComplete,
    isOnboardingMode,
    isModalOpen,
    competitorsCount,

    // Actions
    dismissModal,
    openModal,
    goToStep,
    handleCompletionEvent,
    updateCompetitorsCount,
    getGuidanceMessage,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
