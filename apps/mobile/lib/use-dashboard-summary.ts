import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, getDashboardSummary } from "@/lib/labtrack-api";

export type DashboardSummary = {
  availableAssets: number;
  bookings: number;
  checkedOutAssets: number;
  error: string | null;
  isLoading: boolean;
  labCount: number;
  openDefects: number;
  pendingBookings: number;
  repairAssets: number;
  threads: number;
  totalAssets: number;
  unreadNotifications: number;
};

export const emptyDashboardSummary: DashboardSummary = {
  availableAssets: 0,
  bookings: 0,
  checkedOutAssets: 0,
  error: null,
  isLoading: false,
  labCount: 0,
  openDefects: 0,
  pendingBookings: 0,
  repairAssets: 0,
  threads: 0,
  totalAssets: 0,
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
        availableAssets: counts.availableAssets,
        bookings: counts.bookings,
        checkedOutAssets: counts.checkedOutAssets,
        error: null,
        isLoading: false,
        labCount: counts.labCount,
        openDefects: counts.openDefects,
        pendingBookings: counts.pendingBookings,
        repairAssets: counts.repairAssets,
        threads: counts.threads,
        totalAssets: counts.totalAssets,
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
