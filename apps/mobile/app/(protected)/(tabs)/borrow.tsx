import type { AvailabilityState, ResourceType } from "@labtrack/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BookingSchedulePicker } from "@/components/booking-schedule-picker";
import { Badge, Button, Card, EmptyState, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useBookings } from "@/lib/use-bookings";
import { useBorrowableResources } from "@/lib/use-borrowable-resources";
import type { MobileBorrowingResource, MobileResourceScheduleEntry } from "@/lib/labtrack-api";

type ResourceFilter = "all" | ResourceType;

const resourceFilters: Array<{ label: string; value: ResourceFilter }> = [
  { label: "All", value: "all" },
  { label: "Equipment", value: "asset" },
  { label: "Rooms", value: "room" }
];

export default function BorrowScreen() {
  const browser = useBorrowableResources();
  const history = useBookings();

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Borrowing" caption="Choose a schedule first, then browse available equipment and rooms." />
        <Button disabled={browser.isLoading} fullWidth={false} loading={browser.isLoading} onPress={browser.refresh} variant="secondary">
          Refresh
        </Button>
      </View>

      {browser.error ? <Notice tone="danger">{browser.error}</Notice> : null}
      {browser.message ? <Notice tone="success">{browser.message}</Notice> : null}

      <Card>
        <SectionTitle title="Schedule" caption="Borrowing is limited to 1 hour 30 minutes through 3 hours." />
        <BookingSchedulePicker
          disabled={browser.isSubmitting}
          now={browser.validationNow}
          onRangeChange={browser.setRange}
          range={browser.range}
        />
      </Card>

      <Card>
        <SectionTitle title="Browse resources" caption="Pending requests appear as tentative. Approved or checked-out borrowings are busy." />
        <View style={styles.filterRow}>
          {resourceFilters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              onPress={() => browser.setFilter(filter.value)}
              selected={browser.filter === filter.value}
            />
          ))}
        </View>
        <Field
          autoCapitalize="none"
          label="Search"
          onChangeText={browser.setQuery}
          placeholder="Equipment, room, or property number"
          returnKeyType="search"
          value={browser.query}
        />
      </Card>

      {!browser.resources.length && !browser.isLoading ? (
        <EmptyState body="Try another date, duration, filter, or search term." title="No resources found" />
      ) : null}

      {browser.resources.map((resource) => (
        <ResourceCard
          key={`${resource.resourceType}-${resource.id}`}
          onPress={() => browser.selectResource(resource)}
          resource={resource}
          selected={browser.selectedResource?.id === resource.id && browser.selectedResource.resourceType === resource.resourceType}
        />
      ))}

      {browser.selectedResource ? (
        <Card>
          <SectionTitle
            title="Borrow request"
            caption={`${browser.selectedResource.resourceType === "room" ? "Room" : "Equipment"} selected: ${browser.selectedResource.name}`}
          />
          <Field
            label="Purpose"
            multiline
            onChangeText={browser.setPurpose}
            placeholder="Class session, laboratory activity, or setup requirement"
            value={browser.purpose}
          />
          <SchedulePreview entries={browser.schedule} />
          <Button disabled={!browser.canSubmit || browser.isSubmitting} loading={browser.isSubmitting} onPress={browser.submit}>
            Submit borrowing request
          </Button>
        </Card>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.headerRow}>
          <SectionTitle title="My borrowing history" caption="Track requests, approvals, checkout, and return status." />
          <Button disabled={history.isLoading} fullWidth={false} loading={history.isLoading} onPress={history.refresh} variant="secondary">
            Refresh
          </Button>
        </View>
        {history.error ? <Notice tone="danger">{history.error}</Notice> : null}
        {!history.bookings.length && !history.isLoading ? (
          <EmptyState body="Approved, rejected, checked-out, and returned borrowing requests will appear here." title="No borrowings yet" />
        ) : null}
        {history.bookings.map((booking) => (
          <Card key={booking.id}>
            <View style={styles.cardHeader}>
              <Badge label={booking.status} tone={booking.status === "approved" || booking.status === "returned" ? "success" : booking.status === "rejected" || booking.status === "cancelled" ? "danger" : "warning"} />
              <Text style={styles.dateText}>{formatDate(booking.requestedStartAt)}</Text>
            </View>
            <Text style={styles.cardTitle}>{booking.purpose}</Text>
            <Text numberOfLines={1} style={styles.metaText}>
              {booking.resourceType === "room" ? "Room" : "Equipment"} ref: {formatReference(booking.resourceType === "room" ? booking.roomId : booking.assetId)}
            </Text>
            <Text style={styles.metaText}>
              {formatDate(booking.requestedStartAt)} - {formatDate(booking.requestedEndAt)}
            </Text>
            {booking.decisionNotes ? <Text style={styles.bodyText}>{booking.decisionNotes}</Text> : null}
            {booking.status === "pending" ? (
              <Button
                disabled={Boolean(history.cancellingId)}
                loading={history.cancellingId === booking.id}
                onPress={() => void history.cancel(booking.id)}
                variant="secondary"
              >
                Cancel pending request
              </Button>
            ) : null}
          </Card>
        ))}
      </View>
    </ScreenScrollView>
  );
}

function FilterChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, selected ? styles.filterChipSelected : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function ResourceCard({ onPress, resource, selected }: { onPress: () => void; resource: MobileBorrowingResource; selected: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed ? styles.pressed : null]}>
      <Card style={[styles.resourceCard, selected ? styles.resourceCardSelected : null]}>
        <View style={styles.cardHeader}>
          <Badge label={resource.resourceType === "room" ? "Room" : "Equipment"} tone="neutral" />
          <Badge label={resource.availability} tone={availabilityTone(resource.availability)} />
        </View>
        <Text style={styles.cardTitle}>{resource.name}</Text>
        <Text style={styles.metaText}>
          {[resource.categoryName, resource.locationName].filter(Boolean).join(" | ") || "No room details recorded"}
        </Text>
        {resource.condition ? <Text style={styles.metaText}>Condition: {resource.condition.replaceAll("_", " ")}</Text> : null}
        {resource.nextAvailableAt ? <Text style={styles.metaText}>Estimated available after {formatDate(resource.nextAvailableAt)}</Text> : null}
      </Card>
    </Pressable>
  );
}

function SchedulePreview({ entries }: { entries: MobileResourceScheduleEntry[] }) {
  if (!entries.length) {
    return <Notice tone="success">No active schedule conflicts for the selected day.</Notice>;
  }

  return (
    <View style={styles.scheduleList}>
      <Text style={styles.groupLabel}>Schedule</Text>
      {entries.slice(0, 4).map((entry) => (
        <View key={entry.id} style={styles.scheduleRow}>
          <Badge label={entry.availability} tone={availabilityTone(entry.availability)} />
          <View style={styles.scheduleCopy}>
            <Text numberOfLines={1} style={styles.scheduleTitle}>{entry.purpose}</Text>
            <Text style={styles.metaText}>{formatDate(entry.requestedStartAt)} - {formatDate(entry.requestedEndAt)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function availabilityTone(availability: AvailabilityState) {
  if (availability === "available") {
    return "success";
  }

  if (availability === "tentative") {
    return "warning";
  }

  return "danger";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatReference(value: string | null) {
  if (!value) {
    return "UNKNOWN";
  }

  return value.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23
  },
  dateText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right"
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  filterChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  filterChipTextSelected: {
    color: colors.primaryDark
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  groupLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  headerRow: {
    alignItems: "flex-start",
    gap: 12
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.82
  },
  resourceCard: {
    gap: 10
  },
  resourceCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  scheduleCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  scheduleList: {
    gap: 10
  },
  scheduleRow: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  scheduleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  sectionBlock: {
    gap: 12
  }
});
