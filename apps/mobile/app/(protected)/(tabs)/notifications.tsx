import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useNotifications } from "@/lib/use-notifications";

export default function NotificationsScreen() {
  const { error, isLoading, markRead, notifications, readingId, refresh } = useNotifications();

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Notifications" caption="Borrow, defect, and ticket updates from LABTRACK." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!notifications.length && !isLoading ? (
        <EmptyState body="New borrow decisions, defect updates, and ticket replies will appear here." title="No notifications yet" />
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
    borderColor: colors.warning
  }
});
