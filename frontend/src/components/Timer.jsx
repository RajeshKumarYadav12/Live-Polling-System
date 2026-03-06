import React from "react";
import { useSelector } from "react-redux";
import { usePollTimer } from "../hooks/usePollTimer";

/**
 * Timer Component — pure display.
 * All countdown logic lives in usePollTimer hook.
 * Server is the authoritative source of truth via timerUpdate Socket events
 * which sync timeRemaining in Redux; local decrement keeps the UI smooth.
 */
function Timer({ duration, onTimeUp }) {
  // Hook manages decrement and onTimeUp callback
  usePollTimer({ onTimeUp });

  const timeRemaining = useSelector((state) => state.poll.timeRemaining);

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
