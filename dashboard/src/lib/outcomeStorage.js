/**
 * Outcome Storage Utility
 * 
 * Handles localStorage persistence for decision outcome tracking.
 * Uses a single key pattern: "revalyze_outcome_{decisionId}"
 */

// Key patterns
const OUTCOME_KEY_PREFIX = 'revalyze_outcome_';
const CHOSEN_SCENARIO_KEY_PREFIX = 'revalyze_chosen_scenario_';

// Legacy key patterns to migrate from (if any exist)
const LEGACY_KEY_PREFIXES = [
  'revalyze_outcomes_', // potential typo variant
  'outcome_',           // shorter variant
];

/**
 * Get the storage key for a decision
 * @param {string} decisionId 
 * @returns {string}
 */
const getKey = (decisionId) => `${OUTCOME_KEY_PREFIX}${decisionId}`;

/**
 * Normalize a percentage string to a number
 * Handles: "+18%", "-0.5%", "18%", "18", "+18", "-0.5", etc.
 * Handles both dash types: "–" (en-dash) and "-" (hyphen)
 * @param {string|number|null|undefined} input 
 * @returns {number|null}
 */
export const normalizePercent = (input) => {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }
  
  if (typeof input !== 'string') {
    return null;
  }
  
  // Remove %, spaces, and normalize dashes
  const cleaned = input
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(/–/g, '-')  // en-dash to hyphen
    .replace(/—/g, '-'); // em-dash to hyphen
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Parse a range string like "+15–25%" or "15-25" to [min, max]
 * @param {string|null|undefined} str 
 * @returns {[number, number]|null}
 */
export const parseRange = (str) => {
  if (!str || typeof str !== 'string') {
    return null;
  }
  
  // Normalize: remove %, +, and convert all dashes to hyphen
  const cleaned = str
    .replace(/%/g, '')
    .replace(/\+/g, '')
    .replace(/–/g, '-')  // en-dash
    .replace(/—/g, '-')  // em-dash
    .replace(/\s/g, '');
  
  // Try to find a range pattern like "15-25" or "-5-10" (negative start)
  // Handle edge cases: "-5-10" should be [-5, 10]
  const rangeMatch = cleaned.match(/(-?\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return [Math.min(min, max), Math.max(min, max)];
    }
  }
  
  // If no range found, try single number
  const singleNum = parseFloat(cleaned);
  if (!isNaN(singleNum)) {
    return [singleNum, singleNum];
  }
  
  return null;
};

/**
 * Validate and normalize a date string
 * @param {string|null|undefined} dateStr 
 * @returns {string|null} "YYYY-MM-DD" or null
 */
const normalizeDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  // Check if it's a valid date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return null;
  }
  
  // Verify it's a valid date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return dateStr;
};

/**
 * Normalize raw outcome data to ensure correct types
 * @param {object|null|undefined} raw 
 * @returns {object} Normalized outcome object
 */
export const normalizeOutcome = (raw) => {
  const defaults = {
    decisionTaken: null,
    dateImplemented: null,
    actualRevenueImpact: '',
    actualChurnImpact: '',
    notes: '',
  };
  
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  
  return {
    // decisionTaken: only true, false, or null
    decisionTaken: 
      raw.decisionTaken === true ? true :
      raw.decisionTaken === false ? false :
      null,
    
    // dateImplemented: valid YYYY-MM-DD or null
    dateImplemented: normalizeDate(raw.dateImplemented),
    
    // actualRevenueImpact: keep original string for display
    actualRevenueImpact: 
      typeof raw.actualRevenueImpact === 'string' ? raw.actualRevenueImpact : '',
    
    // actualChurnImpact: keep original string for display
    actualChurnImpact: 
      typeof raw.actualChurnImpact === 'string' ? raw.actualChurnImpact : '',
    
    // notes: string or empty
    notes: 
      typeof raw.notes === 'string' ? raw.notes : '',
  };
};

