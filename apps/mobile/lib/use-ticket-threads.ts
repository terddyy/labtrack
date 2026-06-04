import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, listTicketThreads, type MobileTicketThread } from "@/lib/labtrack-api";

export function useTicketThreads() {
  const [threads, setThreads] = useState<MobileTicketThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextThreads = await listTicketThreads();

      if (requestIdRef.current === requestId) {
        setThreads(nextThreads);
      }
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(formatApiError(loadError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      return () => {
        requestIdRef.current += 1;
      };
    }, [refresh])
  );

  return { error, isLoading, refresh, threads };
}
