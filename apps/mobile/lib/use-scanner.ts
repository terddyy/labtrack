import { parseQrPayload } from "@labtrack/shared";
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

const INVALID_QR_MESSAGE = "This QR code is not a valid LABTRACK asset code.";
const INVALID_SCAN_FEEDBACK_MS = 1200;

export function useScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanLockedRef = useRef(false);
  const lastInvalidScanAtRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      scanLockedRef.current = false;
      lastInvalidScanAtRef.current = 0;
      setError(null);
      setIsLocked(false);
      setIsScreenFocused(true);

      return () => {
        scanLockedRef.current = true;
        setIsScreenFocused(false);
      };
    }, [])
  );

  const handleScan = useCallback((result: BarcodeScanningResult) => {
    if (scanLockedRef.current) {
      return;
    }

    if (!parseQrPayload(result.data)) {
      const now = Date.now();

      if (now - lastInvalidScanAtRef.current > INVALID_SCAN_FEEDBACK_MS) {
        lastInvalidScanAtRef.current = now;
        setError(INVALID_QR_MESSAGE);
      }

      return;
    }

    scanLockedRef.current = true;
    setError(null);
    setIsLocked(true);
    router.push({ pathname: "/asset/[payload]", params: { payload: encodeURIComponent(result.data) } });
  }, []);

  return {
    error,
    handleScan,
    isCameraActive: isScreenFocused && !isLocked,
    isLocked,
    permission,
    requestPermission
  };
}
