import React, { useEffect, useState, useRef } from "react";
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
  const currentPollRef = useRef(null);

  // Update ref when currentPoll changes
  useEffect(() => {
    currentPollRef.current = currentPoll;
  }, [currentPoll]);

  useEffect(() => {
    // Connect to Socket.io
    socketService.connect();

    // Teacher joins
    socketService.teacherJoin();

    // Fetch active poll via REST API
    fetchActivePoll();

    // Poll for active poll updates every 3 seconds for live results
    const pollInterval = setInterval(fetchActivePoll, 3000);

    // Check for active poll on load via Socket.io (fallback)
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
      clearInterval(pollInterval);
      socketService.removeAllListeners();
    };
  }, [dispatch]);

  const fetchActivePoll = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API_URL}/api/polls/active`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const poll = data.data;
        const current = currentPollRef.current;
        
        // Only update results, don't reset timer if poll is already active
        if (current && current.pollId === poll._id) {
          dispatch(
            updatePollResults({
              pollId: poll._id,
              results: poll.options.map((opt) => ({ text: opt.text, votes: opt.votes })),
              totalResponses: poll.totalResponses || 0,
            })
          );
        } else {
          // New poll, set everything including timer
          dispatch(
            setCurrentPoll({
              pollId: poll._id,
              question: poll.question,
              options: poll.options.map((opt) => opt.text),
              duration: poll.duration,
              timeRemaining: poll.duration,
              results: poll.options.map((opt) => ({ text: opt.text, votes: opt.votes })),
              totalResponses: poll.totalResponses || 0,
              status: poll.status,
            })
          );
        }
      } else {
        dispatch(clearCurrentPoll());
      }
    } catch (error) {
      console.error("Error fetching active poll:", error);
    }
  };

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

  const handleEndPoll = async () => {
    if (currentPoll && currentPoll.pollId) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_URL}/api/polls/${currentPoll.pollId}/end`, {
          method: "POST",
        });
        const data = await response.json();
        
        if (data.success) {
          toast.success("Poll ended successfully!");
          dispatch(clearCurrentPoll());
          loadPollHistory();
        } else {
          toast.error("Failed to end poll");
        }
      } catch (error) {
        console.error("Error ending poll:", error);
        toast.error("Failed to end poll");
      }
    }
  };

  const handleTimeUp = async () => {
    // End poll when timer reaches 0
    if (currentPoll && currentPoll.pollId) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_URL}/api/polls/${currentPoll.pollId}/end`, {
          method: "POST",
        });
        const data = await response.json();
        
        if (data.success) {
          toast.info("Time's up! Poll has ended.");
          dispatch(clearCurrentPoll());
          loadPollHistory();
        }
      } catch (error) {
        console.error("Error auto-ending poll:", error);
      }
    }
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
