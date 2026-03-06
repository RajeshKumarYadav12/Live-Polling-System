import express from "express";
import crypto from "crypto";
import StudentSession from "../models/StudentSession.js";

const router = express.Router();

// POST /api/sessions — create a new student session, return token
router.post("/", async (req, res) => {
  try {
    const { studentName } = req.body;
    if (!studentName || !studentName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "studentName is required" });
    }

    const sessionToken = crypto.randomUUID();
    await StudentSession.create({
      sessionToken,
      studentName: studentName.trim(),
    });

    return res.json({ success: true, sessionToken });
  } catch (error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/sessions/:token — retrieve student name for a session token
router.get("/:token", async (req, res) => {
  try {
    const session = await StudentSession.findOne({
      sessionToken: req.params.token,
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found or expired" });
    }

    return res.json({ success: true, studentName: session.studentName });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/sessions/:token — clear session on logout/kick
router.delete("/:token", async (req, res) => {
  try {
    await StudentSession.deleteOne({ sessionToken: req.params.token });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
