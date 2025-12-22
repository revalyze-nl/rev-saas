/**
 * Converts a plan object or name to a stable plan key.
 * Used for plan_customer_counts mapping across onboarding, settings, and simulation.
 * 
 * @param {Object|string} plan - Plan object with id/name, or plan name string
 * @returns {string} - Stable plan key (lowercase, trimmed, spaces replaced with underscores)
 */
export const toPlanKey = (plan) => {
  if (!plan) return '';
  
  // If plan has an id, prefer it (most stable)
  if (typeof plan === 'object' && plan.id) {
    return plan.id;
  }
  
  // Otherwise normalize the name
  const name = typeof plan === 'string' ? plan : plan.name;
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
};

/**
 * Gets the display name for a plan key.
 * @param {string} planKey - The plan key
 * @param {Array} plans - Array of plan objects to match against
 * @returns {string} - Display name (original plan name or humanized key)
 */
export const getPlanNameFromKey = (planKey, plans = []) => {
  if (!planKey) return '';
  
  // Try to find the plan by id first
  const planById = plans.find(p => p.id === planKey);
  if (planById) return planById.name;
  
  // Try to find by normalized name
  const planByKey = plans.find(p => toPlanKey(p) === planKey);
  if (planByKey) return planByKey.name;
  
  // Fallback: humanize the key
  return planKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Computes total active customers from plan customer counts.
 * @param {Object} planCustomerCounts - Map of plan_key -> count
 * @returns {number} - Sum of all counts
 */
export const computeTotalFromPlanCounts = (planCustomerCounts) => {
  if (!planCustomerCounts || typeof planCustomerCounts !== 'object') {
    return 0;
  }
  
  return Object.values(planCustomerCounts).reduce((sum, count) => {
    const numCount = parseInt(count) || 0;
    return sum + numCount;
  }, 0);
};

/**
 * Checks if plan customer counts has any filled values.
 * @param {Object} planCustomerCounts - Map of plan_key -> count
 * @returns {boolean} - True if at least one count is filled
 */
export const hasPlanCounts = (planCustomerCounts) => {
  if (!planCustomerCounts || typeof planCustomerCounts !== 'object') {
    return false;
  }
  
  return Object.values(planCustomerCounts).some(count => {
    const numCount = parseInt(count);
    return !isNaN(numCount) && numCount > 0;
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN SELECTION HELPERS FOR SIMULATION PREFILL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Finds a plan by key (id or normalized name).
 * @param {Array} plans - Array of plan objects
 * @param {string} key - Plan key to search for (id, name, or normalized name)
 * @returns {Object|null} - Found plan or null
 */
export const findPlanByKey = (plans, key) => {
  if (!plans?.length || !key) return null;
  
  const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Try exact id match first
  const byId = plans.find(p => p.id === key);
  if (byId) return byId;
  
  // Try exact name match (case-insensitive)
  const byName = plans.find(p => p.name?.toLowerCase() === key.toLowerCase());
  if (byName) return byName;
  
  // Try normalized key match
  const byNormalized = plans.find(p => toPlanKey(p) === normalizedKey);
  if (byNormalized) return byNormalized;
  
  return null;
};

/**
 * Gets paid plans sorted by price (ascending).
 * @param {Array} plans - Array of plan objects
 * @returns {Array} - Sorted array of paid plans (price > 0)
 */
export const getSortedPaidPlans = (plans) => {
  if (!plans?.length) return [];
  
  return plans
    .filter(p => p.price > 0)
    .sort((a, b) => a.price - b.price);
};

/**
 * Gets the lowest priced paid plan (entry tier).
 * @param {Array} plans - Array of plan objects
 * @returns {Object|null} - Lowest priced plan or null
 */
export const getEntryPlan = (plans) => {
  const sorted = getSortedPaidPlans(plans);
  return sorted[0] || null;
};

/**
 * Gets the highest priced plan.
 * @param {Array} plans - Array of plan objects
 * @returns {Object|null} - Highest priced plan or null
 */
export const getHighestPricedPlan = (plans) => {
  const sorted = getSortedPaidPlans(plans);
  return sorted[sorted.length - 1] || null;
};

/**
 * Gets the two highest priced plans (for intermediate tier simulation).
 * @param {Array} plans - Array of plan objects
 * @returns {Array} - Array of 2 highest priced plans (or fewer if not available)
 */
export const getTwoHighestPricedPlans = (plans) => {
  const sorted = getSortedPaidPlans(plans);
  if (sorted.length < 2) return sorted;
  return sorted.slice(-2);
};

/**
 * Determines the tier position of a plan (entry, mid, highest).
 * @param {Object} plan - Plan object
 * @param {Array} plans - Array of all plan objects
 * @returns {'entry'|'mid'|'highest'|null} - Tier position
 */
export const getPlanTierPosition = (plan, plans) => {
  if (!plan || !plans?.length) return null;
  
  const sorted = getSortedPaidPlans(plans);
  if (sorted.length === 0) return null;
  
  const index = sorted.findIndex(p => p.id === plan.id);
  if (index === -1) return null;
  
  if (sorted.length === 1) return 'entry';
  if (index === 0) return 'entry';
  if (index === sorted.length - 1) return 'highest';
  return 'mid';
};

/**
 * Estimates customer count for a tier based on total customers.
 * Uses conservative distribution: entry 70%, mid 25%, highest 5%.
 * Always returns at least 1 to never assume 0.
 * 
 * @param {number} totalCustomers - Total active customers
 * @param {'entry'|'mid'|'highest'} tierPosition - Tier position
 * @returns {number} - Estimated customer count (min 1)
 */
export const estimateCustomersForTier = (totalCustomers, tierPosition) => {
  if (!totalCustomers || totalCustomers <= 0) return 0;
  
  const distribution = {
    entry: 0.70,    // 70% of customers on entry tier
    mid: 0.25,      // 25% of customers on mid tier(s)
    highest: 0.05,  // 5% of customers on highest tier
  };
  
  const ratio = distribution[tierPosition] || distribution.mid;
  const estimated = Math.round(totalCustomers * ratio);
  
  // Always return at least 1 to never assume 0 customers
  return Math.max(1, estimated);
};

/**
 * Gets customer count for a plan with safe fallback logic.
 * Priority:
 * A) If plan_customer_counts[plan_key] exists and > 0 -> use it
 * B) If plan_customer_counts[plan_key] exists and == 0 -> return { count: 0, source: 'explicit' }
 * C) If total_active_customers exists -> estimate based on tier position
 * D) No data available -> return null
 * 
 * @param {Object} plan - Plan object
 * @param {Array} plans - Array of all plan objects
 * @param {Object} metrics - Business metrics with plan_customer_counts and total_active_customers
 * @returns {Object} - { count: number|null, source: 'explicit'|'estimated'|'missing', message: string|null }
 */
export const getCustomerCountForPlan = (plan, plans, metrics) => {
  if (!plan) {
    return { count: null, source: 'missing', message: null };
  }
  
  const planKey = toPlanKey(plan);
  const planCounts = metrics?.plan_customer_counts;
  const totalCustomers = metrics?.total_active_customers;
  
  // Case A & B: Check plan_customer_counts
  if (planCounts && planKey in planCounts) {
    const count = planCounts[planKey];
    if (count > 0) {
      // Case A: Explicit count > 0
      return { count, source: 'explicit', message: null };
    } else if (count === 0) {
      // Case B: Explicit 0 is valid
      return { count: 0, source: 'explicit', message: null };
    }
  }
  
  // Case C: Estimate from total_active_customers
  if (totalCustomers && totalCustomers > 0) {
    const tierPosition = getPlanTierPosition(plan, plans);
    if (tierPosition) {
      const estimated = estimateCustomersForTier(totalCustomers, tierPosition);
      return {
        count: estimated,
        source: 'estimated',
        message: `Estimated from total customers (${totalCustomers}). Adjust if needed.`,
      };
    }
  }
  
  // Case D: No data available
  return {
    count: null,
    source: 'missing',
    message: 'Customer count is missing. Enter an estimate to run a meaningful simulation.',
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION CODE CONFIGURATION FOR SIMULATION PREFILL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Action code configurations for simulation prefill.
 * Each action defines how to preselect plan and configure UI.
 */
export const ACTION_CONFIGS = {
  // Test entry price increase
  TEST_ENTRY_PRICE_INCREASE: {
    planSelector: (plans) => getEntryPlan(plans),
    presetChips: ['+5%', '+10%', '+15%'],
    mode: 'price_change',
    guidanceText: 'Test increasing your entry tier price to capture more value.',
  },
  
  // Test entry price decrease
  TEST_ENTRY_PRICE_DECREASE: {
    planSelector: (plans) => getEntryPlan(plans),
    presetChips: ['-5%', '-10%', '-15%'],
    mode: 'price_change',
    guidanceText: 'Test lowering your entry tier price to reduce acquisition friction.',
  },
  
  // Legacy: TEST_STARTER_PRICE_INCREASE (alias for entry)
  TEST_STARTER_PRICE_INCREASE: {
    planSelector: (plans) => findPlanByKey(plans, 'starter') || getEntryPlan(plans),
    presetChips: ['+5%', '+10%', '+15%'],
    mode: 'price_change',
    guidanceText: 'Test increasing your starter tier price to capture more value.',
  },
  
  // Legacy: TEST_STARTER_PRICE_DECREASE (alias for entry)
  TEST_STARTER_PRICE_DECREASE: {
    planSelector: (plans) => findPlanByKey(plans, 'starter') || getEntryPlan(plans),
    presetChips: ['-5%', '-10%', '-15%'],
    mode: 'price_change',
    guidanceText: 'Test lowering your starter tier price to reduce acquisition friction.',
  },
  
  // Validate value positioning
  VALIDATE_VALUE_POSITIONING: {
    planSelector: (plans) => findPlanByKey(plans, 'business') || getHighestPricedPlan(plans),
    presetChips: null,
    mode: 'price_change',
    guidanceText: 'Analyze how your premium tier\'s price reflects perceived value. Try small adjustments to validate positioning.',
  },
  
  // Review plan naming clarity - informational, no plan preselection
  REVIEW_PLAN_NAMING_CLARITY: {
    planSelector: null, // Do not preselect
    presetChips: null,
    mode: 'informational',
    bannerText: 'This action is informational. Use simulation on any tier to validate outcomes and naming impact.',
    guidanceText: 'Plan naming affects customer perception. Run simulations to see how price changes affect conversion.',
  },
  
  // Simulate intermediate tier
  SIMULATE_INTERMEDIATE_TIER: {
    planSelector: null, // Special handling
    presetChips: null,
    mode: 'intermediate_tier',
    baseTierSelector: (plans) => getTwoHighestPricedPlans(plans),
    guidanceText: 'Create a new tier between your existing plans to capture customers who find the gap too large.',
    bannerText: 'Intermediate Tier Mode: Define a new tier between your existing price points.',
  },
  
  // Address retention before pricing
  ADDRESS_RETENTION_BEFORE_PRICING: {
    planSelector: null, // Do not preselect
    presetChips: null,
    mode: 'informational',
    bannerText: 'High churn detected. Before changing prices, consider addressing retention issues. Use simulation to model conservative changes.',
    guidanceText: 'Focus on retention first. If you must adjust pricing, prefer conservative changes.',
  },
  
  // Expand price range
  EXPAND_PRICE_RANGE: {
    planSelector: (plans) => getHighestPricedPlan(plans),
    presetChips: ['+10%', '+20%', '+30%'],
    mode: 'price_change',
    guidanceText: 'Expand your price range by increasing premium tier pricing to capture more value from high-value customers.',
  },
  
  // Add competitor data - informational
  ADD_COMPETITOR_DATA: {
    planSelector: null,
    presetChips: null,
    mode: 'informational',
    bannerText: 'Add competitor pricing data in Settings to unlock market-relative insights.',
    guidanceText: 'Without competitor data, simulations rely only on your internal metrics.',
  },
};

/**
 * Gets action configuration for a given action code.
 * @param {string} actionCode - Action code from URL param
 * @returns {Object|null} - Action configuration or null if not found
 */
export const getActionConfig = (actionCode) => {
  if (!actionCode) return null;
  return ACTION_CONFIGS[actionCode] || null;
};

