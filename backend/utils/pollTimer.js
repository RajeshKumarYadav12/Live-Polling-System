/**
 * Poll Timer Utility
 * Manages the authoritative server-side timers for active polls.
 * Each active poll gets:
 *   - A setTimeout that fires when the poll duration elapses
 *   - A setInterval that broadcasts timerUpdate every second so ALL
 *     clients (even late joiners) stay perfectly in sync with the server.
 */

// { pollId -> { timer: Timeout, interval: Interval, remaining: Number } }
const activePollTimers = new Map();

/**
 * Start the server-side timer for a poll.
 *
 * @param {String}   pollId    - Mongo _id as string
 * @param {Number}   seconds   - Seconds remaining (full duration on create,
 *                               actual remaining on server recovery)
 * @param {Object}   io        - Socket.io server instance (may be null)
 * @param {Function} onEnd     - Async callback invoked when time reaches 0
 */
export const startPollTimer = (pollId, seconds, io, onEnd) => {
  // Clear any pre-existing timer for this poll first
  stopPollTimer(pollId);

  let remaining = seconds;

  // Broadcast timerUpdate every second so late joiners get correct time
  const interval = setInterval(() => {
    remaining -= 1;

    if (io) {
      io.emit("timerUpdate", { pollId, timeRemaining: remaining });
    }

    // Update the stored remaining value so getActivePoll returns correct data
    const entry = activePollTimers.get(pollId);
    if (entry) entry.remaining = remaining;

    if (remaining <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  // Fire once after the full remaining duration
  const timer = setTimeout(async () => {
    clearInterval(interval);
    activePollTimers.delete(pollId);
    if (onEnd) {
      try {
        await onEnd();
      } catch (err) {
        console.error(`❌ Error in onEnd callback for poll ${pollId}:`, err);
      }
    }
  }, seconds * 1000);

  activePollTimers.set(pollId, { timer, interval, remaining });
  console.log(`⏱️  Timer started for poll ${pollId}: ${seconds}s`);
};

/**
 * Stop and clear the timer for a poll.
 * Safe to call even if no timer exists.
 *
 * @param {String} pollId
 */
export const stopPollTimer = (pollId) => {
  const entry = activePollTimers.get(pollId);
  if (entry) {
    clearTimeout(entry.timer);
    clearInterval(entry.interval);
    activePollTimers.delete(pollId);
    console.log(`⏹️  Timer stopped for poll ${pollId}`);
  }
};

/**
 * Check whether a timer is currently running for a poll.
 *
 * @param {String} pollId
 * @returns {Boolean}
 */
export const isTimerActive = (pollId) => activePollTimers.has(pollId);

/**
 * Clear all active timers
 */
export const clearAllTimers = () => {
  activeTimers.forEach((timer) => clearTimeout(timer));
  activeTimers.clear();
  console.log("🧹 All timers cleared");
};
