import Poll from "./models/Poll.js";
import Response from "./models/Response.js";

const activePollTimers = new Map();
const connectedStudents = new Map();
const connectedUsers = new Map();

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ New client connected: ${socket.id}`);

    // Student joins with name
    socket.on("studentJoin", ({ studentName }) => {
      connectedStudents.set(socket.id, studentName);
      connectedUsers.set(socket.id, {
        name: studentName,
        role: "student",
        socketId: socket.id,
      });
      socket.emit("joinConfirmed", { studentName });
      console.log(`👨‍🎓 Student joined: ${studentName} (${socket.id})`);

      // Broadcast updated participants
      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });

    // Teacher creates a new poll
    socket.on("createPoll", async ({ question, options, duration }) => {
      try {
        // Check if there's an active poll
        const activePoll = await Poll.findOne({ status: "active" });
        if (activePoll) {
          socket.emit("pollError", { message: "A poll is already active" });
          return;
        }

        // Create new poll
        const poll = new Poll({
          question,
          options: options.map((opt) => ({ text: opt, votes: 0 })),
          duration: duration || 60,
          status: "active",
          createdAt: new Date(),
        });

        await poll.save();

        // Broadcast poll to all clients
        io.emit("pollCreated", {
          pollId: poll._id,
          question: poll.question,
          options: poll.options.map((opt) => opt.text),
          duration: poll.duration,
          startTime: poll.createdAt,
        });

        // Broadcast timer updates every second
        const timerInterval = setInterval(() => {
          const timeElapsed = Math.floor(
            (Date.now() - poll.createdAt.getTime()) / 1000
          );
          const timeRemaining = Math.max(0, poll.duration - timeElapsed);

          io.emit("timerUpdate", {
            pollId: poll._id,
            timeRemaining,
          });

          if (timeRemaining <= 0) {
            clearInterval(timerInterval);
          }
        }, 1000);

        // Set timer to auto-close poll
        const timer = setTimeout(async () => {
          clearInterval(timerInterval);
          await endPoll(poll._id, io);
        }, poll.duration * 1000);

        activePollTimers.set(poll._id.toString(), {
          timer,
          interval: timerInterval,
        });

        console.log(`📊 Poll created: ${poll._id}`);
      } catch (error) {
        console.error("Error creating poll:", error);
        socket.emit("pollError", { message: "Failed to create poll" });
      }
    });

    // Student submits vote
    socket.on("submitVote", async ({ pollId, optionIndex, studentName }) => {
      try {
        // Check if poll exists and is active
        const poll = await Poll.findById(pollId);
        if (!poll || poll.status !== "active") {
          socket.emit("voteError", { message: "Poll is not active" });
          return;
        }

        // Check if student already voted
        const existingResponse = await Response.findOne({
          pollId,
          studentName,
        });
        if (existingResponse) {
          socket.emit("voteError", { message: "You have already voted" });
          return;
        }

        // Save response
        const response = new Response({
          pollId,
          studentName,
          optionIndex,
          submittedAt: new Date(),
        });
        await response.save();

        // Update poll vote count
        poll.options[optionIndex].votes += 1;
        await poll.save();

        // Get total responses
        const totalResponses = await Response.countDocuments({ pollId });

        // Emit updated results to all clients
        const results = poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes,
        }));

        io.emit("voteSubmitted", {
          pollId,
          results,
          totalResponses,
        });

        console.log(
          `✅ Vote submitted: ${studentName} voted for option ${optionIndex}`
        );

        // Check if all students have voted (if we want to end early)
        // For now, let timer handle poll ending
      } catch (error) {
        console.error("Error submitting vote:", error);
        socket.emit("voteError", { message: "Failed to submit vote" });
      }
    });

    // Get current active poll
    socket.on("getActivePoll", async () => {
      try {
        const poll = await Poll.findOne({ status: "active" });
        if (poll) {
          const responses = await Response.countDocuments({ pollId: poll._id });
          const timeElapsed = Math.floor(
            (Date.now() - poll.createdAt.getTime()) / 1000
          );
          const timeRemaining = Math.max(0, poll.duration - timeElapsed);

          socket.emit("activePoll", {
            pollId: poll._id,
            question: poll.question,
            options: poll.options.map((opt) => opt.text),
            duration: poll.duration,
            timeRemaining,
            results: poll.options.map((opt) => ({
              text: opt.text,
              votes: opt.votes,
            })),
            totalResponses: responses,
          });
        } else {
          socket.emit("noActivePoll");
        }
      } catch (error) {
        console.error("Error fetching active poll:", error);
      }
    });

    // Get poll results
    socket.on("getPollResults", async ({ pollId }) => {
      try {
        const poll = await Poll.findById(pollId);
        const responses = await Response.countDocuments({ pollId });

        if (poll) {
          socket.emit("pollResults", {
            pollId: poll._id,
            question: poll.question,
            results: poll.options.map((opt) => ({
              text: opt.text,
              votes: opt.votes,
            })),
            totalResponses: responses,
            status: poll.status,
          });
        }
      } catch (error) {
        console.error("Error fetching poll results:", error);
      }
    });

    // Teacher ends poll manually
    socket.on("endPoll", async ({ pollId }) => {
      try {
        await endPoll(pollId, io);
      } catch (error) {
        console.error("Error ending poll:", error);
      }
    });

    // Chat message
    socket.on("sendChatMessage", (data) => {
      console.log("📨 Chat message:", data);
      // Broadcast chat message to all clients including sender
      io.emit("chatMessage", {
        sender: data.sender,
        message: data.message,
        role: data.role,
        timestamp: data.timestamp,
      });
    });

    // Get participants
    socket.on("getParticipants", () => {
      const participants = Array.from(connectedUsers.values());
      socket.emit("participantsUpdate", { participants });
    });

    // Remove student (teacher only)
    socket.on("removeStudent", ({ studentName }) => {
      // Find and disconnect the student
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
          console.log(`🚫 Student removed: ${studentName}`);

          // Broadcast updated participants
          io.emit("participantsUpdate", {
            participants: Array.from(connectedUsers.values()),
          });
          break;
        }
      }
    });

    // Teacher joins
    socket.on("teacherJoin", () => {
      connectedUsers.set(socket.id, {
        name: "Teacher",
        role: "teacher",
        socketId: socket.id,
      });
      console.log(`👨‍🏫 Teacher joined (${socket.id})`);

      // Broadcast updated participants
      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      const studentName = connectedStudents.get(socket.id);
      const user = connectedUsers.get(socket.id);

      if (studentName) {
        console.log(`👋 Student disconnected: ${studentName} (${socket.id})`);
        connectedStudents.delete(socket.id);
      } else if (user) {
        console.log(
          `👋 ${user.role} disconnected: ${user.name} (${socket.id})`
        );
      } else {
        console.log(`❌ Client disconnected: ${socket.id}`);
      }

      connectedUsers.delete(socket.id);

      // Broadcast updated participants
      io.emit("participantsUpdate", {
        participants: Array.from(connectedUsers.values()),
      });
    });
  });
};

/**
 * End a poll and broadcast results
 */
async function endPoll(pollId, io) {
  try {
    const poll = await Poll.findById(pollId);
    if (!poll) return;

    poll.status = "ended";
    poll.endedAt = new Date();
    await poll.save();

    // Clear timer and interval
    const timerData = activePollTimers.get(pollId.toString());
    if (timerData) {
      if (timerData.timer) clearTimeout(timerData.timer);
      if (timerData.interval) clearInterval(timerData.interval);
      activePollTimers.delete(pollId.toString());
    }

    // Get total responses
    const totalResponses = await Response.countDocuments({ pollId });

    // Broadcast poll ended event
    io.emit("pollEnded", {
      pollId: poll._id,
      results: poll.options.map((opt) => ({
        text: opt.text,
        votes: opt.votes,
      })),
      totalResponses,
    });

    console.log(`🏁 Poll ended: ${pollId}`);
  } catch (error) {
    console.error("Error ending poll:", error);
  }
}
