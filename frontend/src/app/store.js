import { configureStore } from "@reduxjs/toolkit";
import pollReducer from "../features/poll/pollSlice";

/**
 * Redux Store Configuration
 * Manages global state for the Live Polling System
 */
const store = configureStore({
  reducer: {
    poll: pollReducer,
  },
});

export default store;
