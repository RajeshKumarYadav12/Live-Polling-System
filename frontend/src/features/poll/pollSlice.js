import { createSlice } from "@reduxjs/toolkit";

/**
 * Poll Slice - Manages poll state in Redux
 */
const initialState = {
  currentPoll: null,
  pollHistory: [],
  isLoading: false,
  error: null,
  studentName: localStorage.getItem("studentName") || "",
  hasVoted: false,
  selectedOption: null,
  timeRemaining: 0,
};

const pollSlice = createSlice({
  name: "poll",
  initialState,
  reducers: {
    // Set student name
    setStudentName: (state, action) => {
      state.studentName = action.payload;
      localStorage.setItem("studentName", action.payload);
    },

    // Set current active poll
    setCurrentPoll: (state, action) => {
      state.currentPoll = action.payload;
      state.timeRemaining =
        action.payload?.timeRemaining || action.payload?.duration || 0;
    },

    // Clear current poll
    clearCurrentPoll: (state) => {
      state.currentPoll = null;
      state.hasVoted = false;
      state.selectedOption = null;
      state.timeRemaining = 0;
    },

    // Update poll results
    updatePollResults: (state, action) => {
      if (
        state.currentPoll &&
        (!action.payload.pollId ||
          state.currentPoll.pollId === action.payload.pollId)
      ) {
        state.currentPoll.results = action.payload.results;
        state.currentPoll.totalResponses = action.payload.totalResponses;
      }
    },

    // Set poll history
    setPollHistory: (state, action) => {
      state.pollHistory = action.payload;
    },

    // Mark as voted
    setHasVoted: (state, action) => {
      state.hasVoted = action.payload;
    },

    // Set selected option
    setSelectedOption: (state, action) => {
      state.selectedOption = action.payload;
    },

    // Update timer
    updateTimer: (state, action) => {
      state.timeRemaining = action.payload;
    },

    // Decrement timer
    decrementTimer: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Poll ended
    pollEnded: (state, action) => {
      if (state.currentPoll) {
        state.currentPoll.status = "ended";
        state.currentPoll.results = action.payload.results;
        state.currentPoll.totalResponses = action.payload.totalResponses;
      }
      state.timeRemaining = 0;
    },
  },
});

export const {
  setStudentName,
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  setPollHistory,
  setHasVoted,
  setSelectedOption,
  updateTimer,
  decrementTimer,
  setLoading,
  setError,
  clearError,
  pollEnded,
} = pollSlice.actions;

export default pollSlice.reducer;
