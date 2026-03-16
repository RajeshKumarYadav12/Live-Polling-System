import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Custom hook for poll history with caching
 *
 * Features:
 * - Automatic deduplication of parallel requests
 * - Cache with configurable TTL (time-to-live)
 * - Eager loading support
 * - Error handling
 *
 * Usage:
 *   const { history, isLoading, error, refetch } = usePollHistory({
 *     cacheTTL: 30000, // 30 seconds
 *     autoLoad: true
 *   });
 */
export function usePollHistory({ cacheTTL = 30000, autoLoad = true } = {}) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache data with timestamp
  const cacheRef = useRef({
    data: null,
    timestamp: 0,
  });

  // In-flight request tracking to prevent duplicate requests
  const requestRef = useRef(null);

  const isCacheValid = useCallback(() => {
    const cache = cacheRef.current;
    if (!cache.data) return false;
    const age = Date.now() - cache.timestamp;
    return age < cacheTTL;
  }, [cacheTTL]);

  const refetch = useCallback(
    async (forceRefresh = false) => {
      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && isCacheValid()) {
        setHistory(cacheRef.current.data);
        return cacheRef.current.data;
      }

      // Deduplicate in-flight requests
      if (requestRef.current) {
        return requestRef.current;
      }

      setIsLoading(true);
      setError(null);

      const requestPromise = (async () => {
        try {
          const response = await fetch(`${API_URL}/api/polls/all`);
          const data = await response.json();

          if (data.success && Array.isArray(data.data)) {
            // Update cache
            cacheRef.current = {
              data: data.data,
              timestamp: Date.now(),
            };
            setHistory(data.data);
            return data.data;
          } else {
            throw new Error(data.message || "Failed to load poll history");
          }
        } catch (err) {
          console.error("Error loading poll history:", err);
          setError(err.message);
          toast.error("Failed to load poll history", { autoClose: 2000 });
          throw err;
        } finally {
          setIsLoading(false);
          requestRef.current = null;
        }
      })();

      requestRef.current = requestPromise;
      return requestPromise;
    },
    [isCacheValid],
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refetch();
    }
  }, [autoLoad, refetch]);

  return {
    history,
    isLoading,
    error,
    refetch,
    clearCache: () => {
      cacheRef.current = { data: null, timestamp: 0 };
      setHistory([]);
      setError(null);
    },
  };
}
