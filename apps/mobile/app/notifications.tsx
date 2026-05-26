import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RequireActiveProfile } from "@/components/auth-gate";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import {
  formatApiError,
  listNotifications,
  markNotificationRead,
  type MobileNotification
} from "@/lib/labtrack-api";

export default function NotificationsScreen() {
  return (
    <RequireActiveProfile>
      <NotificationsContent />
    </RequireActiveProfile>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setNotifications(await listNotifications());
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  async function handleRead(id: string) {
    setError(null);
    setReadingId(id);

    try {
      await markNotificationRead(id);
      await loadNotifications();
    } catch (readError) {
      setError(formatApiError(readError));
    } finally {
      setReadingId(null);
    }
  }

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Notifications" caption="Booking, defect, and ticket updates from LABTRACK." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={loadNotifications} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!notifications.length && !isLoading ? (
        <EmptyState body="New booking decisions, defect updates, and ticket replies will appear here." title="No notifications yet" />
      ) : null}
      {notifications.map((notification) => (
        <Card key={notification.id} style={!notification.readAt ? styles.unreadCard : null}>
          <View style={styles.cardHeader}>
            <Badge label={notification.readAt ? "read" : "unread"} tone={notification.readAt ? "neutral" : "warning"} />
            <Text style={styles.dateText}>{new Date(notification.createdAt).toLocaleString()}</Text>
          </View>
          <Text style={styles.cardTitle}>{notification.title}</Text>
          <Text style={styles.bodyText}>{notification.body}</Text>
          {!notification.readAt ? (
            <Button
              disabled={Boolean(readingId)}
              loading={readingId === notification.id}
              onPress={() => void handleRead(notification.id)}
              variant="secondary"
            >
              Mark read
            </Button>
          ) : null}
        </Card>
      ))}
    </ScreenScrollView>
  );
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
  unreadCard: {
    borderColor: "#DFC895"
  }
});
