import { io } from "socket.io-client";

/**
 * Socket.io Service
 * Manages real-time communication with the backend
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
  }

  /**
   * Connect to Socket.io server
   */
  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to Socket.io server");
      });

      this.socket.on("disconnect", () => {
        console.log("❌ Disconnected from Socket.io server");
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
      });
    }
    return this.socket;
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Student joins with name
   */
  studentJoin(studentName) {
    if (this.socket) {
      this.socket.emit("studentJoin", { studentName });
    }
  }
  /**
   * Teacher joins
   */
  teacherJoin() {
    if (this.socket) {
      this.socket.emit("teacherJoin");
    }
  }

  /**
   * Send chat message
   */
  sendChatMessage(messageData) {
    if (this.socket) {
      this.socket.emit("sendChatMessage", messageData);
    }
  }

  /**
   * Get participants
   */
  getParticipants() {
    if (this.socket) {
      this.socket.emit("getParticipants");
    }
  }

  /**
   * Remove student (teacher only)
   */
  removeStudent(studentName) {
    if (this.socket) {
      this.socket.emit("removeStudent", { studentName });
    }
  }

  /**
   * Listen to removed from session
   */
  onRemovedFromSession(callback) {
    if (this.socket) {
      this.socket.on("removedFromSession", callback);
    }
  }
  /**
   * Teacher creates a poll
   */
  createPoll(question, options, duration = 60) {
    if (this.socket) {
      this.socket.emit("createPoll", { question, options, duration });
    }
  }

  /**
   * Student submits vote
   */
  submitVote(pollId, optionIndex, studentName) {
    if (this.socket) {
      this.socket.emit("submitVote", { pollId, optionIndex, studentName });
    }
  }

  /**
   * Get active poll
   */
  getActivePoll() {
    if (this.socket) {
      this.socket.emit("getActivePoll");
    }
  }

  /**
   * Get poll results
   */
  getPollResults(pollId) {
    if (this.socket) {
      this.socket.emit("getPollResults", { pollId });
    }
  }

  /**
   * Teacher ends poll
   */
  endPoll(pollId) {
    if (this.socket) {
      this.socket.emit("endPoll", { pollId });
    }
  }

  /**
   * Listen to poll created event
   */
  onPollCreated(callback) {
    if (this.socket) {
      this.socket.on("pollCreated", callback);
    }
  }

  /**
   * Listen to vote submitted event
   */
  onVoteSubmitted(callback) {
    if (this.socket) {
      this.socket.on("voteSubmitted", callback);
    }
  }

  /**
   * Listen to poll ended event
   */
  onPollEnded(callback) {
    if (this.socket) {
      this.socket.on("pollEnded", callback);
    }
  }

  /**
   * Listen to timer update event
   */
  onTimerUpdate(callback) {
    if (this.socket) {
      this.socket.on("timerUpdate", callback);
    }
  }

  /**
   * Listen to active poll response
   */
  onActivePoll(callback) {
    if (this.socket) {
      this.socket.on("activePoll", callback);
    }
  }

  /**
   * Listen to no active poll
   */
  onNoActivePoll(callback) {
    if (this.socket) {
      this.socket.on("noActivePoll", callback);
    }
  }

  /**
   * Listen to poll error
   */
  onPollError(callback) {
    if (this.socket) {
      this.socket.on("pollError", callback);
    }
  }

  /**
   * Listen to vote error
   */
  onVoteError(callback) {
    if (this.socket) {
      this.socket.on("voteError", callback);
    }
  }

  /**
   * Listen to join confirmed
   */
  onJoinConfirmed(callback) {
    if (this.socket) {
      this.socket.on("joinConfirmed", callback);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  /**
   * Remove specific listener
   */
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
