import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, getDashboardSummary } from "@/lib/labtrack-api";

export type DashboardSummary = {
  bookings: number;
  error: string | null;
  isLoading: boolean;
  openDefects: number;
  pendingBookings: number;
  threads: number;
  unreadNotifications: number;
};

export const emptyDashboardSummary: DashboardSummary = {
  bookings: 0,
  error: null,
  isLoading: false,
  openDefects: 0,
  pendingBookings: 0,
  threads: 0,
  unreadNotifications: 0
};

export function useDashboardSummary(isEnabled: boolean) {
  const [summary, setSummary] = useState<DashboardSummary>(emptyDashboardSummary);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSummary((current) => ({ ...current, error: null, isLoading: true }));

    try {
      const counts = await getDashboardSummary();

      if (requestIdRef.current !== requestId) {
        return;
      }

      setSummary({
        bookings: counts.bookings,
        error: null,
        isLoading: false,
        openDefects: counts.openDefects,
        pendingBookings: counts.pendingBookings,
        threads: counts.threads,
        unreadNotifications: counts.unreadNotifications
      });
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setSummary({ ...emptyDashboardSummary, error: formatApiError(error) });
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isEnabled) {
        void refresh();
      } else {
        requestIdRef.current += 1;
        setSummary(emptyDashboardSummary);
      }

      return () => {
        requestIdRef.current += 1;
      };
    }, [isEnabled, refresh])
  );

  return { refresh, summary };
}
