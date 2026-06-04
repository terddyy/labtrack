import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView } from "@/components/ui";
import { colors, shadows } from "@/constants/theme";
import { useNotifications } from "@/lib/use-notifications";

export default function NotificationsScreen() {
  const { error, isLoading, markRead, notifications, readingId, refresh } = useNotifications();

  return (
    <ScreenScrollView>
      <Card style={styles.heroCard}>
        <View style={styles.headerRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Notification Center</Text>
            <Text style={styles.heroTitle}>Updates that need attention.</Text>
            <Text style={styles.heroCaption}>Borrow decisions, defect changes, and ticket replies stay organized here.</Text>
          </View>
          <View style={styles.unreadBubble}>
            <Text style={styles.unreadValue}>{notifications.filter((notification) => !notification.readAt).length}</Text>
            <Text style={styles.unreadLabel}>unread</Text>
          </View>
        </View>
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </Card>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!notifications.length && !isLoading ? (
        <EmptyState body="New borrow decisions, defect updates, and ticket replies will appear here." title="No notifications yet" />
      ) : null}
      {notifications.map((notification) => (
        <Card key={notification.id} style={[styles.notificationCard, !notification.readAt ? styles.unreadCard : null]}>
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
              onPress={() => void markRead(notification.id)}
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
    fontWeight: "600",
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
    fontWeight: "900",
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
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between"
  },
  heroCaption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  heroCard: {
    backgroundColor: colors.blueMuted,
    borderColor: "rgba(255,255,255,0.84)",
    gap: 16,
    padding: 22
  },
  heroCopy: {
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  heroKicker: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30
  },
  notificationCard: {
    gap: 12
  },
  unreadBubble: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    height: 82,
    justifyContent: "center",
    width: 82,
    ...shadows.soft
  },
  unreadLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  unreadValue: {
    color: colors.blue,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 32
  },
  unreadCard: {
    borderColor: colors.warning,
    borderWidth: 2
  }
});
