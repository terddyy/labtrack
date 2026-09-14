import { formatStatusLabel, getBookingStatusTone, type AvailabilityState, type ResourceType } from "@labtrack/shared";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BookingSchedulePicker } from "@/components/booking-schedule-picker";
import { AppIcon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  ConsoleHeader,
  EmptyState,
  Field,
  HeaderIconButton,
  IconTile,
  ListRow,
  Notice,
  ScreenScrollView,
  SearchField,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  formatReference,
  type Tone
} from "@/components/ui";
import { WorkflowStepper, type WorkflowStep } from "@/components/workflow-stepper";
import { colors, fonts, spacing, typography } from "@/constants/theme";
import { useBookings } from "@/lib/use-bookings";
import { useBorrowableResources } from "@/lib/use-borrowable-resources";
import { useOnboardingFlag } from "@/lib/use-onboarding-flags";
import type { MobileBooking, MobileBorrowingResource, MobileResourceScheduleEntry } from "@/lib/labtrack-api";

const BORROW_STEPS: WorkflowStep[] = [
  { id: "schedule", label: "Schedule", caption: "Set when you need it and what type of item to borrow." },
  { id: "select", label: "Item", caption: "Pick an item that is free at your time and add a purpose." },
  { id: "wait", label: "Approval", caption: "A custodian reviews your request." },
  { id: "pickup", label: "Pick up", caption: "Scan the item QR at the custodian office." }
];

const typeOptions: Array<{ label: string; value: ResourceType }> = [
  { label: "Equipment", value: "asset" },
  { label: "Rooms", value: "room" }
];

const TRACKED_PICKUP_STATUSES = new Set(["approved", "checked_out", "returned"]);

const FALLBACK_RESOURCE_IMAGES = {
  default: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80",
  laptop: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
  room: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80",
  workspace: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80"
} as const;

