import mongoose from "mongoose";

const StudentSessionSchema = new mongoose.Schema(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-expire sessions after 24 hours
StudentSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("StudentSession", StudentSessionSchema);
