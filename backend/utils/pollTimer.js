/**
 * Poll Timer Utility
 * Manages automatic poll closure after duration expires
 */

const activeTimers = new Map();

/**
 * Start a timer for a poll
 * @param {String} pollId - The poll ID
 * @param {Number} duration - Duration in seconds
 * @param {Function} callback - Callback function when timer expires
 */
export const startPollTimer = (pollId, duration, callback) => {
  // Clear existing timer if any
  if (activeTimers.has(pollId)) {
    clearTimeout(activeTimers.get(pollId));
  }

  // Set new timer
  const timer = setTimeout(() => {
    callback();
    activeTimers.delete(pollId);
  }, duration * 1000);

  activeTimers.set(pollId, timer);
  console.log(`⏱️  Timer started for poll ${pollId}: ${duration} seconds`);
};

/**
 * Stop a poll timer
 * @param {String} pollId - The poll ID
 */
export const stopPollTimer = (pollId) => {
  if (activeTimers.has(pollId)) {
    clearTimeout(activeTimers.get(pollId));
    activeTimers.delete(pollId);
    console.log(`⏹️  Timer stopped for poll ${pollId}`);
  }
};

/**
 * Check if a timer is active for a poll
 * @param {String} pollId - The poll ID
 * @returns {Boolean}
 */
export const isTimerActive = (pollId) => {
  return activeTimers.has(pollId);
};

/**
 * Clear all active timers
 */
export const clearAllTimers = () => {
  activeTimers.forEach((timer) => clearTimeout(timer));
  activeTimers.clear();
  console.log("🧹 All timers cleared");
};