export default function BorrowScreen() {
  const history = useBookings();
  const browser = useBorrowableResources({ onSubmitted: history.refresh });
  const borrowOnboarding = useOnboardingFlag("borrow");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isChoosingItem, setIsChoosingItem] = useState(false);
  const [trackedBookingId, setTrackedBookingId] = useState<string | null>(null);
  const visibleHistory = showAllHistory ? history.bookings : history.bookings.slice(0, 4);
  const pendingCount = history.bookings.filter((booking) => booking.status === "pending").length;
  const activeBookingId = browser.submittedBookingId ?? trackedBookingId;
  const activeBooking = activeBookingId ? history.bookings.find((booking) => booking.id === activeBookingId) ?? null : null;
  // Step 2 only offers resources that can actually be requested for the chosen time.
  const bookableResources = useMemo(
    () => browser.resources.filter((resource) => resource.availability === "available" || resource.availability === "tentative"),
    [browser.resources]
  );
  const selectedType: ResourceType = browser.filter === "room" ? "room" : "asset";
  const typeLabel = selectedType === "room" ? "rooms" : "equipment";
  const rangeLabel = formatRange(browser.range.requestedStartAt, browser.range.requestedEndAt);

  const step = useMemo(() => {
    if (activeBookingId) {
      return activeBooking && TRACKED_PICKUP_STATUSES.has(activeBooking.status) ? 3 : 2;
    }

    return isChoosingItem ? 1 : 0;
  }, [activeBooking, activeBookingId, isChoosingItem]);

  function startNewRequest() {
    browser.startNewRequest();
    setTrackedBookingId(null);
    setIsChoosingItem(false);
  }

  function trackBooking(bookingId: string) {
    browser.startNewRequest();
    setIsChoosingItem(false);
    setTrackedBookingId(bookingId);
  }

  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption={`${bookableResources.length} ${typeLabel} free for your time · ${pendingCount} awaiting approval`}
          eyebrow="Reserve · Equipment & rooms"
          right={(
            <HeaderIconButton
              accessibilityLabel="Refresh"
              icon="refresh"
              loading={browser.isLoading || history.isLoading}
              onPress={() => {
                browser.refresh();
                history.refresh();
              }}
            />
          )}
          title="Borrow"
        />
      )}
    >
      <WorkflowStepper
        currentStep={step}
        onDismiss={borrowOnboarding.isReady && !borrowOnboarding.hasSeen ? () => void borrowOnboarding.markSeen() : undefined}
        steps={BORROW_STEPS}
        title="Reservation workflow"
      />

      {browser.error ? <Notice tone="danger">{browser.error}</Notice> : null}

      {step === 0 ? (
        <Card style={styles.stepCard} tint="blue">
          <StepHeading caption="Choose when you need it first, then the type of item." index={1} title="Set schedule & item type" />
          <BookingSchedulePicker
            disabled={browser.isSubmitting}
            now={browser.validationNow}
            onRangeChange={browser.setRange}
            range={browser.range}
          />
          <View style={styles.fieldGroup}>
            <Text style={styles.cardEyebrow}>TYPE OF ITEM</Text>
            <SegmentedControl onChange={browser.setFilter} options={typeOptions} value={selectedType} />
          </View>
          <Notice tone={bookableResources.length ? "success" : "warning"}>
            {browser.isLoading && !browser.hasLoaded
              ? "Checking availability…"
              : `${bookableResources.length} ${typeLabel} available for ${rangeLabel}.`}
          </Notice>
          <Button
            disabled={browser.isLoading || !bookableResources.length}
            icon="chevron-forward"
            loading={browser.isLoading}
            onPress={() => setIsChoosingItem(true)}
          >
            {`Next: choose ${typeLabel}`}
          </Button>
        </Card>
      ) : null}

      {step === 1 ? (
        <>
          <Card style={styles.stepCard}>
            <StepHeading caption={`${selectedType === "room" ? "Rooms" : "Equipment"} · ${rangeLabel}`} index={2} title="Select item & purpose" />
            <Button
              fullWidth={false}
              onPress={() => {
                browser.clearSelection();
                setIsChoosingItem(false);
              }}
              size="small"
              variant="secondary"
            >
              Change schedule or type
            </Button>
            <SearchField
              onChangeText={browser.setQuery}
              placeholder={selectedType === "room" ? "Room name" : "Equipment or property no."}
              value={browser.query}
            />
          </Card>

          {browser.selectedResource ? (
            <Card style={styles.stepCard} tint="blue">
              <View style={styles.stepHeading}>
                <Text style={styles.cardEyebrow}>SELECTED</Text>
                <Text numberOfLines={2} style={styles.requestTitle}>{browser.selectedResource.name}</Text>
              </View>
              <Field
                label="Purpose"
                multiline
                onChangeText={browser.setPurpose}
                placeholder="Class session, lab activity, or setup requirement"
                value={browser.purpose}
              />
              <SchedulePreview entries={browser.schedule} />
              {browser.submitBlockReason ? <Notice tone="warning">{browser.submitBlockReason}</Notice> : null}
              <Button disabled={!browser.canSubmit || browser.isSubmitting} icon="send" loading={browser.isSubmitting} onPress={browser.submit}>
                Submit request
              </Button>
            </Card>
          ) : null}

          <SectionHeader count={bookableResources.length} title={`Available ${typeLabel}`} />
          {!browser.hasLoaded && browser.isLoading ? <SkeletonCard lines={3} /> : null}
          {!bookableResources.length && browser.hasLoaded && !browser.isLoading ? (
            <EmptyState body="Nothing of this type is free at that time. Change the schedule and try again." icon="search" title="No available items" />
          ) : null}
          {bookableResources.map((resource) => (
            <ResourceCard
              key={`${resource.resourceType}-${resource.id}`}
              onPress={() => browser.selectResource(resource)}
              resource={resource}
              selected={browser.selectedResource?.id === resource.id && browser.selectedResource.resourceType === resource.resourceType}
            />
          ))}
        </>
      ) : null}

      {step === 2 ? (
        <Card style={styles.stepCard} tint="orange">
          <StepHeading caption="You will get a notification once a custodian decides." index={3} title="Wait for approval" />
          <TrackedBookingSummary booking={activeBooking} />
          {activeBooking && (activeBooking.status === "rejected" || activeBooking.status === "cancelled") ? (
            <Notice tone="danger">
              {`This request was ${formatStatusLabel(activeBooking.status)}.${activeBooking.decisionNotes ? ` “${activeBooking.decisionNotes}”` : ""}`}
            </Notice>
          ) : (
            <Notice tone="warning">Pending custodian review. Tap refresh above to check again.</Notice>
          )}
          <View style={styles.stepActions}>
            {activeBooking?.status === "pending" ? (
              <Button
                disabled={Boolean(history.cancellingId)}
                fullWidth={false}
                loading={history.cancellingId === activeBooking.id}
                onPress={() => void history.cancel(activeBooking.id)}
                variant="danger"
              >
                Cancel request
              </Button>
            ) : null}
            <Button fullWidth={false} onPress={startNewRequest} variant="secondary">
              New request
            </Button>
          </View>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={styles.stepCard} tint="green">
          <StepHeading
            caption={activeBooking?.status === "approved" ? "Your request was approved." : "This borrowing has already been picked up."}
            index={4}
            title="Pick up"
          />
          <TrackedBookingSummary booking={activeBooking} />
          {activeBooking?.status === "approved" ? (
            <>
              <Notice tone="success">Go to the custodian office within your schedule and scan the item QR code to check it out.</Notice>
              {activeBooking.resourceType === "asset" ? (
                <Button icon="scan" onPress={() => router.push("/scan")}>
                  Scan item QR
                </Button>
              ) : null}
            </>
          ) : null}
          <Button onPress={startNewRequest} variant="secondary">
            New request
          </Button>
        </Card>
      ) : null}

      <SectionHeader
        actionLabel={history.bookings.length > 4 ? (showAllHistory ? "Show less" : "Show all") : undefined}
        count={history.bookings.length}
        onAction={() => setShowAllHistory((current) => !current)}
        title="History"
      />
      {history.error ? <Notice tone="danger">{history.error}</Notice> : null}
      {!history.hasLoaded && history.isLoading ? <SkeletonCard lines={3} /> : null}
      {!history.bookings.length && history.hasLoaded && !history.isLoading ? (
        <EmptyState body="Approved, rejected, and returned requests appear here." icon="clock" title="No borrowings yet" />
      ) : null}
      {visibleHistory.length ? (
        <Card style={styles.groupCard}>
          {visibleHistory.map((booking, index) => {
            const isTrackable = booking.status === "pending" || booking.status === "approved";
            return (
              <View key={booking.id} style={index > 0 ? styles.historyDivider : null}>
                <ListRow
                  leading={<IconTile icon={booking.resourceType === "room" ? "room" : "laptop"} size={36} />}
                  meta={`${formatReference(booking.resourceType === "room" ? booking.roomId : booking.assetId)} · ${formatDate(booking.requestedStartAt).toUpperCase()}`}
                  onPress={isTrackable ? () => trackBooking(booking.id) : undefined}
                  subtitle={isTrackable ? "Tap to track this request" : undefined}
                  title={booking.purpose}
                  trailing={<Badge label={formatStatusLabel(booking.status)} tone={getBookingStatusTone(booking.status) as Tone} />}
                />
                {booking.decisionNotes ? <Text numberOfLines={2} style={styles.decisionNotes}>“{booking.decisionNotes}”</Text> : null}
              </View>
            );
          })}
        </Card>
      ) : null}
    </ScreenScrollView>
  );
}

