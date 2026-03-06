import express from "express";
import {
  createPoll,
  getActivePoll,
  getPollById,
  getAllPolls,
  endPoll,
  checkStudentVoted,
  submitVote,
} from "../controllers/pollController.js";

const router = express.Router();

// Poll routes
router.post("/create", createPoll);
router.get("/active", getActivePoll);
router.get("/all", getAllPolls);
router.get("/:id", getPollById);
router.post("/:id/end", endPoll);
router.post("/:id/vote", submitVote);
router.get("/:id/check-vote/:studentName", checkStudentVoted);

export default router;
