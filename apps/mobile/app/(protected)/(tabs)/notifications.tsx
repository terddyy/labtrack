import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Notice, ScreenFlatList, SkeletonCard } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useNotifications } from "@/lib/use-notifications";

export default function NotificationsScreen() {
  const { error, hasLoaded, isLoading, markRead, notifications, readingId, refresh } = useNotifications();

  return (
    <ScreenFlatList
      data={notifications}
      empty={hasLoaded && !isLoading ? <EmptyState body="New borrow decisions, defect updates, and ticket replies will appear here." title="No notifications yet" /> : null}
      header={(
        <>
          <Card style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>Notification Center</Text>
              <Text style={styles.heroTitle}>Updates that need attention.</Text>
              <Text style={styles.heroCaption}>Borrow decisions, defect changes, and ticket replies stay organized here.</Text>
            </View>
            <View style={styles.heroActions}>
              <View style={styles.unreadPill}>
                <Text style={styles.unreadValue}>{notifications.filter((notification) => !notification.readAt).length}</Text>
                <Text style={styles.unreadLabel}>unread</Text>
              </View>
              <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
                Refresh
              </Button>
            </View>
          </Card>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {!hasLoaded && isLoading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </>
          ) : null}
        </>
      )}
      includeTopInset
      keyExtractor={(notification) => notification.id}
      renderItem={({ item: notification }) => (
        <Card style={[styles.notificationCard, !notification.readAt ? styles.unreadCard : null]}>
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
      )}
    />
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
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
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
    lineHeight: 17,
    textAlign: "left"
  },
  heroCaption: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  heroCard: {
    backgroundColor: colors.blueMuted,
    borderColor: "rgba(255,255,255,0.84)",
    gap: 14,
    padding: 18
  },
  heroCopy: {
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
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26
  },
  notificationCard: {
    gap: 12
  },
  unreadPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: "row",
    gap: 7,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  unreadLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  unreadValue: {
    color: colors.blue,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 26
  },
  unreadCard: {
    borderColor: colors.warning,
    borderWidth: 2
  }
});
