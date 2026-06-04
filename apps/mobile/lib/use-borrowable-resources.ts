import { createBookingRange, type BookingRange, type ResourceType } from "@labtrack/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  createBorrowing,
  formatApiError,
  listBorrowableResources,
  listResourceSchedule,
  type MobileBorrowingResource,
  type MobileResourceScheduleEntry
} from "@/lib/labtrack-api";

type ResourceFilter = "all" | ResourceType;

export function useBorrowableResources() {
  const [range, setRange] = useState<BookingRange>(() => createBookingRange(new Date(Date.now() + 60 * 60 * 1000), 90));
  const [validationNow, setValidationNow] = useState(() => new Date());
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState("");
  const [resources, setResources] = useState<MobileBorrowingResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<MobileBorrowingResource | null>(null);
  const [schedule, setSchedule] = useState<MobileResourceScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestIdRef = useRef(0);

  const resourceType = filter === "all" ? null : filter;
  const canSubmit = Boolean(selectedResource && purpose.trim().length >= 5 && selectedResource.availability !== "busy" && selectedResource.availability !== "unavailable");

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextResources = await listBorrowableResources({
        endAt: range.requestedEndAt,
        query,
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

        return nextResources[0] ?? null;
      });
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(formatApiError(loadError));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [query, range.requestedEndAt, range.requestedStartAt, resourceType]);

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
      await createBorrowing({
        purpose: purpose.trim(),
        requestedEndAt: range.requestedEndAt,
        requestedStartAt: range.requestedStartAt,
        resourceId: selectedResource.id,
        resourceType: selectedResource.resourceType
      });
      setPurpose("");
      setMessage("Borrowing request submitted.");
      await refresh();
      await refreshSchedule(selectedResource);
    } catch (submitError) {
      setError(formatApiError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, purpose, range.requestedEndAt, range.requestedStartAt, refresh, refreshSchedule, selectedResource]);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      return () => {
        requestIdRef.current += 1;
      };
    }, [refresh])
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

  return useMemo(() => ({
    canSubmit,
    error,
    filter,
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
    submit,
    validationNow
  }), [
    canSubmit,
    error,
    filter,
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
    submit,
    validationNow
  ]);
}
