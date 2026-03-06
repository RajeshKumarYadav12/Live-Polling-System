import mongoose from "mongoose";

/**
 * Response Schema
 * Stores individual student responses to polls
 */
const responseSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Poll",
    required: true,
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
  },
  optionIndex: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one vote per student per poll
responseSchema.index({ pollId: 1, studentName: 1 }, { unique: true });

const Response = mongoose.model("Response", responseSchema);

export default Response;
