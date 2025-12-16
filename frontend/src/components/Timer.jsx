import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { decrementTimer } from "../features/poll/pollSlice";

/**
 * Timer Component
 * Displays countdown timer for active poll
 */
function Timer({ duration, onTimeUp }) {
  const dispatch = useDispatch();
  const timeRemaining = useSelector((state) => state.poll.timeRemaining);

  useEffect(() => {
    // Start countdown
    const interval = setInterval(() => {
      dispatch(decrementTimer());
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    // Check if time is up
    if (timeRemaining <= 0 && onTimeUp) {
      onTimeUp();
    }
  }, [timeRemaining, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return "#f44336";
    if (timeRemaining <= 30) return "#ff9800";
    return "var(--primary-vibrant)";
  };

  return (
    <div className="timer-container">
      <div className="timer-display" style={{ color: getTimerColor() }}>
        {formatTime(timeRemaining)}
      </div>
      <div className="timer-label">Time Remaining</div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e0e0e0",
          borderRadius: "4px",
          marginTop: "1rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(timeRemaining / duration) * 100}%`,
            height: "100%",
            background: getTimerColor(),
            transition: "width 1s linear",
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );
}

export default Timer;
