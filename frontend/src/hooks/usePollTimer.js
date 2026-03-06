/**
 * usePollTimer — Custom hook
 * Manages the server-authoritative poll countdown.
 *
 * - Decrements timeRemaining in Redux every second (smooth client-side tick)
 * - Server timerUpdate events sync via useSocket → updateTimer, overriding local count
 * - Calls onTimeUp once when the counter reaches 0
 *
 * Usage:
 *   usePollTimer({ onTimeUp: handleTimeUp });
 */

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { decrementTimer } from "../features/poll/pollSlice";

export function usePollTimer({ onTimeUp } = {}) {
  const dispatch = useDispatch();
  const timeRemaining = useSelector((state) => state.poll.timeRemaining);
  const currentPoll = useSelector((state) => state.poll.currentPoll);
  const hasNotifiedRef = useRef(false);

  // Keep onTimeUp stable via ref so we don't re-register on every render
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset the "already notified" flag when a new poll starts
  useEffect(() => {
    if (currentPoll?.status === "active") {
      hasNotifiedRef.current = false;
    }
  }, [currentPoll?.pollId]);

  // Local countdown — runs regardless so the display is smooth.
  // Server timerUpdate events override this value via updateTimer dispatch.
  useEffect(() => {
    if (!currentPoll || currentPoll.status !== "active") return;

    const interval = setInterval(() => {
      dispatch(decrementTimer());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPoll?.pollId, currentPoll?.status, dispatch]);

  // Fire onTimeUp exactly once when time reaches 0
  useEffect(() => {
    if (
      timeRemaining <= 0 &&
      currentPoll?.status === "active" &&
      !hasNotifiedRef.current
    ) {
      hasNotifiedRef.current = true;
      onTimeUpRef.current?.();
    }
  }, [timeRemaining]);

  return { timeRemaining };
}