/**
 * Migrate legacy keys to the new key pattern
 * @param {string} decisionId 
 * @returns {object|null} Migrated data or null
 */
const migrateLegacyKeys = (decisionId) => {
  for (const prefix of LEGACY_KEY_PREFIXES) {
    const legacyKey = `${prefix}${decisionId}`;
    try {
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        const parsed = JSON.parse(legacyData);
        // Save to new key
        const newKey = getKey(decisionId);
        localStorage.setItem(newKey, JSON.stringify(normalizeOutcome(parsed)));
        // Delete old key
        localStorage.removeItem(legacyKey);
        console.log(`[outcomeStorage] Migrated legacy key: ${legacyKey} -> ${newKey}`);
        return parsed;
      }
    } catch (e) {
      // Clean up malformed legacy data
      localStorage.removeItem(`${prefix}${decisionId}`);
    }
  }
  return null;
};

/**
 * Get outcome data for a decision
 * Returns normalized object with defaults if missing or malformed
 * @param {string} decisionId 
 * @returns {object}
 */
export const getOutcome = (decisionId) => {
  if (!decisionId) {
    return normalizeOutcome(null);
  }
  
  const key = getKey(decisionId);
  
  try {
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return normalizeOutcome(parsed);
    }
    
    // Try to migrate from legacy keys
    const migrated = migrateLegacyKeys(decisionId);
    if (migrated) {
      return normalizeOutcome(migrated);
    }
    
    return normalizeOutcome(null);
  } catch (e) {
    console.warn('[outcomeStorage] Failed to parse outcome, returning defaults:', e);
    // Clean up malformed data
    localStorage.removeItem(key);
    return normalizeOutcome(null);
  }
};

/**
 * Save outcome data for a decision
 * Merges with existing data and saves
 * @param {string} decisionId 
 * @param {object} partial - Partial outcome data to merge
 * @returns {object} The saved outcome
 */
export const saveOutcome = (decisionId, partial) => {
  if (!decisionId) {
    console.warn('[outcomeStorage] Cannot save without decisionId');
    return normalizeOutcome(null);
  }
  
  const key = getKey(decisionId);
  const existing = getOutcome(decisionId);
  
  // Merge partial updates
  const merged = {
    ...existing,
    ...partial,
  };
  
  // Normalize before saving
  const normalized = normalizeOutcome(merged);
  
  try {
    localStorage.setItem(key, JSON.stringify(normalized));
  } catch (e) {
    console.error('[outcomeStorage] Failed to save outcome:', e);
  }
  
  return normalized;
};

/**
 * Delete outcome data for a decision
 * @param {string} decisionId 
 */
export const deleteOutcome = (decisionId) => {
  if (!decisionId) return;
  
  const key = getKey(decisionId);
  localStorage.removeItem(key);
};

/**
 * Calculate days since implementation
 * @param {string|null} dateStr - YYYY-MM-DD format
 * @returns {number|null}
 */
