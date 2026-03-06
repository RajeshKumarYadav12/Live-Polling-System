/**
 * Poll Controller
 * Thin HTTP layer — validates input and delegates all logic to PollService.
 * No business logic lives here.
 */

import { PollService } from "../services/PollService.js";
import Poll from "../models/Poll.js";
import Response from "../models/Response.js";

// POST /api/polls/create
export const createPoll = async (req, res) => {
  try {
    const { question, options, duration } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Provide a question and at least 2 options",
        });
    }
    const poll = await PollService.createPoll(question, options, duration);
    res.status(201).json({ success: true, data: poll });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/polls/active
// Returns DB-native format (poll._id, options as [{text,votes}]) plus
// server-authoritative timeRemaining for resilient state recovery on refresh.
export const getActivePoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({ status: "active" });
    if (!poll) {
      return res
        .status(404)
        .json({ success: false, message: "No active poll found" });
    }
    const responses = await Response.countDocuments({ pollId: poll._id });
    const timeElapsed = Math.floor(
      (Date.now() - new Date(poll.createdAt).getTime()) / 1000,
    );
    const timeRemaining = Math.max(0, poll.duration - timeElapsed);
    res.status(200).json({
      success: true,
      data: { ...poll.toObject(), totalResponses: responses, timeRemaining },
    });
  } catch (error) {
    console.error("Error fetching active poll:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/polls/all
export const getAllPolls = async (req, res) => {
  try {
    const polls = await PollService.getPollHistory();
    res.status(200).json({ success: true, data: polls });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/polls/:id
export const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res
        .status(404)
        .json({ success: false, message: "Poll not found" });
    }
    const responses = await Response.countDocuments({ pollId: poll._id });
    res
      .status(200)
      .json({
        success: true,
        data: { ...poll.toObject(), totalResponses: responses },
      });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/polls/:id/end
// Ends the poll, clears the server timer, and broadcasts pollEnded via Socket.io.
export const endPoll = async (req, res) => {
  try {
    const poll = await PollService.endPoll(req.params.id);
    res.status(200).json({ success: true, data: poll });
  } catch (error) {
    console.error("Error ending poll:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/polls/:id/vote
export const submitVote = async (req, res) => {
  try {
    const { optionIndex, studentName } = req.body;
    if (optionIndex === undefined || !studentName) {
      return res
        .status(400)
        .json({
          success: false,
          message: "optionIndex and studentName are required",
        });
    }
    const result = await PollService.submitVote(
      req.params.id,
      optionIndex,
      studentName,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Vote submitted successfully",
        data: result,
      });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/polls/:id/check-vote/:studentName
export const checkStudentVoted = async (req, res) => {
  try {
    const { id, studentName } = req.params;
    const hasVoted = await PollService.hasStudentVoted(id, studentName);
    res.status(200).json({ success: true, hasVoted });
  } catch (error) {
    console.error("Error checking vote:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
