import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { cancelBooking, formatApiError, listMyBookings, type MobileBooking } from "@/lib/labtrack-api";

export function useBookings() {
  const [bookings, setBookings] = useState<MobileBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextBookings = await listMyBookings();

      if (requestIdRef.current === requestId) {
        setBookings(nextBookings);
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

  const cancel = useCallback(async (id: string) => {
    setError(null);
    setCancellingId(id);

    try {
      await cancelBooking(id);
      await refresh();
    } catch (cancelError) {
      setError(formatApiError(cancelError));
    } finally {
      setCancellingId(null);
    }
  }, [refresh]);

  return { bookings, cancel, cancellingId, error, hasLoaded, isLoading, refresh };
}
