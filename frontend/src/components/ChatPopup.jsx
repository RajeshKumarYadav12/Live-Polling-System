import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import socketService from "../services/socket";

function ChatPopup({ isOpen, onClose, userRole }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState([]);
  const messagesEndRef = useRef(null);
  const listenersSetupRef = useRef(false);
  const { studentName } = useSelector((state) => state.poll);

  const userName = userRole === "teacher" ? "Teacher" : studentName;

  // Define handlers using useCallback to maintain stable references
  const handleChatMessage = useCallback((data) => {
    console.log(`[${userRole}] Received chat message:`, data);
    setMessages((prev) => {
      // Prevent duplicate messages by checking if message already exists
      const isDuplicate = prev.some(
        (msg) =>
          msg.sender === data.sender &&
          msg.message === data.message &&
          Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000
      );
      if (isDuplicate) {
        console.log(`[${userRole}] Duplicate message detected, ignoring`);
        return prev;
      }
      return [...prev, data];
    });
  }, [userRole]);

  const handleParticipantsUpdate = useCallback((data) => {
    console.log(`[${userRole}] Participants updated:`, data);
    setParticipants(data.participants);
  }, [userRole]);

  useEffect(() => {
    // Only set up listeners once
    if (listenersSetupRef.current) {
      return;
    }

    // Ensure socket is connected before setting up listeners
    const setupListeners = () => {
      const socket = socketService.socket;

      if (!socket) {
        console.log(`[${userRole}] Socket not available yet, waiting...`);
        setTimeout(setupListeners, 200);
        return;
      }

      // Remove ALL existing listeners for these events to prevent duplicates
      socket.removeAllListeners("chatMessage");
      socket.removeAllListeners("participantsUpdate");

      // Add listeners
      socket.on("chatMessage", handleChatMessage);
      socket.on("participantsUpdate", handleParticipantsUpdate);

      listenersSetupRef.current = true;
      console.log(
        `[${userRole}] Chat listeners attached (Socket ID: ${socket.id})`
      );
    };

    setupListeners();

    return () => {
      const socket = socketService.socket;
      if (socket) {
        socket.off("chatMessage", handleChatMessage);
        socket.off("participantsUpdate", handleParticipantsUpdate);
        listenersSetupRef.current = false;
      }
    };
  }, [handleChatMessage, handleParticipantsUpdate, userRole]);

  // Request participants when popup opens
  useEffect(() => {
    if (isOpen) {
      socketService.socket?.emit("getParticipants");
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketService.socket) {
      const messageData = {
        sender: userName,
        message: newMessage.trim(),
        role: userRole,
        timestamp: new Date(),
      };

      console.log(`[${userRole}] Sending message:`, messageData);
      console.log(
        `[${userRole}] Socket connected:`,
        socketService.socket.connected
      );
      console.log(`[${userRole}] Socket ID:`, socketService.socket.id);

      // Send to server to broadcast to everyone
      socketService.socket.emit("sendChatMessage", messageData);
      setNewMessage("");
    }
  };

  const handleRemoveStudent = (studentName) => {
    if (window.confirm(`Remove ${studentName} from the session?`)) {
      socketService.socket?.emit("removeStudent", { studentName });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-popup">
      <div className="chat-popup-header">
        <div className="chat-tabs">
          <button
            className={`chat-tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`chat-tab ${
              activeTab === "participants" ? "active" : ""
            }`}
            onClick={() => setActiveTab("participants")}
          >
            Participants
          </button>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-popup-body">
        {activeTab === "chat" ? (
          <>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      msg.sender === userName ? "own-message" : ""
                    }`}
                  >
                    <div className="message-sender">
                      {msg.role === "teacher" ? "👨‍🏫" : "👨‍🎓"} {msg.sender}
                    </div>
                    <div className="message-bubble">{msg.message}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="chat-send-btn">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="participants-list">
            {participants.length === 0 ? (
              <div className="chat-empty">
                <p>No participants yet</p>
              </div>
            ) : (
              <>
                <div className="participants-table-header">
                  <div className="table-header-name">Name</div>
                  <div className="table-header-action">Action</div>
                </div>
                <div className="participants-table-body">
                  {participants.map((participant, index) => (
                    <div key={index} className="participant-row">
                      <div className="participant-info">
                        <span className="participant-name">
                          {participant.name}
                        </span>
                        {participant.role === "teacher" && (
                          <span className="teacher-badge">Teacher</span>
                        )}
                      </div>
                      <div className="participant-action">
                        {userRole === "teacher" &&
                        participant.role === "student" ? (
                          <button
                            className="kick-out-link"
                            onClick={() =>
                              handleRemoveStudent(participant.name)
                            }
                          >
                            Kick out
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPopup;
