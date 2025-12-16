import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  pollEnded,
  setHasVoted,
  updateTimer,
  setSelectedOption,
} from "../features/poll/pollSlice";
import { toast } from "react-toastify";
import socketService from "../services/socket";
import StudentJoin from "../components/StudentJoin";
import PollQuestion from "../components/PollQuestion";
import Timer from "../components/Timer";
import ResultChart from "../components/ResultChart";
import ChatPopup from "../components/ChatPopup";
import ChatButton from "../components/ChatButton";

function Student() {
  const dispatch = useDispatch();
  const { currentPoll, studentName, hasVoted } = useSelector(
    (state) => state.poll
  );
  const [hasJoined, setHasJoined] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    if (hasJoined) {
      // Listen for poll created
      socketService.onPollCreated((data) => {
        console.log("New poll created:", data);
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
        dispatch(setHasVoted(false));
        dispatch(setSelectedOption(null));
        toast.info("New poll is now live!");
      });

      // Listen for votes (for live results)
      socketService.onVoteSubmitted((data) => {
        console.log("Vote update:", data);
        if (currentPoll && data.pollId === currentPoll.pollId) {
          dispatch(
            updatePollResults({
              results: data.results,
              totalResponses: data.totalResponses,
            })
          );
        }
      });

      // Listen for timer updates
      socketService.onTimerUpdate((data) => {
        if (currentPoll && data.pollId === currentPoll.pollId) {
          dispatch(updateTimer(data.timeRemaining));
        }
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
        toast.info("Poll has ended! Here are the results.");
      });

      // Listen for active poll response
      socketService.onActivePoll(async (data) => {
        console.log("Active poll received:", data);
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

        // Check if student has already voted
        try {
          const response = await fetch(
            `/api/polls/${data.pollId}/check-vote/${studentName}`
          );
          const result = await response.json();
          if (result.success && result.hasVoted) {
            dispatch(setHasVoted(true));
          }
        } catch (error) {
          console.error("Error checking vote status:", error);
        }
      });

      // Listen for no active poll
      socketService.onNoActivePoll(() => {
        console.log("No active poll");
        dispatch(clearCurrentPoll());
      });

      // Listen for vote error
      socketService.onVoteError((data) => {
        toast.error(data.message);
      });

      // Listen for removal from session
      socketService.onRemovedFromSession((data) => {
        setIsKicked(true);
      });

      return () => {
        socketService.removeAllListeners();
      };
    }
  }, [hasJoined, dispatch, currentPoll, studentName]);

  const handleJoin = (name) => {
    const socket = socketService.connect();

    // Wait for connection to be established
    if (socket.connected) {
      socketService.studentJoin(name);
      socketService.getActivePoll();
      setHasJoined(true);
    } else {
      socket.once("connect", () => {
        socketService.studentJoin(name);
        socketService.getActivePoll();
        setHasJoined(true);
      });
    }
  };

  const handleTimeUp = () => {
    console.log("Time is up!");
  };

  // Show kicked out page
  if (isKicked) {
    return (
      <div className="page-container">
        <div className="kicked-out-container">
          <div className="logo-badge-small">
            <span className="sparkle-icon">✨</span>
            <span>Intervue Poll</span>
          </div>

          <h2 className="kicked-out-heading">You've been Kicked out !</h2>
          <p className="kicked-out-message">
            Looks like the teacher had removed you from the poll system. Please
            Try again sometime.
          </p>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="page-container" style={{ paddingTop: "4rem" }}>
        <StudentJoin onJoin={handleJoin} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Student Name Display - Top Right */}
      {currentPoll && (
        <div className="student-name-badge">Logged in as: {studentName}</div>
      )}

      {currentPoll ? (
        <div className="poll-center-container">
          <PollQuestion poll={currentPoll} />
        </div>
      ) : (
        <div className="student-waiting-container">
          {/* Logo Badge */}
          <div className="logo-badge-small">
            <span className="sparkle-icon">✨</span>
            <span>Intervue Poll</span>
          </div>

          <div className="waiting-spinner"></div>

          <h2 className="waiting-message">
            Wait for the teacher to ask questions..
          </h2>
        </div>
      )}

      {/* Chat Button and Popup */}
      {hasJoined && (
        <>
          <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} />
          <ChatPopup
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            userRole="student"
          />
        </>
      )}
    </div>
  );
}

export default Student;
