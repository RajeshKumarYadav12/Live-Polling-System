import React from "react";

function PollHistory({ polls, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="poll-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="poll-history-header">
          <h2 className="poll-history-title">
            View <strong>Poll History</strong>
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="poll-history-content">
          {polls.length === 0 ? (
            <div className="empty-state">
              <p>No poll history available</p>
            </div>
          ) : (
            polls.map((poll, pollIndex) => (
              <div key={poll._id} className="history-poll-item">
                <h3 className="history-poll-question-title">
                  Question {pollIndex + 1}
                </h3>

                {/* Question Box */}
                <div className="poll-question-box">{poll.question}</div>

                {/* Results */}
                <div className="poll-results-list">
                  {poll.options.map((option, index) => {
                    const totalVotes = poll.options.reduce(
                      (sum, opt) => sum + opt.votes,
                      0
                    );
                    const percentage =
                      totalVotes > 0
                        ? Math.round((option.votes / totalVotes) * 100)
                        : 0;

                    return (
                      <div key={index} className="result-bar-item">
                        <div className="result-bar-wrapper">
                          <div
                            className="result-bar-fill"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="result-number">{index + 1}</span>
                            <span className="result-text">{option.text}</span>
                          </div>
                          <span className="result-percentage">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PollHistory;
