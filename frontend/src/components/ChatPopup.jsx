import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import socketService from "../services/socket";

function ChatPopup({ isOpen, onClose, userRole }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState([]);
  const messagesEndRef = useRef(null);
  const { studentName } = useSelector((state) => state.poll);

  const userName = userRole === "teacher" ? "Teacher" : studentName;

  useEffect(() => {
    let timeoutId;
    let listenersAttached = false;

    const handleChatMessage = (data) => {
      console.log("Received chat message:", data);
      setMessages((prev) => [...prev, data]);
    };

    const handleParticipantsUpdate = (data) => {
      console.log("Participants updated:", data);
      setParticipants(data.participants);
    };

    const setupListeners = () => {
      if (!socketService.socket) {
        console.log("Socket not ready, retrying in 100ms...");
        timeoutId = setTimeout(setupListeners, 100);
        return;
      }

      if (!listenersAttached) {
        socketService.socket.on("chatMessage", handleChatMessage);
        socketService.socket.on("participantsUpdate", handleParticipantsUpdate);
        listenersAttached = true;
        console.log("Chat listeners set up for:", userRole, userName);
      }
    };

    setupListeners();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (socketService.socket && listenersAttached) {
        socketService.socket.off("chatMessage", handleChatMessage);
        socketService.socket.off(
          "participantsUpdate",
          handleParticipantsUpdate
        );
        console.log("Chat listeners cleaned up");
      }
    };
  }, []);

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

      console.log("Sending message:", messageData);

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
