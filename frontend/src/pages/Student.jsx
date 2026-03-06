import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  setHasVoted,
  setStudentName,
} from "../features/poll/pollSlice";
import socketService from "../services/socket";
import { useSocket } from "../hooks/useSocket";
import StudentJoin from "../components/StudentJoin";
import PollQuestion from "../components/PollQuestion";
import ChatPopup from "../components/ChatPopup";
import ChatButton from "../components/ChatButton";

const API_URL = import.meta.env.VITE_API_URL || "";
const NAME_COOKIE = "student_name";

function setCookie(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function Student() {
  const dispatch = useDispatch();
  const { currentPoll, studentName } = useSelector((state) => state.poll);
  const [hasJoined, setHasJoined] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [isRecovering, setIsRecovering] = useState(true);
  const currentPollRef = useRef(null);

  useEffect(() => {
    currentPollRef.current = currentPoll;
  }, [currentPoll]);

  // Custom hook handles all socket event listeners
  useSocket({
    role: "student",
    enabled: hasJoined,
    studentName,
    onKicked: () => {
      deleteCookie(NAME_COOKIE);
      setIsKicked(true);
    },
  });

  // On mount: recover session from cookie (instant, no network call)
  useEffect(() => {
    const savedName = getCookie(NAME_COOKIE);
    if (savedName) {
      dispatch(setStudentName(savedName));
      socketService.connect();
      socketService.studentJoin(savedName);
      socketService.getActivePoll();
      setHasJoined(true);
    }
    setIsRecovering(false);
  }, [dispatch]);

  // Poll REST API every 5s as resilience fallback
  useEffect(() => {
    if (!hasJoined) return;
    fetchActivePoll();
    const interval = setInterval(fetchActivePoll, 5000);
    return () => clearInterval(interval);
  }, [hasJoined]);

  const fetchActivePoll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/polls/active`);
      const data = await response.json();
      if (data.success && data.data) {
        const poll = data.data;
        const current = currentPollRef.current;
        if (current && current.pollId === poll._id) {
          dispatch(updatePollResults({
            pollId: poll._id,
            results: poll.options.map((opt) => ({ text: opt.text, votes: opt.votes })),
            totalResponses: poll.totalResponses || 0,
          }));
        } else {
          dispatch(setCurrentPoll({
            pollId: poll._id,
            question: poll.question,
            options: poll.options.map((opt) => opt.text),
            duration: poll.duration,
            timeRemaining: poll.timeRemaining ?? poll.duration,
            results: poll.options.map((opt) => ({ text: opt.text, votes: opt.votes })),
            totalResponses: poll.totalResponses || 0,
            status: poll.status,
          }));
          try {
            if (studentName) {
              const voteRes = await fetch(`${API_URL}/api/polls/${poll._id}/check-vote/${encodeURIComponent(studentName)}`);
              const voteData = await voteRes.json();
              if (voteData.success && voteData.hasVoted) dispatch(setHasVoted(true));
            }
          } catch { /* non-fatal */ }
        }
      } else {
        dispatch(clearCurrentPoll());
      }
    } catch (error) {
      console.error("Error fetching active poll:", error);
    }
  };

  const handleJoin = (name) => {
    setCookie(NAME_COOKIE, name, 1);
    dispatch(setStudentName(name));
    socketService.connect();
    socketService.studentJoin(name);
    socketService.getActivePoll();
    setHasJoined(true);
    fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: name }),
    }).catch(() => {});
  };

  if (isRecovering) {
    return (
      <div className="page-container">
        <div className="student-waiting-container">
          <div className="waiting-spinner"></div>
        </div>
      </div>
    );
  }

  if (isKicked) {
    return (
      <div className="page-container">
        <div className="kicked-out-container">
          <div className="logo-badge-small">
            <img src="/sparkle-icon.png" alt="sparkle" className="sparkle-icon" />
            <span>Intervue Poll</span>
          </div>
          <h2 className="kicked-out-heading">You've been Kicked out !</h2>
          <p className="kicked-out-message">
            Looks like the teacher had removed you from the poll system. Please
            <br />
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
      {currentPoll ? (
        <div className="poll-center-container">
          <PollQuestion poll={currentPoll} />
        </div>
      ) : (
        <div className="student-waiting-container">
          <div className="logo-badge-small">
            <img src="/sparkle-icon.png" alt="sparkle" className="sparkle-icon" />
            <span>Intervue Poll</span>
          </div>
          <div className="waiting-spinner"></div>
          <h2 className="waiting-message">Wait for the teacher to ask questions..</h2>
        </div>
      )}

      <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} />
      <ChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userRole="student"
      />
    </div>
  );
}

export default Student;