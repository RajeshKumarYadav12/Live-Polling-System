import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import socketService from "../services/socket";

function TeacherDashboard() {
  const dispatch = useDispatch();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [duration, setDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: "", isCorrect: false }]);
    } else {
      toast.warning("Maximum 6 options allowed");
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      toast.warning("Minimum 2 options required");
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const handleCorrectChange = (index, isCorrect) => {
    const newOptions = [...options];
    newOptions[index].isCorrect = isCorrect;
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();

    // Validation
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const validOptions = options.filter((opt) => opt.text.trim() !== "");
    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 options");
      return;
    }

    if (duration < 10 || duration > 300) {
      toast.error("Duration must be between 10 and 300 seconds");
      return;
    }

    // Create poll via REST API
    setIsCreating(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const optionTexts = validOptions.map((opt) => opt.text);
      
      const response = await fetch(`${API_URL}/api/polls/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          options: optionTexts,
          duration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setQuestion("");
        setOptions([
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
        setDuration(60);
        toast.success("Poll created successfully!");
        
        // Reload page to fetch new poll
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to create poll");
      }
    } catch (error) {
      console.error("Error creating poll:", error);
      toast.error("Failed to create poll");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="teacher-card">
      {/* Logo Badge */}
      <div className="logo-badge-small">
        <span className="sparkle-icon">✨</span>
        <span>Intervue Poll</span>
      </div>

      <h2 className="teacher-heading">
        <span className="heading-light">Let's </span>Get Started
      </h2>
      <p className="teacher-subtitle">
        you'll have the ability to create and manage polls, ask questions, and
        monitor your students' responses in real-time.
      </p>

      <form onSubmit={handleCreatePoll}>
        {/* Question Input with Duration */}
        <div className="form-group">
          <div className="question-header">
            <label className="form-label">Enter your question</label>
            <div className="duration-selector">
              <select
                className="duration-dropdown"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              >
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="120">120 seconds</option>
                <option value="180">180 seconds</option>
                <option value="300">300 seconds</option>
              </select>
            </div>
          </div>
          <textarea
            className="form-textarea-large"
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            maxLength={100}
            required
          />
          <div className="char-count">{question.length}/100</div>
        </div>

        {/* Options with Is it Correct */}
        <div className="form-group">
          <div className="options-section">
            <div className="options-header">
              <label className="form-label">Edit Options</label>
              <label className="form-label">Is it Correct?</label>
            </div>

            {options.map((option, index) => (
              <div key={index} className="option-row">
                <div className="option-number">{index + 1}</div>
                <input
                  type="text"
                  className="option-input"
                  placeholder="Enter option"
                  value={option.text}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                />
                <div className="correct-radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={option.isCorrect === true}
                      onChange={() => handleCorrectChange(index, true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={option.isCorrect === false}
                      onChange={() => handleCorrectChange(index, false)}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            ))}

            {options.length < 6 && (
              <button
                type="button"
                className="add-more-option-btn"
                onClick={handleAddOption}
              >
                + Add More option
              </button>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="ask-question-btn"
          disabled={isCreating}
        >
          {isCreating ? "Creating Poll..." : "Ask Question"}
        </button>
      </form>
    </div>
  );
}

export default TeacherDashboard;
