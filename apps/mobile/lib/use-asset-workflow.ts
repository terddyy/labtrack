import { bookingRequestSchema, createDefaultBookingRange, defectReportSchema, isFutureBookingRange, parseQrPayload } from "@labtrack/shared";
import { useEffect, useMemo, useState } from "react";
import {
  createBorrowing,
  createDefectReport,
  formatApiError,
  resolveAssetByPayload,
  type MobileAsset
} from "@/lib/labtrack-api";

export function useAssetWorkflow(payload?: string) {
  const rawPayload = useMemo(() => safeDecode(payload ?? ""), [payload]);
  const parsed = useMemo(() => parseQrPayload(rawPayload), [rawPayload]);
  const [asset, setAsset] = useState<MobileAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingPurpose, setBookingPurpose] = useState("");
  const [bookingRange, setBookingRange] = useState(() => createDefaultBookingRange());
  const [bookingValidationNow, setBookingValidationNow] = useState(() => new Date());
  const [defectForm, setDefectForm] = useState({ title: "", description: "" });
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [defectMessage, setDefectMessage] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => setBookingValidationNow(new Date()), 30_000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAsset() {
      if (!parsed) {
        setAsset(null);
        setIsLoading(false);
        setError("This QR code is not a valid LABTRACK asset code.");
        return;
      }

      setAsset(null);
      setIsLoading(true);
      setError(null);

      try {
        const nextAsset = await resolveAssetByPayload(rawPayload);

        if (!isMounted) {
          return;
        }

        setAsset(nextAsset);
        setError(nextAsset ? null : "The scanned code is inactive, regenerated, or outside the asset register.");
      } catch (loadError) {
        if (isMounted) {
          setAsset(null);
          setError(formatApiError(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAsset();

    return () => {
      isMounted = false;
    };
  }, [parsed, rawPayload]);

  async function submitBooking() {
    if (!asset) {
      return;
    }

    if (asset.status !== "available") {
      setBookingMessage("This asset is not currently available for borrowing requests.");
      return;
    }

    const validationNow = new Date();
    setBookingValidationNow(validationNow);

    if (!isFutureBookingRange(bookingRange, validationNow)) {
      setBookingMessage("Choose a start time later than now.");
      return;
    }

    const input = {
      assetId: asset.id,
      requestedStartAt: bookingRange.requestedStartAt,
      requestedEndAt: bookingRange.requestedEndAt,
      purpose: bookingPurpose.trim()
    };
    const validation = bookingRequestSchema.safeParse(input);

    if (!validation.success) {
      setBookingMessage(validation.error.issues[0]?.message ?? "Borrow request is invalid.");
      return;
    }

    setIsSubmittingBooking(true);
    setBookingMessage(null);

    try {
      await createBorrowing({
        purpose: validation.data.purpose,
        resourceId: asset.id,
        resourceType: "asset",
        requestedEndAt: validation.data.requestedEndAt,
        requestedStartAt: validation.data.requestedStartAt
      });
      const nextNow = new Date();
      setBookingPurpose("");
      setBookingRange(createDefaultBookingRange(nextNow));
      setBookingValidationNow(nextNow);
      setBookingMessage("Borrowing request submitted.");
    } catch (submitError) {
      setBookingMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function submitDefect() {
    if (!asset) {
      return;
    }

    const input = {
      assetId: asset.id,
      title: defectForm.title.trim(),
      description: defectForm.description.trim()
    };
    const validation = defectReportSchema.safeParse(input);

    if (!validation.success) {
      setDefectMessage(validation.error.issues[0]?.message ?? "Defect report is invalid.");
      return;
    }

    setIsSubmittingDefect(true);
    setDefectMessage(null);

    try {
      await createDefectReport(validation.data);
      setDefectForm({ title: "", description: "" });
      setDefectMessage("Defect report submitted.");
    } catch (submitError) {
      setDefectMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingDefect(false);
    }
  }

  return {
    asset,
    bookingMessage,
    bookingPurpose,
    bookingRange,
    bookingValidationNow,
    defectForm,
    defectMessage,
    error,
    isAvailable: asset?.status === "available",
    isBookingRangeValid: isFutureBookingRange(bookingRange, bookingValidationNow),
    isLoading,
    isSubmittingBooking,
    isSubmittingDefect,
    setBookingPurpose,
    setBookingRange,
    setDefectForm,
    submitBooking,
    submitDefect
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
