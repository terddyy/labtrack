import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { formatApiError, listMyDefectReports, type MobileDefectReport } from "@/lib/labtrack-api";

export function useDefectReports() {
  const [reports, setReports] = useState<MobileDefectReport[]>([]);
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
      const nextReports = await listMyDefectReports();

      if (requestIdRef.current === requestId) {
        setReports(nextReports);
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

  return { error, hasLoaded, isLoading, refresh, reports };
}
