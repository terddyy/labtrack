import {
  bookingRequestSchema,
  createBookingRange,
  createDefaultBookingRange,
  defectReportSchema,
  isFutureBookingRange,
  parseQrPayload,
  validateDefectPhotoCandidates
} from "@labtrack/shared";
import { useEffect, useMemo, useState } from "react";
import {
  createBorrowing,
  createDefectReport,
  formatApiError,
  resolveAssetByPayload,
  uploadDefectPhoto,
  type MobileAsset,
  type MobileDefectPhotoDraft
} from "@/lib/labtrack-api";

const SAME_DAY_DURATION_MINUTES = 90;

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
  const [defectPhotos, setDefectPhotos] = useState<MobileDefectPhotoDraft[]>([]);
  const [pendingDefectPhotoReportId, setPendingDefectPhotoReportId] = useState<string | null>(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<string | null>(null);
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

  async function submitSameDayBorrowing() {
    if (!asset) {
      return;
    }

    if (asset.status !== "available") {
      setBookingMessage("This asset is not currently available for borrowing requests.");
      return;
    }

    // ponytail: start ~1 min ahead so zeroed seconds are not in the past; upgrade: server clock sync
    const startAt = new Date(Date.now() + 60_000);
    const range = createBookingRange(startAt, SAME_DAY_DURATION_MINUTES);
    const input = {
      assetId: asset.id,
      requestedStartAt: range.requestedStartAt,
      requestedEndAt: range.requestedEndAt,
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
      setBookingPurpose("");
      setBookingRange(createDefaultBookingRange(new Date()));
      setBookingMessage("Same-day borrowing request submitted.");
    } catch (submitError) {
      setBookingMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function submitDefect() {
    if (pendingDefectPhotoReportId) {
      setIsSubmittingDefect(true);
      setDefectMessage(null);
      try {
        await uploadSelectedDefectPhotos(pendingDefectPhotoReportId, defectPhotos, true);
      } finally {
        setIsSubmittingDefect(false);
      }
      return;
    }

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
      const [createdReport] = await createDefectReport(validation.data);

      if (!createdReport) {
        throw new Error("Defect reporting did not return the new report.");
      }

      if (defectPhotos.length) {
        await uploadSelectedDefectPhotos(createdReport.defect_report_id, defectPhotos, false);
      } else {
        completeDefectSubmission("Defect report submitted without photos.");
      }
    } catch (submitError) {
      setDefectMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingDefect(false);
    }
  }

  function addDefectPhotos(photos: MobileDefectPhotoDraft[]) {
    const uniquePhotos = photos.filter((photo) => !defectPhotos.some((current) => current.uri === photo.uri));
    const validationError = validateDefectPhotoCandidates([...defectPhotos, ...uniquePhotos]);

    if (validationError) {
      setDefectMessage(validationError);
      return false;
    }

    setDefectPhotos((current) => [...current, ...uniquePhotos]);
    setDefectMessage(null);
    return true;
  }

  function removeDefectPhoto(photoId: string) {
    setDefectPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setDefectMessage(null);
  }

  async function uploadSelectedDefectPhotos(reportId: string, photos: MobileDefectPhotoDraft[], isRetry: boolean) {
    const failed: MobileDefectPhotoDraft[] = [];

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      if (!photo) continue;

      setPhotoUploadProgress(`Uploading photo ${index + 1} of ${photos.length}…`);
      try {
        await uploadDefectPhoto(reportId, photo);
      } catch {
        failed.push(photo);
      }
    }

    setPhotoUploadProgress(null);

    if (failed.length) {
      setPendingDefectPhotoReportId(reportId);
      setDefectPhotos(failed);
      setDefectMessage(
        `Defect report submitted, but ${failed.length} ${failed.length === 1 ? "photo" : "photos"} failed to upload. Tap Retry photo upload.`
      );
      return;
    }

    completeDefectSubmission(isRetry ? "Defect photos uploaded successfully." : "Defect report and photos submitted.");
  }

  function completeDefectSubmission(message: string) {
    setDefectForm({ title: "", description: "" });
    setDefectPhotos([]);
    setPendingDefectPhotoReportId(null);
    setPhotoUploadProgress(null);
    setDefectMessage(message);
  }

  return {
    asset,
    bookingMessage,
    bookingPurpose,
    bookingRange,
    bookingValidationNow,
    defectForm,
    defectMessage,
    defectPhotos,
    error,
    isAvailable: asset?.status === "available",
    isBookingRangeValid: isFutureBookingRange(bookingRange, bookingValidationNow),
    isLoading,
    isSubmittingBooking,
    isSubmittingDefect,
    hasPendingDefectPhotoUploads: Boolean(pendingDefectPhotoReportId),
    photoUploadProgress,
    addDefectPhotos,
    removeDefectPhoto,
    setBookingPurpose,
    setBookingRange,
    setDefectForm,
    submitBooking,
    submitDefect,
    submitSameDayBorrowing
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
