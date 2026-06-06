import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, listTicketMessages, sendTicketMessage, type MobileTicketMessage } from "@/lib/labtrack-api";

export function useTicketThread(threadId?: string) {
  const [messages, setMessages] = useState<MobileTicketMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!threadId) {
      setMessages([]);
      setError("Ticket thread is missing or invalid.");
      setHasLoaded(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextMessages = await listTicketMessages(threadId);

      if (requestIdRef.current === requestId) {
        setMessages(nextMessages);
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
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      return () => {
        requestIdRef.current += 1;
      };
    }, [refresh])
  );

  const send = useCallback(async () => {
    if (!threadId) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await sendTicketMessage(threadId, body.trim());
      setBody("");
      await refresh();
    } catch (sendError) {
      setError(formatApiError(sendError));
    } finally {
      setIsSending(false);
    }
  }, [body, refresh, threadId]);

  return { body, error, hasLoaded, isLoading, isSending, messages, refresh, send, setBody };
}
