import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  setPollHistory,
} from "../features/poll/pollSlice";
import { toast } from "react-toastify";
import socketService from "../services/socket";
import { useSocket } from "../hooks/useSocket";
import { usePollHistory } from "../hooks/usePollHistory";
import TeacherDashboard from "../components/TeacherDashboard";
import Timer from "../components/Timer";
import ResultChart from "../components/ResultChart";
import ChatPopup from "../components/ChatPopup";
import ChatButton from "../components/ChatButton";
import PollHistory from "../components/PollHistory";

const API_URL = import.meta.env.VITE_API_URL || "";

function Teacher() {
  const dispatch = useDispatch();
  const { currentPoll } = useSelector((state) => state.poll);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const currentPollRef = useRef(null);

  // Use custom hook for poll history with caching (30-second cache)
  const {
    history: pollHistory,
    isLoading: isLoadingHistory,
    refetch: refetchPollHistory,
  } = usePollHistory({
    cacheTTL: 30000,
    autoLoad: true,
  });

  useEffect(() => {
    currentPollRef.current = currentPoll;
  }, [currentPoll]);

  // Custom hook handles all socket event listeners
  useSocket({
    role: "teacher",
    enabled: true,
    onPollEnded: () => refetchPollHistory(true),
  });

  // Connect socket, join as teacher, and kick off polling on mount
  useEffect(() => {
    socketService.connect();
    socketService.teacherJoin();
    socketService.getActivePoll();
    fetchActivePoll();

    const interval = setInterval(fetchActivePoll, 3000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Trigger refetch when modal opens (with force refresh to get latest data)
  useEffect(() => {
    if (isHistoryModalOpen) {
      refetchPollHistory(true);
    }
  }, [isHistoryModalOpen, refetchPollHistory]);

  const fetchActivePoll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/polls/active`);
      const data = await response.json();
      if (data.success && data.data) {
        const poll = data.data;
        const current = currentPollRef.current;
        if (current && current.pollId === poll._id) {
          dispatch(
            updatePollResults({
              pollId: poll._id,
              results: poll.options.map((opt) => ({
                text: opt.text,
                votes: opt.votes,
              })),
              totalResponses: poll.totalResponses || 0,
            }),
          );
        } else {
          dispatch(
            setCurrentPoll({
              pollId: poll._id,
              question: poll.question,
              options: poll.options.map((opt) => opt.text),
              duration: poll.duration,
              timeRemaining: poll.timeRemaining ?? poll.duration,
              results: poll.options.map((opt) => ({
                text: opt.text,
                votes: opt.votes,
              })),
              totalResponses: poll.totalResponses || 0,
              status: poll.status,
            }),
          );
        }
      } else {
        dispatch(clearCurrentPoll());
      }
    } catch (error) {
      console.error("Error fetching active poll:", error);
    }
  };

  async function handleEndPoll() {
    if (!currentPoll?.pollId) return;
    try {
      const response = await fetch(
        `${API_URL}/api/polls/${currentPoll.pollId}/end`,
        {
          method: "POST",
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Poll ended successfully!");
        dispatch(clearCurrentPoll());
        refetchPollHistory(true);
      } else {
        toast.error("Failed to end poll");
      }
    } catch (error) {
      console.error("Error ending poll:", error);
      toast.error("Failed to end poll");
    }
  }

  async function handleTimeUp() {
    if (!currentPoll?.pollId) return;
    try {
      const response = await fetch(
        `${API_URL}/api/polls/${currentPoll.pollId}/end`,
        {
          method: "POST",
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.info("Time's up! Poll has ended.");
        dispatch(clearCurrentPoll());
        refetchPollHistory(true);
      }
    } catch (error) {
      console.error("Error auto-ending poll:", error);
    }
  }

  return (
    <div className="page-container">
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
        <div>
          <TeacherDashboard />
        </div>

        <div>
          {currentPoll && currentPoll.status === "active" && (
            <>
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
                <Timer
                  duration={currentPoll.duration}
                  onTimeUp={handleTimeUp}
                />
              </div>

              <ResultChart
                results={currentPoll.results}
                totalResponses={currentPoll.totalResponses}
              />
            </>
          )}
        </div>
      </div>

      <PollHistory
        polls={pollHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        isLoading={isLoadingHistory}
      />

      <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} />
      <ChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userRole="teacher"
      />
    </div>
  );
}

export default Teacher;
