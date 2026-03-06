/**
 * Socket.io Handler
 * Responsible ONLY for connection lifecycle and event routing.
 * All business / DB logic is delegated to PollService.
 */

import { setIo } from "./utils/socketInstance.js";
import { PollService } from "./services/PollService.js";

// In-memory maps — reset on server restart (that is fine, DB is source of truth)
const connectedStudents = new Map(); // socketId  -> studentName
const connectedUsers = new Map();    // socketId  -> { name, role, socketId }

export const initializeSocket = (io) => {
  // Make the io instance available to controllers without circular deps
  setIo(io);

  io.on("connection", (socket) => {
    console.log(`Connected: ${socket.id}`);

    // STUDENT: join with a display name
    socket.on("studentJoin", ({ studentName }) => {
      connectedStudents.set(socket.id, studentName);
      connectedUsers.set(socket.id, {
        name: studentName,
        role: "student",
        socketId: socket.id,
      });

      socket.emit("joinConfirmed", { studentName });
      console.log(`Student joined: ${studentName} (${socket.id})`);

      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });

    // TEACHER: register presence
    socket.on("teacherJoin", () => {
      connectedUsers.set(socket.id, {
        name: "Teacher",
        role: "teacher",
        socketId: socket.id,
      });
      console.log(`Teacher joined (${socket.id})`);

      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });

    // TEACHER: create poll
    socket.on("createPoll", async ({ question, options, duration }) => {
      try {
        const poll = await PollService.createPoll(question, options, duration);

        io.emit("pollCreated", {
          pollId: poll._id,
          question: poll.question,
          options: poll.options.map((opt) => opt.text),
          duration: poll.duration,
          startTime: poll.createdAt,
        });

        console.log(`Poll created: ${poll._id}`);
      } catch (error) {
        console.error("Error creating poll:", error);
        socket.emit("pollError", {
          message: error.message || "Failed to create poll",
        });
      }
    });

    // STUDENT: submit vote
    socket.on("submitVote", async ({ pollId, optionIndex, studentName }) => {
      try {
        await PollService.submitVote(pollId, optionIndex, studentName);
        console.log(`Vote submitted: ${studentName} voted for option ${optionIndex}`);
      } catch (error) {
        console.error("Error submitting vote:", error);
        socket.emit("voteError", {
          message: error.message || "Failed to submit vote",
        });
      }
    });

    // STATE RECOVERY: client requests current poll on page refresh
    socket.on("getActivePoll", async () => {
      try {
        const pollData = await PollService.getActivePoll();
        if (pollData) {
          socket.emit("activePoll", pollData);
        } else {
          socket.emit("noActivePoll");
        }
      } catch (error) {
        console.error("Error fetching active poll:", error);
      }
    });

    // TEACHER: manually end poll
    socket.on("endPoll", async ({ pollId }) => {
      try {
        await PollService.endPoll(pollId);
      } catch (error) {
        console.error("Error ending poll:", error);
        socket.emit("pollError", {
          message: error.message || "Failed to end poll",
        });
      }
    });

    // Poll results on demand
    socket.on("getPollResults", async ({ pollId }) => {
      try {
        const pollData = await PollService.getActivePoll();
        if (pollData && pollData.pollId.toString() === pollId.toString()) {
          socket.emit("pollResults", pollData);
        }
      } catch (error) {
        console.error("Error fetching poll results:", error);
      }
    });

    // CHAT: broadcast messages to all clients
    socket.on("sendChatMessage", (data) => {
      io.emit("chatMessage", {
        sender: data.sender,
        message: data.message,
        role: data.role,
        timestamp: data.timestamp,
      });
    });

    // PARTICIPANTS: on demand snapshot
    socket.on("getParticipants", () => {
      socket.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });

    // TEACHER: remove student from session
    socket.on("removeStudent", ({ studentName }) => {
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.name === studentName && user.role === "student") {
          const studentSocket = io.sockets.sockets.get(socketId);
          if (studentSocket) {
            studentSocket.emit("removedFromSession", {
              message: "You have been removed from the session by the teacher",
            });
            studentSocket.disconnect(true);
          }
          connectedUsers.delete(socketId);
          connectedStudents.delete(socketId);
          console.log(`Student removed: ${studentName}`);

          io.emit("participantsUpdate", {
            participants: Array.from(connectedUsers.values()),
          });
          break;
        }
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`${user.role} disconnected: ${user.name} (${socket.id})`);
      } else {
        console.log(`Client disconnected: ${socket.id}`);
      }

      connectedStudents.delete(socket.id);
      connectedUsers.delete(socket.id);

      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });
  });
};
