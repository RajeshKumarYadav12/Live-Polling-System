import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setStudentName } from "../features/poll/pollSlice";
import { toast } from "react-toastify";
import socketService from "../services/socket";

function StudentJoin({ onJoin }) {
  const dispatch = useDispatch();
  const [name, setName] = useState("");

  // Listen for removal from session
  useEffect(() => {
    socketService.onRemovedFromSession((data) => {
      toast.error(data.message);
      dispatch(setStudentName(""));
      localStorage.removeItem("studentName");
      window.location.href = "/";
    });
  }, [dispatch]);

  const handleJoin = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    // Save student name in Redux and localStorage
    dispatch(setStudentName(name.trim()));

    // Notify server via Socket.io
    socketService.studentJoin(name.trim());

    // Call parent callback
    if (onJoin) {
      onJoin(name.trim());
    }

    toast.success(`Welcome, ${name.trim()}!`);
  };

  return (
    <div className="student-join-container">
      {/* Logo Badge */}
      <div className="logo-badge-small">
        <span className="sparkle-icon">✨</span>
        <span>Intervue Poll</span>
      </div>

      <h2 className="student-heading">
        <span className="heading-light">Let's </span>Get Started
      </h2>
      <p className="student-subtitle">
        If you're a student, you'll be able to{" "}
        <strong>submit your answers</strong>, participate in live polls, and see
        how your responses compare with your classmates
      </p>

      <form onSubmit={handleJoin}>
        <div className="form-group">
          <label className="student-label">Enter your Name</label>
          <input
            type="text"
            className="student-input"
            placeholder="Rahul Bajaj"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <button type="submit" className="continue-btn">
          Continue
        </button>
      </form>
    </div>
  );
}

export default StudentJoin;
