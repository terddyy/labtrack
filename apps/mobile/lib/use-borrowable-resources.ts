import { createBookingRange, getBorrowSubmitEligibility, type BookingRange, type ResourceType } from "@labtrack/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createBorrowing,
  formatApiError,
  listBorrowableResources,
  listResourceSchedule,
  type MobileBorrowingResource,
  type MobileResourceScheduleEntry
} from "@/lib/labtrack-api";

type ResourceFilter = "all" | ResourceType;

const QUERY_DEBOUNCE_MS = 300;

export function useBorrowableResources(options?: { onSubmitted?: () => void | Promise<void> }) {
  const onSubmitted = options?.onSubmitted;
  const [range, setRange] = useState<BookingRange>(() => createBookingRange(new Date(Date.now() + 60 * 60 * 1000), 90));
  const [validationNow, setValidationNow] = useState(() => new Date());
  const [filter, setFilter] = useState<ResourceFilter>("asset");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [purpose, setPurpose] = useState("");
  const [resources, setResources] = useState<MobileBorrowingResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<MobileBorrowingResource | null>(null);
  const [schedule, setSchedule] = useState<MobileResourceScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const resourceType = filter === "all" ? null : filter;
  const submitEligibility = useMemo(() => {
    if (!selectedResource) {
      return { canSubmit: false, reason: "Select a resource to reserve." as string | undefined };
    }

    return getBorrowSubmitEligibility({
      availability: selectedResource.availability,
      now: validationNow,
      purpose,
      range
    });
  }, [purpose, range, selectedResource, validationNow]);

  const canSubmit = submitEligibility.canSubmit;
  const submitBlockReason = selectedResource && !canSubmit ? submitEligibility.reason ?? null : null;

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextResources = await listBorrowableResources({
        endAt: range.requestedEndAt,
        query: debouncedQuery,
        resourceType,
        startAt: range.requestedStartAt
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setResources(nextResources);
      setSelectedResource((current) => {
        if (current && nextResources.some((resource) => resource.id === current.id && resource.resourceType === current.resourceType)) {
          return nextResources.find((resource) => resource.id === current.id && resource.resourceType === current.resourceType) ?? current;
        }

        return null;
      });
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
  }, [debouncedQuery, range.requestedEndAt, range.requestedStartAt, resourceType]);

  const refreshSchedule = useCallback(async (resource: MobileBorrowingResource | null = selectedResource) => {
    if (!resource) {
      setSchedule([]);
      return;
    }

    try {
      const from = range.startAt.toISOString();
      const to = new Date(range.startAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const nextSchedule = await listResourceSchedule({
        from,
        resourceId: resource.id,
        resourceType: resource.resourceType,
        to
      });

      setSchedule(nextSchedule);
    } catch (loadError) {
      setError(formatApiError(loadError));
    }
  }, [range.startAt, selectedResource]);

  const selectResource = useCallback((resource: MobileBorrowingResource) => {
    setSelectedResource(resource);
    setMessage(null);
    void refreshSchedule(resource);
  }, [refreshSchedule]);

  const submit = useCallback(async () => {
    if (!selectedResource || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createBorrowing({
        purpose: purpose.trim(),
        requestedEndAt: range.requestedEndAt,
        requestedStartAt: range.requestedStartAt,
        resourceId: selectedResource.id,
        resourceType: selectedResource.resourceType
      });
      setPurpose("");
      setSubmittedBookingId(created[0]?.id ?? null);
      setMessage("Borrowing request submitted.");
      await refresh();
      await refreshSchedule(selectedResource);
      await onSubmitted?.();
    } catch (submitError) {
      setError(formatApiError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, onSubmitted, purpose, range.requestedEndAt, range.requestedStartAt, refresh, refreshSchedule, selectedResource]);

  const startNewRequest = useCallback(() => {
    setSubmittedBookingId(null);
    setSelectedResource(null);
    setSchedule([]);
    setPurpose("");
    setMessage(null);
    setError(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedResource(null);
    setSchedule([]);
  }, []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      void refreshRef.current();

      return () => {
        requestIdRef.current += 1;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const intervalId = setInterval(() => setValidationNow(new Date()), 30_000);
      return () => clearInterval(intervalId);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      void refreshSchedule();
    }, [refreshSchedule])
  );

  useEffect(() => {
    void refresh();
  }, [debouncedQuery, range.requestedEndAt, range.requestedStartAt, resourceType, refresh]);

  return useMemo(() => ({
    canSubmit,
    clearSelection,
    error,
    filter,
    hasLoaded,
    isLoading,
    isSubmitting,
    message,
    purpose,
    query,
    range,
    refresh,
    resources,
    schedule,
    selectResource,
    selectedResource,
    setFilter,
    setPurpose,
    setQuery,
    setRange,
    startNewRequest,
    submit,
    submitBlockReason,
    submittedBookingId,
    validationNow
  }), [
    canSubmit,
    clearSelection,
    error,
    filter,
    hasLoaded,
    isLoading,
    isSubmitting,
    message,
    purpose,
    query,
    range,
    refresh,
    resources,
    schedule,
    selectResource,
    selectedResource,
    startNewRequest,
    submit,
    submitBlockReason,
    submittedBookingId,
    validationNow
  ]);
}
