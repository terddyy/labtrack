import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RequireActiveProfile } from "@/components/auth-gate";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { cancelBooking, formatApiError, listMyBookings, type MobileBooking } from "@/lib/labtrack-api";

export default function BookingsScreen() {
  return (
    <RequireActiveProfile>
      <BookingsContent />
    </RequireActiveProfile>
  );
}

function BookingsContent() {
  const [bookings, setBookings] = useState<MobileBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setBookings(await listMyBookings());
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings])
  );

  async function handleCancel(id: string) {
    setError(null);
    setCancellingId(id);

    try {
      await cancelBooking(id);
      await loadBookings();
    } catch (cancelError) {
      setError(formatApiError(cancelError));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="My bookings" caption="Track requests, approvals, checkout, and return status." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={loadBookings} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!bookings.length && !isLoading ? (
        <EmptyState body="Approved, rejected, checked-out, and returned bookings will appear here." title="No bookings yet" />
      ) : null}
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <View style={styles.cardHeader}>
            <Badge
              label={booking.status}
              tone={booking.status === "approved" || booking.status === "returned" ? "success" : booking.status === "rejected" || booking.status === "cancelled" ? "danger" : "warning"}
            />
            <Text style={styles.dateText}>{formatDate(booking.requestedStartAt)}</Text>
          </View>
          <Text style={styles.cardTitle}>{booking.purpose}</Text>
          <Text numberOfLines={1} style={styles.metaText}>
            Asset ref: {formatReference(booking.assetId)}
          </Text>
          <Text style={styles.metaText}>
            {formatDate(booking.requestedStartAt)} - {formatDate(booking.requestedEndAt)}
          </Text>
          {booking.decisionNotes ? <Text style={styles.bodyText}>{booking.decisionNotes}</Text> : null}
          {booking.status === "pending" ? (
            <Button
              disabled={Boolean(cancellingId)}
              loading={cancellingId === booking.id}
              onPress={() => void handleCancel(booking.id)}
              variant="secondary"
            >
              Cancel pending request
            </Button>
          ) : null}
        </Card>
      ))}
    </ScreenScrollView>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatReference(value: string) {
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
  headerRow: {
    alignItems: "flex-start",
    gap: 12
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
