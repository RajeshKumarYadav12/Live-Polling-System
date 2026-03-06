import mongoose from "mongoose";

/**
 * Poll Schema
 * Stores poll questions with options and voting results
 */
const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  options: [
    {
      text: {
        type: String,
        required: true,
      },
      votes: {
        type: Number,
        default: 0,
      },
    },
  ],
  duration: {
    type: Number,
    default: 60, // Default 60 seconds
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "ended"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
});

// Index for quick retrieval of active polls
pollSchema.index({ status: 1, createdAt: -1 });

const Poll = mongoose.model("Poll", pollSchema);

export default Poll;
