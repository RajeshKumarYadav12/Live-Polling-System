/**
 * Poll Service
 * Centralizes all business logic and DB interaction for polls.
 * Both Socket handlers (socket.js) and HTTP controllers (pollController.js)
 * delegate to this service — keeping concerns separated.
 */

import Poll from "../models/Poll.js";
import Response from "../models/Response.js";
import { startPollTimer, stopPollTimer } from "../utils/pollTimer.js";
import { getIo } from "../utils/socketInstance.js";

export class PollService {
  /**
   * Get the current active poll with server-authoritative timeRemaining.
   * Returns null when no poll is active.
   */
  static async getActivePoll() {
    const poll = await Poll.findOne({ status: "active" });
    if (!poll) return null;

    const responses = await Response.countDocuments({ pollId: poll._id });
    const timeElapsed = Math.floor(
      (Date.now() - new Date(poll.createdAt).getTime()) / 1000,
    );
    const timeRemaining = Math.max(0, poll.duration - timeElapsed);

    return {
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
      status: poll.status,
    };
  }

  /**
   * Create a new poll, persist it, and start the authoritative server timer.
   * Throws if another poll is already active.
   */
  static async createPoll(question, options, duration = 60) {
    const activePoll = await Poll.findOne({ status: "active" });
    if (activePoll) {
      throw new Error("A poll is already active");
    }

    const poll = new Poll({
      question,
      options: options.map((opt) => ({ text: opt, votes: 0 })),
      duration,
      status: "active",
      createdAt: new Date(),
    });
    await poll.save();

    const io = getIo();
    startPollTimer(poll._id.toString(), duration, io, async () => {
      await PollService.endPoll(poll._id.toString());
    });

    return poll;
  }

  /**
   * End a poll: mark as ended in DB, clear the in-memory timer, and
   * broadcast pollEnded via Socket.io.
   * Idempotent — safe to call multiple times.
   */
  static async endPoll(pollId) {
    const poll = await Poll.findById(pollId);
    if (!poll) throw new Error("Poll not found");

    // Idempotency — already ended, nothing to do
    if (poll.status === "ended") return poll;

    poll.status = "ended";
    poll.endedAt = new Date();
    await poll.save();

    // Clear server-side timer so it doesn't fire again
    stopPollTimer(pollId.toString());

    const totalResponses = await Response.countDocuments({ pollId });

    const io = getIo();
    if (io) {
      io.emit("pollEnded", {
        pollId: poll._id,
        results: poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes,
        })),
        totalResponses,
      });
    }

    console.log(`🏁 Poll ended: ${pollId}`);
    return poll;
  }

  /**
   * Submit a vote for a student.
   * Enforces single-vote-per-student at the DB level.
   * Emits voteSubmitted to all connected clients.
   */
  static async submitVote(pollId, optionIndex, studentName) {
    const poll = await Poll.findById(pollId);
    if (!poll || poll.status !== "active") {
      throw new Error("Poll is not active");
    }

    // Database-level duplicate vote prevention
    const existing = await Response.findOne({ pollId, studentName });
    if (existing) {
      throw new Error("You have already voted");
    }

    const response = new Response({
      pollId,
      studentName,
      optionIndex,
      submittedAt: new Date(),
    });
    await response.save();

    poll.options[optionIndex].votes += 1;
    await poll.save();

    const totalResponses = await Response.countDocuments({ pollId });
    const results = poll.options.map((opt) => ({
      text: opt.text,
      votes: opt.votes,
    }));

    const io = getIo();
    if (io) {
      io.emit("voteSubmitted", { pollId, results, totalResponses });
    }

    return { results, totalResponses };
  }

  /**
   * Check whether a student has already voted on a poll.
   */
  static async hasStudentVoted(pollId, studentName) {
    const response = await Response.findOne({ pollId, studentName });
    return !!response;
  }

  /**
   * Get all ended polls (poll history) from the database.
   */
  static async getPollHistory() {
    const polls = await Poll.find({ status: "ended" })
      .sort({ createdAt: -1 })
      .limit(50);

    const pollsWithResponses = await Promise.all(
      polls.map(async (poll) => {
        const responses = await Response.countDocuments({ pollId: poll._id });
        return { ...poll.toObject(), totalResponses: responses };
      }),
    );

    return pollsWithResponses;
  }

  /**
   * Recover active polls after a server restart.
   * Recalculates remaining time and either ends expired polls or
   * restarts their timers so the server remains the source of truth.
   */
  static async recoverActivePolls() {
    try {
      const activePolls = await Poll.find({ status: "active" });
      if (activePolls.length === 0) {
        console.log("✅ No active polls to recover");
        return;
      }

      const io = getIo();

      for (const poll of activePolls) {
        const timeElapsed = Math.floor(
          (Date.now() - new Date(poll.createdAt).getTime()) / 1000,
        );
        const timeRemaining = Math.max(0, poll.duration - timeElapsed);

        if (timeRemaining <= 0) {
          // Poll has already expired while server was down — end it now
          await PollService.endPoll(poll._id.toString());
          console.log(`⏰ Expired poll ended on recovery: ${poll._id}`);
        } else {
          // Restart timer for remaining time
          startPollTimer(poll._id.toString(), timeRemaining, io, async () => {
            await PollService.endPoll(poll._id.toString());
          });
          console.log(
            `🔄 Recovered poll timer: ${poll._id} (${timeRemaining}s remaining)`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Error recovering active polls:", error);
    }
  }
}