function StepHeading({ caption, index, title }: { caption: string; index: number; title: string }) {
  return (
    <View style={styles.stepHeading}>
      <Text style={styles.cardEyebrow}>{`STEP ${index} OF ${BORROW_STEPS.length}`}</Text>
      <Text style={styles.requestTitle}>{title}</Text>
      <Text style={styles.stepCaption}>{caption}</Text>
    </View>
  );
}

function TrackedBookingSummary({ booking }: { booking: MobileBooking | null }) {
  if (!booking) {
    return <SkeletonCard lines={2} />;
  }

  return (
    <View style={styles.summaryRow}>
      <IconTile icon={booking.resourceType === "room" ? "room" : "laptop"} size={36} />
      <View style={styles.summaryCopy}>
        <Text numberOfLines={2} style={styles.scheduleTitle}>{booking.purpose}</Text>
        <Text style={styles.scheduleTime}>{formatRange(booking.requestedStartAt, booking.requestedEndAt)}</Text>
      </View>
      <Badge label={formatStatusLabel(booking.status)} tone={getBookingStatusTone(booking.status) as Tone} />
    </View>
  );
}

function ResourceCard({ onPress, resource, selected }: { onPress: () => void; resource: MobileBorrowingResource; selected: boolean }) {
  const [didImageFail, setDidImageFail] = useState(false);
  const imageUri = getResourceImageUri(resource, didImageFail);
  const location = [resource.categoryName, resource.locationName].filter(Boolean).join(" · ") || "No location recorded";

  useEffect(() => {
    setDidImageFail(false);
  }, [resource.primaryImageUrl]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.resourceCard, selected ? styles.resourceCardSelected : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.resourceThumbWrap}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${resource.name} image`}
          onError={() => setDidImageFail(true)}
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={styles.resourceThumb}
        />
        <View style={styles.resourceTypeTag}>
          <AppIcon color="#FFFFFF" name={resource.resourceType === "room" ? "room" : "laptop"} size={11} />
        </View>
      </View>
      <View style={styles.resourceBody}>
        <Text numberOfLines={2} style={styles.resourceTitle}>{resource.name}</Text>
        <Text numberOfLines={1} style={styles.resourceMeta}>{location}</Text>
        <View style={styles.resourceFooter}>
          <Badge label={resource.availability} tone={availabilityTone(resource.availability)} />
          {resource.nextAvailableAt ? (
            <Text numberOfLines={1} style={styles.resourceNext}>FREE {formatDate(resource.nextAvailableAt).toUpperCase()}</Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.selectMark, selected ? styles.selectMarkActive : null]}>
        {selected ? <AppIcon color="#FFFFFF" focused name="check" size={16} /> : null}
      </View>
    </Pressable>
  );
}

function SchedulePreview({ entries }: { entries: MobileResourceScheduleEntry[] }) {
  if (!entries.length) {
    return <Notice tone="success">No schedule conflicts for this day.</Notice>;
  }

  return (
    <View style={styles.scheduleList}>
      <Text style={styles.cardEyebrow}>SAME-DAY SCHEDULE</Text>
      {entries.slice(0, 3).map((entry) => (
        <View key={entry.id} style={styles.scheduleRow}>
          <View style={[styles.scheduleRail, { backgroundColor: availabilityColor(entry.availability) }]} />
          <View style={styles.scheduleCopy}>
            <Text numberOfLines={1} style={styles.scheduleTitle}>{entry.purpose}</Text>
            <Text numberOfLines={1} style={styles.scheduleTime}>{formatDate(entry.requestedStartAt)} – {formatDate(entry.requestedEndAt)}</Text>
          </View>
          <Badge label={entry.availability} tone={availabilityTone(entry.availability)} />
        </View>
      ))}
    </View>
  );
}

function availabilityTone(availability: AvailabilityState): Tone {
  if (availability === "available") {
    return "success";
  }

  if (availability === "tentative") {
    return "warning";
  }

  return "danger";
}

function availabilityColor(availability: AvailabilityState) {
  return { danger: colors.danger, success: colors.success, warning: colors.warning }[availabilityTone(availability) as "danger" | "success" | "warning"];
}

function formatRange(start: string, end: string) {
  return `${formatDate(start)} – ${new Date(end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}

function getResourceImageUri(resource: MobileBorrowingResource, forceFallback = false) {
  if (!forceFallback && resource.primaryImageUrl && /^https?:\/\//i.test(resource.primaryImageUrl)) {
    return resource.primaryImageUrl;
  }

  if (resource.resourceType === "room") {
    return FALLBACK_RESOURCE_IMAGES.room;
  }

  const searchableText = `${resource.name} ${resource.categoryName ?? ""}`.toLowerCase();

  if (searchableText.includes("laptop") || searchableText.includes("computer")) {
    return FALLBACK_RESOURCE_IMAGES.laptop;
  }

  if (searchableText.includes("projector") || searchableText.includes("workspace")) {
    return FALLBACK_RESOURCE_IMAGES.workspace;
  }

  return FALLBACK_RESOURCE_IMAGES.default;
}

const styles = StyleSheet.create({
  cardEyebrow: {
    color: colors.muted,
    ...typography.eyebrow
  },
  decisionNotes: {
    color: colors.muted,
    fontSize: 12.5,
    fontStyle: "italic",
    lineHeight: 17,
    marginTop: -6,
    paddingBottom: 10,
    paddingLeft: 48
  },
  fieldGroup: {
    gap: 8
  },
  groupCard: {
    gap: 0,
    paddingVertical: 2
  },
  historyDivider: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  },
  requestTitle: {
    color: colors.text,
    ...typography.title
  },
  resourceBody: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  resourceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10
  },
  resourceCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: "#F7F9FF"
  },
  resourceFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5
  },
  resourceMeta: {
    color: colors.muted,
    fontSize: 12.5
  },
  resourceNext: {
    color: colors.subtle,
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontSize: 10.5
  },
  resourceThumb: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 76,
    width: 76
  },
  resourceThumbWrap: {
    position: "relative"
  },
  resourceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 19
  },
  resourceTypeTag: {
    alignItems: "center",
    backgroundColor: "rgba(19, 23, 34, 0.78)",
    borderRadius: 7,
    bottom: 5,
    height: 20,
    justifyContent: "center",
    left: 5,
    position: "absolute",
    width: 20
  },
  scheduleCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0
  },
  scheduleList: {
    gap: 8
  },
  scheduleRail: {
    alignSelf: "stretch",
    borderRadius: 2,
    width: 3
  },
  scheduleRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceGlass,
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    padding: 9
  },
  scheduleTime: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  scheduleTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  selectMark: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.borderStrong,
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  selectMarkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  stepActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  stepCaption: {
    color: colors.muted,
    ...typography.caption
  },
  stepCard: {
    gap: 14
  },
  stepHeading: {
    gap: 3
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  }
});
