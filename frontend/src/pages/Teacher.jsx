import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  pollEnded,
  setPollHistory,
  updateTimer,
} from "../features/poll/pollSlice";
import { toast } from "react-toastify";
import socketService from "../services/socket";
import TeacherDashboard from "../components/TeacherDashboard";
import Timer from "../components/Timer";
import ResultChart from "../components/ResultChart";
import ChatPopup from "../components/ChatPopup";
import ChatButton from "../components/ChatButton";
import PollHistory from "../components/PollHistory";

function Teacher() {
  const dispatch = useDispatch();
  const { currentPoll } = useSelector((state) => state.poll);
  const [pollHistory, setPollHistoryState] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    // Connect to Socket.io
    socketService.connect();

    // Teacher joins
    socketService.teacherJoin();

    // Check for active poll on load
    socketService.getActivePoll();

    // Listen for poll created
    socketService.onPollCreated((data) => {
      console.log("Poll created:", data);
      dispatch(
        setCurrentPoll({
          pollId: data.pollId,
          question: data.question,
          options: data.options,
          duration: data.duration,
          timeRemaining: data.duration,
          results: data.options.map((opt) => ({ text: opt, votes: 0 })),
          totalResponses: 0,
          status: "active",
        })
      );
      toast.success("Poll created and broadcasted to all students!");
    });

    // Listen for votes
    socketService.onVoteSubmitted((data) => {
      console.log("Vote submitted:", data);
      console.log("Updating results for poll:", data.pollId);
      dispatch(
        updatePollResults({
          pollId: data.pollId,
          results: data.results,
          totalResponses: data.totalResponses,
        })
      );
    });

    // Listen for poll ended
    socketService.onPollEnded((data) => {
      console.log("Poll ended:", data);
      dispatch(
        pollEnded({
          results: data.results,
          totalResponses: data.totalResponses,
        })
      );
      toast.info("Poll has ended!");
      loadPollHistory(); // Reload history
    });

    // Listen for active poll response
    socketService.onActivePoll((data) => {
      console.log("Active poll:", data);
      dispatch(
        setCurrentPoll({
          pollId: data.pollId,
          question: data.question,
          options: data.options,
          duration: data.duration,
          timeRemaining: data.timeRemaining,
          results: data.results,
          totalResponses: data.totalResponses,
          status: "active",
        })
      );
      dispatch(updateTimer(data.timeRemaining));
    });

    // Listen for no active poll
    socketService.onNoActivePoll(() => {
      console.log("No active poll");
      dispatch(clearCurrentPoll());
    });

    // Listen for errors
    socketService.onPollError((data) => {
      toast.error(data.message);
    });

    // Load poll history
    loadPollHistory();

    return () => {
      socketService.removeAllListeners();
    };
  }, [dispatch]);

  const loadPollHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API_URL}/api/polls/all`);
      const data = await response.json();
      if (data.success) {
        setPollHistoryState(data.data);
        dispatch(setPollHistory(data.data));
      }
    } catch (error) {
      console.error("Error loading poll history:", error);
      toast.error("Failed to load poll history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEndPoll = () => {
    if (currentPoll && currentPoll.pollId) {
      socketService.endPoll(currentPoll.pollId);
    }
  };

  const handleTimeUp = () => {
    // Poll will be ended automatically by the server
    console.log("Time is up!");
  };

  return (
    <div className="page-container">
      {/* View Poll History Button - Top Right */}
      <button
        className="view-history-btn"
        onClick={() => setIsHistoryModalOpen(true)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        View Poll history
      </button>

      <div className="grid-2">
        {/* Left Column - Create Poll */}
        <div>
          <TeacherDashboard />
        </div>

        {/* Right Column - Active Poll & Results */}
        <div>
          {currentPoll && currentPoll.status === "active" && (
            <>
              {/* Active Poll Info */}
              <div className="card" style={{ marginBottom: "2rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h3 style={{ marginBottom: "0.5rem" }}>Active Poll</h3>
                    <p
                      style={{
                        color: "var(--neutral-gray)",
                        fontSize: "0.95rem",
                      }}
                    >
                      {currentPoll.question}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleEndPoll}
                    style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}
                  >
                    End Poll
                  </button>
                </div>

                {/* Timer */}
                <Timer
                  duration={currentPoll.duration}
                  onTimeUp={handleTimeUp}
                />
              </div>

              {/* Live Results */}
              <ResultChart
                results={currentPoll.results}
                totalResponses={currentPoll.totalResponses}
              />
            </>
          )}
        </div>
      </div>

      {/* Poll History Modal */}
      <PollHistory
        polls={pollHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Chat Button and Popup */}
      <>
        <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} />
        <ChatPopup
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          userRole="teacher"
        />
      </>
    </div>
  );
}

export default Teacher;
