import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedOption, setHasVoted, decrementTimer } from "../features/poll/pollSlice";
import { toast } from "react-toastify";
import socketService from "../services/socket";

function PollQuestion({ poll }) {
  const dispatch = useDispatch();
  const { selectedOption, hasVoted, studentName, timeRemaining } = useSelector(
    (state) => state.poll
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && !hasVoted) {
      const timer = setInterval(() => {
        dispatch(decrementTimer());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, hasVoted, dispatch]);

  const handleOptionSelect = (index) => {
    if (!hasVoted) {
      dispatch(setSelectedOption(index));
    }
  };

  const handleSubmitVote = async () => {
    if (selectedOption === null) {
      toast.error("Please select an option");
      return;
    }

    if (!studentName) {
      toast.error("Student name not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      
      // Submit vote via REST API
      const response = await fetch(`${API_URL}/api/polls/${poll.pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optionIndex: selectedOption,
          studentName: studentName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Mark as voted
        dispatch(setHasVoted(true));
        toast.success("Vote submitted successfully!");
      } else {
        toast.error(data.message || "Failed to submit vote");
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!poll) {
    return (
      <div className="empty-state">
        <p>
          No active poll at the moment. Please wait for the teacher to start a
          poll.
        </p>
      </div>
    );
  }

  // Show results after voting
  if (hasVoted && poll.results) {
    return (
      <div className="poll-question-container">
        <div className="poll-header">
          <h2 className="poll-title">Question 1</h2>
          <div className="poll-timer">
            ⏱ {Math.floor(timeRemaining / 60)}:
            {String(timeRemaining % 60).padStart(2, "0")}
          </div>
        </div>

        {/* Question */}
        <div className="poll-question-box">{poll.question}</div>

        {/* Results */}
        <div className="poll-results-list">
          {poll.results.map((result, index) => {
            const percentage =
              poll.totalResponses > 0
                ? (result.votes / poll.totalResponses) * 100
                : 0;
            return (
              <div key={index} className="result-bar-item">
                <div className="result-bar-wrapper">
                  <div
                    className="result-bar-fill"
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="result-number">{index + 1}</span>
                    <span className="result-text">{result.text}</span>
                  </div>
                  <span className="result-percentage">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="wait-message">
          <strong>Wait for the teacher to ask a new question..</strong>
        </p>
      </div>
    );
  }

  // Show voting interface
  return (
    <div className="poll-question-container">
      <div className="poll-header">
        <h2 className="poll-title">Question 1</h2>
        <div className="poll-timer">
          ⏱ {Math.floor(timeRemaining / 60)}:
          {String(timeRemaining % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Question */}
      <div className="poll-question-box">{poll.question}</div>

      {/* Options */}
      <div className="poll-options-list">
        {poll.options &&
          poll.options.map((option, index) => (
            <button
              key={index}
              className={`poll-option-button ${
                selectedOption === index ? "selected" : ""
              } ${hasVoted ? "disabled" : ""}`}
              onClick={() => handleOptionSelect(index)}
              disabled={hasVoted}
            >
              <span className="option-number">{index + 1}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
      </div>

      {/* Submit Button */}
      {!hasVoted ? (
        <button
          className="poll-submit-btn"
          onClick={handleSubmitVote}
          disabled={selectedOption === null || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      ) : (
        <p className="wait-message">
          <strong>Wait for the teacher to ask a new question..</strong>
        </p>
      )}
    </div>
  );
}

export default PollQuestion;