export const getDaysSinceImplemented = (dateStr) => {
  if (!dateStr) return null;
  
  const implDate = new Date(dateStr);
  if (isNaN(implDate.getTime())) return null;
  
  const today = new Date();
  // Reset time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  implDate.setHours(0, 0, 0, 0);
  
  const diffTime = today - implDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Compare actual value to predicted range
 * @param {string|null} actualStr - User's actual value string
 * @param {string|null} predictedStr - Predicted range string
 * @returns {'on_track'|'below'|'above'|null}
 */
export const getComparisonStatus = (actualStr, predictedStr) => {
  const actual = normalizePercent(actualStr);
  const range = parseRange(predictedStr);
  
  if (actual === null || range === null) {
    return null;
  }
  
  const [min, max] = range;
  
  if (actual >= min && actual <= max) {
    return 'on_track';
  } else if (actual < min) {
    return 'below';
  } else {
    return 'above';
  }
};

/**
 * Clear outcome data for a decision (alias for deleteOutcome)
 * @param {string} decisionId 
 */
export const clearOutcome = (decisionId) => {
  deleteOutcome(decisionId);
};

/**
 * Get the localStorage key for a decision outcome
 * @param {string} decisionId 
 * @returns {string}
 */
export const outcomeKey = (decisionId) => `${OUTCOME_KEY_PREFIX}${decisionId}`;

/**
 * Calculate execution readiness score based on outcome data
 * Returns a percentage (0-100) indicating how complete the outcome tracking is
 * 
 * Score logic:
 * - 0% if decisionTaken is null AND no planned date
 * - 30% if decisionTaken is false but has notes/date (means considered)
 * - 60% if decisionTaken is true OR planned date exists
 * - 80% if decisionTaken is true AND at least one impact field filled
 * - 100% if decisionTaken is true AND both revenue+churn impacts filled AND notes filled
 * 
 * @param {object} outcome - Outcome object from getOutcome
 * @returns {number} 0-100
 */
export const calculateReadinessScore = (outcome) => {
  if (!outcome) {
    return 0;
  }

  const {
    decisionTaken,
    dateImplemented,
    actualRevenueImpact,
    actualChurnImpact,
    notes,
  } = outcome;

  const hasDate = !!dateImplemented;
  const hasRevenue = !!actualRevenueImpact?.trim();
  const hasChurn = !!actualChurnImpact?.trim();
  const hasNotes = !!notes?.trim();

  // 100% - All fields filled with decision taken
  if (decisionTaken === true && hasRevenue && hasChurn && hasNotes) {
    return 100;
  }

  // 80% - Decision taken with at least one impact field
  if (decisionTaken === true && (hasRevenue || hasChurn)) {
    return 80;
  }

  // 60% - Decision taken OR has planned date
  if (decisionTaken === true || hasDate) {
    return 60;
  }

  // 30% - Decision not taken but has notes/date (considered)
  if (decisionTaken === false && (hasNotes || hasDate)) {
    return 30;
  }

  // 0% - Nothing recorded
  return 0;
};

/**
 * Get outcome status label for display
 * @param {object} outcome - Outcome object from getOutcome
 * @returns {{label: string, style: string, date: string|null}}
 */
export const getOutcomeStatusLabel = (outcome) => {
  if (!outcome) {
    return { label: 'No outcome recorded', style: 'text-slate-500', date: null };
  }

  const { decisionTaken, dateImplemented } = outcome;

  if (decisionTaken === true) {
    return {
      label: 'Implemented',
      style: 'text-emerald-400',
      date: dateImplemented,
    };
  }

  if (decisionTaken === false) {
    return {
      label: 'Not taken',
      style: 'text-red-400',
      date: null,
    };
  }

  // decisionTaken is null
  return {
    label: 'Undecided',
    style: 'text-amber-400',
    date: null,
  };
};

/**
 * Check if outcome has complete tracking data
 * @param {object} outcome - Outcome object from getOutcome
 * @returns {boolean}
 */
export const isOutcomeComplete = (outcome) => {
  if (!outcome) return false;
  
  const { actualRevenueImpact, actualChurnImpact, notes } = outcome;
  return !!(actualRevenueImpact?.trim() && actualChurnImpact?.trim() && notes?.trim());
};

/**
 * Get all stored outcome keys (for listing all decisions with outcomes)
 * @returns {string[]} Array of decision IDs that have outcomes stored
 */
export const getAllOutcomeDecisionIds = () => {
  const ids = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(OUTCOME_KEY_PREFIX)) {
        const decisionId = key.replace(OUTCOME_KEY_PREFIX, '');
        ids.push(decisionId);
      }
    }
  } catch (e) {
    console.warn('[outcomeStorage] Failed to list outcomes:', e);
  }
  return ids;
};

// ==================== CHOSEN SCENARIO STORAGE ====================

/**
 * Get the storage key for a chosen scenario
 * @param {string} verdictId 
 * @returns {string}
 */
const getChosenScenarioKey = (verdictId) => `${CHOSEN_SCENARIO_KEY_PREFIX}${verdictId}`;

