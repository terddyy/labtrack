import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, listNotifications, listTicketThreads, type MobileTicketThread } from "@/lib/labtrack-api";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

const realtimeTargets = [{ table: "ticket_threads" }, { table: "ticket_messages" }, { table: "notifications" }] as const;

export function useTicketThreads() {
  const [threads, setThreads] = useState<MobileTicketThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const [nextThreads, notifications] = await Promise.all([listTicketThreads(), listNotifications({ limit: 100 })]);
      const unreadByThread = notifications.reduce((counts, notification) => {
        if (!notification.readAt && notification.relatedThreadId) {
          counts.set(notification.relatedThreadId, (counts.get(notification.relatedThreadId) ?? 0) + 1);
        }
        return counts;
      }, new Map<string, number>());

      if (requestIdRef.current === requestId) {
        setThreads(nextThreads.map((thread) => ({ ...thread, unreadCount: unreadByThread.get(thread.id) ?? 0 })));
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

  useRealtimeRefresh("mobile-message-list", realtimeTargets, refresh);

  return { error, hasLoaded, isLoading, refresh, threads };
}
