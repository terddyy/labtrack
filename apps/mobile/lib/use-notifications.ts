import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, listNotifications, markNotificationRead, type MobileNotification } from "@/lib/labtrack-api";

export function useNotifications() {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextNotifications = await listNotifications();

      if (requestIdRef.current === requestId) {
        setNotifications(nextNotifications);
      }
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(formatApiError(loadError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setHasLoaded(true);
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

  const markRead = useCallback(async (id: string) => {
    setError(null);
    setReadingId(id);

    try {
      await markNotificationRead(id);
      await refresh();
    } catch (readError) {
      setError(formatApiError(readError));
    } finally {
      setReadingId(null);
    }
  }, [refresh]);

  return { error, hasLoaded, isLoading, markRead, notifications, readingId, refresh };
}