/**
 * Normalize chosen scenario data
 * @param {object|null} raw 
 * @returns {object|null}
 */
const normalizeChosenScenario = (raw) => {
  if (!raw || typeof raw !== 'object' || !raw.scenarioId) {
    return null;
  }
  
  return {
    scenarioId: raw.scenarioId || null,
    scenarioName: raw.scenarioName || '',
    appliedAt: raw.appliedAt || null,
    expectedImpact: {
      revenue: raw.expectedImpact?.revenue || 'N/A',
      churn: raw.expectedImpact?.churn || 'N/A',
      risk: raw.expectedImpact?.risk || 'Medium',
      timeToImpact: raw.expectedImpact?.timeToImpact || 'N/A',
      effort: raw.expectedImpact?.effort || 'Medium',
    },
  };
};

/**
 * Get chosen scenario for a verdict
 * @param {string} verdictId 
 * @returns {object|null} Chosen scenario data or null
 */
export const getChosenScenario = (verdictId) => {
  if (!verdictId) return null;
  
  const key = getChosenScenarioKey(verdictId);
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return normalizeChosenScenario(parsed);
  } catch (e) {
    console.warn('[outcomeStorage] Failed to parse chosen scenario:', e);
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Save chosen scenario for a verdict
 * @param {string} verdictId 
 * @param {object} scenario - Scenario data to save
 * @returns {object|null} The saved chosen scenario
 */
export const saveChosenScenario = (verdictId, scenario) => {
  if (!verdictId || !scenario) {
    console.warn('[outcomeStorage] Cannot save chosen scenario without verdictId and scenario');
    return null;
  }
  
  const key = getChosenScenarioKey(verdictId);
  
  const data = {
    scenarioId: scenario.id || scenario.scenarioId,
    scenarioName: scenario.name || scenario.scenarioName || scenario.title,
    appliedAt: new Date().toISOString(),
    expectedImpact: {
      revenue: scenario.revenueImpact || scenario.expectedImpact?.revenue || 'N/A',
      churn: scenario.churnImpact || scenario.expectedImpact?.churn || 'N/A',
      risk: scenario.riskLevel || scenario.expectedImpact?.risk || 'Medium',
      timeToImpact: scenario.timeToImpact || scenario.expectedImpact?.timeToImpact || 'N/A',
      effort: scenario.executionEffort || scenario.expectedImpact?.effort || 'Medium',
    },
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return normalizeChosenScenario(data);
  } catch (e) {
    console.error('[outcomeStorage] Failed to save chosen scenario:', e);
    return null;
  }
};

/**
 * Delete chosen scenario for a verdict
 * @param {string} verdictId 
 */
export const deleteChosenScenario = (verdictId) => {
  if (!verdictId) return;
  const key = getChosenScenarioKey(verdictId);
  localStorage.removeItem(key);
};

/**
 * Check if a scenario is the chosen one for a verdict
 * @param {string} verdictId 
 * @param {string} scenarioId 
 * @returns {boolean}
 */
export const isScenarioChosen = (verdictId, scenarioId) => {
  const chosen = getChosenScenario(verdictId);
  return chosen?.scenarioId === scenarioId;
};

/**
 * Get the storage key for a chosen scenario (for external use)
 * @param {string} verdictId 
 * @returns {string}
 */
export const chosenScenarioKey = (verdictId) => getChosenScenarioKey(verdictId);

export default {
  getOutcome,
  saveOutcome,
  deleteOutcome,
  clearOutcome,
  outcomeKey,
  normalizeOutcome,
  normalizePercent,
  parseRange,
  getDaysSinceImplemented,
  getComparisonStatus,
  calculateReadinessScore,
  getOutcomeStatusLabel,
  isOutcomeComplete,
  getAllOutcomeDecisionIds,
  // Chosen scenario
  getChosenScenario,
  saveChosenScenario,
  deleteChosenScenario,
  isScenarioChosen,
  chosenScenarioKey,
};

