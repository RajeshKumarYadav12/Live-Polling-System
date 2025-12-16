import Poll from "../models/Poll.js";
import Response from "../models/Response.js";

/**
 * @desc    Create a new poll
 * @route   POST /api/polls/create
 * @access  Public (Teacher)
 */
export const createPoll = async (req, res) => {
  try {
    const { question, options, duration } = req.body;

    // Validation
    if (
      !question ||
      !options ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question and at least 2 options",
      });
    }

    // Check if there's already an active poll
    const activePoll = await Poll.findOne({ status: "active" });
    if (activePoll) {
      return res.status(400).json({
        success: false,
        message:
          "A poll is already active. Please end it before creating a new one.",
      });
    }

    // Create poll
    const poll = new Poll({
      question,
      options: options.map((opt) => ({ text: opt, votes: 0 })),
      duration: duration || 60,
      status: "active",
    });

    await poll.save();

    res.status(201).json({
      success: true,
      data: poll,
    });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get active poll
 * @route   GET /api/polls/active
 * @access  Public
 */
export const getActivePoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({ status: "active" });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "No active poll found",
      });
    }

    const responses = await Response.countDocuments({ pollId: poll._id });

    res.status(200).json({
      success: true,
      data: {
        ...poll.toObject(),
        totalResponses: responses,
      },
    });
  } catch (error) {
    console.error("Error fetching active poll:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get poll by ID
 * @route   GET /api/polls/:id
 * @access  Public
 */
export const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
      });
    }

    const responses = await Response.countDocuments({ pollId: poll._id });

    res.status(200).json({
      success: true,
      data: {
        ...poll.toObject(),
        totalResponses: responses,
      },
    });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get all polls (for history)
 * @route   GET /api/polls/all
 * @access  Public
 */
export const getAllPolls = async (req, res) => {
  try {
    // Only get ended polls for history
    const polls = await Poll.find({ status: "ended" })
      .sort({ createdAt: -1 })
      .limit(50);

    // Get response counts for each poll
    const pollsWithResponses = await Promise.all(
      polls.map(async (poll) => {
        const responses = await Response.countDocuments({ pollId: poll._id });
        return {
          ...poll.toObject(),
          totalResponses: responses,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: pollsWithResponses,
    });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    End a poll
 * @route   POST /api/polls/:id/end
 * @access  Public (Teacher)
 */
export const endPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
      });
    }

    poll.status = "ended";
    poll.endedAt = new Date();
    await poll.save();

    res.status(200).json({
      success: true,
      data: poll,
    });
  } catch (error) {
    console.error("Error ending poll:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Check if student has voted
 * @route   GET /api/polls/:id/check-vote/:studentName
 * @access  Public
 */
export const checkStudentVoted = async (req, res) => {
  try {
    const { id, studentName } = req.params;

    const response = await Response.findOne({
      pollId: id,
      studentName: studentName,
    });

    res.status(200).json({
      success: true,
      hasVoted: !!response,
    });
  } catch (error) {
    console.error("Error checking vote:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
