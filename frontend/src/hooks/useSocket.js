/**
 * useSocket — Custom hook
 * Encapsulates all Socket.io event listener setup and teardown for a given role.
 * Components remain UI-only; all real-time logic lives here.
 *
 * Usage:
 *   const { isConnected } = useSocket({ role: 'student', enabled: hasJoined, studentName, onKicked });
 *   const { isConnected } = useSocket({ role: 'teacher', enabled: true, onPollEnded: loadHistory });
 */

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import socketService from "../services/socket";
import {
  setCurrentPoll,
  clearCurrentPoll,
  updatePollResults,
  pollEnded,
  setHasVoted,
  setSelectedOption,
  updateTimer,
} from "../features/poll/pollSlice";

const API_URL = import.meta.env.VITE_API_URL || "";

export function useSocket({
  role,
  enabled = true,
  studentName,
  onKicked,
  onPollEnded,
} = {}) {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(
    () => !!socketService.socket?.connected,
  );

  // Keep studentName in a ref so async callbacks always see the latest value
  const studentNameRef = useRef(studentName);
  useEffect(() => {
    studentNameRef.current = studentName;
  }, [studentName]);

  // Keep callback refs stable
  const onKickedRef = useRef(onKicked);
  const onPollEndedRef = useRef(onPollEnded);
  useEffect(() => {
    onKickedRef.current = onKicked;
  }, [onKicked]);
  useEffect(() => {
    onPollEndedRef.current = onPollEnded;
  }, [onPollEnded]);

  // ── All socket listeners (connection + poll) — active when enabled = true ───
  // NOTE: we call socketService.connect() at the top of this effect so the
  // socket object is guaranteed to exist before we attach any listeners.
  // A separate "connection-listeners" effect with [socketService.socket] as
  // dependency is NOT used because socketService.socket is a class-property
  // mutation that React cannot observe, making it an unreliable dependency.
  useEffect(() => {
    if (!enabled) return;

    // Ensure the socket is created (idempotent — no-op if already connected)
    socketService.connect();

    // ── Connection status listeners ─────────────────────────────────────────
    const handleConnect = () => {
      setIsConnected(true);
      toast.dismiss("conn-error");
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => {
      setIsConnected(false);
      toast.error("Connection lost. Reconnecting…", {
        toastId: "conn-error",
        autoClose: false,
      });
    };
    const handleReconnect = () => {
      setIsConnected(true);
      toast.dismiss("conn-error");
      toast.success("Reconnected!", { autoClose: 2000 });
    };

    socketService.socket.on("connect", handleConnect);
    socketService.socket.on("disconnect", handleDisconnect);
    socketService.onConnectError(handleConnectError);
    socketService.onReconnect(handleReconnect);

    // ── pollCreated ──────────────────────────────────────────────────────────
    socketService.onPollCreated((data) => {
      dispatch(
        setCurrentPoll({
          pollId: data.pollId,
          question: data.question,
          options: data.options,
          duration: data.duration,
          timeRemaining: data.duration,
          results: data.options.map((opt) => ({ text: opt, votes: 0 })),
          totalResponses: 0,
          status: "active",
        }),
      );
      if (role === "student") {
        dispatch(setHasVoted(false));
        dispatch(setSelectedOption(null));
        toast.info("🗳️ New poll is now live!");
      } else {
        toast.success("✅ Poll created and broadcasted to all students!");
      }
    });

    // ── voteSubmitted ─────────────────────────────────────────────────────────
    socketService.onVoteSubmitted((data) => {
      dispatch(
        updatePollResults({
          pollId: data.pollId,
          results: data.results,
          totalResponses: data.totalResponses,
        }),
      );
    });

    // ── timerUpdate (server-authoritative sync) ───────────────────────────────
    socketService.onTimerUpdate((data) => {
      dispatch(updateTimer(data.timeRemaining));
    });

    // ── pollEnded ─────────────────────────────────────────────────────────────
    socketService.onPollEnded((data) => {
      dispatch(
        pollEnded({
          results: data.results,
          totalResponses: data.totalResponses,
        }),
      );
      if (role === "student")
        toast.info("⏰ Poll has ended! Here are the results.");
      if (role === "teacher") toast.info("⏰ Poll has ended!");
      onPollEndedRef.current?.();
    });

    // ── activePoll (state recovery after refresh) ─────────────────────────────
    socketService.onActivePoll(async (data) => {
      dispatch(
        setCurrentPoll({
          pollId: data.pollId,
          question: data.question,
          options: data.options,
          duration: data.duration,
          timeRemaining: data.timeRemaining,
          results: data.results,
          totalResponses: data.totalResponses,
          status: "active",
        }),
      );
      dispatch(updateTimer(data.timeRemaining));

      // Student only: verify vote status from DB so refresh doesn't allow re-vote
      if (role === "student") {
        const name = studentNameRef.current;
        if (name) {
          try {
            const res = await fetch(
              `${API_URL}/api/polls/${data.pollId}/check-vote/${encodeURIComponent(name)}`,
            );
            const result = await res.json();
            if (result.success && result.hasVoted) dispatch(setHasVoted(true));
          } catch {
            /* non-fatal */
          }
        }
      }
    });

    // ── noActivePoll ──────────────────────────────────────────────────────────
    socketService.onNoActivePoll(() => dispatch(clearCurrentPoll()));

    // ── role-specific error events ────────────────────────────────────────────
    if (role === "student") {
      socketService.onVoteError((data) =>
        toast.error(data.message || "Failed to submit vote"),
      );
      socketService.onRemovedFromSession(() => onKickedRef.current?.());
    }
    if (role === "teacher") {
      socketService.onPollError((data) =>
        toast.error(data.message || "Poll error occurred"),
      );
    }

    return () => {
      socketService.socket?.off("connect", handleConnect);
      socketService.socket?.off("disconnect", handleDisconnect);
      socketService.socket?.off("connect_error", handleConnectError);
      socketService.socket?.io?.off("reconnect", handleReconnect);
      socketService.removeAllListeners();
    };
  }, [enabled, role, dispatch]);

  return { isConnected };
}
