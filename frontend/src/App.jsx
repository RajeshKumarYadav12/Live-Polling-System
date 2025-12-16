import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Teacher from "./pages/Teacher";
import Student from "./pages/Student";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/teacher" element={<Teacher />} />
      <Route path="/student" element={<Student />} />
    </Routes>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("");

  const handleContinue = () => {
    if (selectedRole === "student") {
      navigate("/student");
    } else if (selectedRole === "teacher") {
      navigate("/teacher");
    }
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="logo-badge">
          <span className="sparkle-icon">✨</span>
          <span>Intervue Poll</span>
        </div>

        <h1 className="main-heading">
          Welcome to the <span className="highlight">Live Polling System</span>
        </h1>

        <p className="subtitle">
          Please select the role that best describes you to begin using the live
          polling system
        </p>

        <div className="role-cards">
          <div
            className={`role-card ${
              selectedRole === "student" ? "selected" : ""
            }`}
            onClick={() => setSelectedRole("student")}
          >
            <h3 className="role-title">I'm a Student</h3>
            <p className="role-description">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry
            </p>
          </div>

          <div
            className={`role-card ${
              selectedRole === "teacher" ? "selected" : ""
            }`}
            onClick={() => setSelectedRole("teacher")}
          >
            <h3 className="role-title">I'm a Teacher</h3>
            <p className="role-description">
              Submit answers and view live poll results in real-time.
            </p>
          </div>
        </div>

        <button
          className="continue-btn"
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default App;
