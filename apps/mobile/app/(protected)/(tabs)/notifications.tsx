import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  ConsoleHeader,
  EmptyState,
  HeaderIconButton,
  Notice,
  ScreenFlatList,
  SegmentedControl,
  SkeletonCard,
  formatRelativeTime
} from "@/components/ui";
import { colors, fonts, spacing } from "@/constants/theme";
import { useNotifications } from "@/lib/use-notifications";
import type { MobileNotification } from "@/lib/labtrack-api";

type NotificationFilter = "all" | "unread";

const notificationFilters: Array<{ label: string; value: NotificationFilter }> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" }
];

export default function NotificationsScreen() {
  const { error, hasLoaded, isLoading, markRead, notifications, readingId, refresh } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);
  const visibleNotifications = useMemo(
    () => (filter === "unread" ? notifications.filter((notification) => !notification.readAt) : notifications),
    [filter, notifications]
  );

  return (
    <ScreenFlatList
      data={visibleNotifications}
      empty={
        hasLoaded && !isLoading ? (
          <EmptyState
            body={
              filter === "unread"
                ? "You're caught up. Switch to All to review earlier updates."
                : "New borrow decisions, defect updates, and ticket replies will appear here."
            }
            icon={filter === "unread" ? "check" : "bell"}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          />
        ) : null
      }
      header={(
        <ConsoleHeader
          caption={unreadCount ? `${unreadCount} unread of ${notifications.length}` : `All caught up · ${notifications.length} total`}
          eyebrow="Inbox · Decisions & replies"
          right={<HeaderIconButton accessibilityLabel="Refresh notifications" icon="refresh" loading={isLoading} onPress={refresh} />}
          title="Alerts"
        />
      )}
      keyExtractor={(notification) => notification.id}
      listHeader={(
        <>
          <SegmentedControl
            counts={{ all: notifications.length, unread: unreadCount }}
            onChange={setFilter}
            options={notificationFilters}
            value={filter}
          />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {!hasLoaded && isLoading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </>
          ) : null}
        </>
      )}
      renderItem={({ item: notification }) => (
        <NotificationCard
          disabled={Boolean(readingId)}
          notification={notification}
          onMarkRead={() => void markRead(notification.id)}
          reading={readingId === notification.id}
        />
      )}
    />
  );
}

function getNotificationIcon(notification: MobileNotification): AppIconName {
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  if (text.includes("defect") || text.includes("repair")) return "wrench";
  if (text.includes("ticket") || text.includes("message") || text.includes("reply")) return "message";
  if (text.includes("borrow") || text.includes("booking") || text.includes("reservation")) return "borrow";
  return "bell";
}

function NotificationCard({
  disabled,
  notification,
  onMarkRead,
  reading
}: {
  disabled: boolean;
  notification: MobileNotification;
  onMarkRead: () => void;
  reading: boolean;
}) {
  const isUnread = !notification.readAt;

  return (
    <Pressable
      accessibilityHint={isUnread ? "Marks this notification as read" : undefined}
      accessibilityRole="button"
      accessibilityState={{ busy: reading, disabled: !isUnread || disabled }}
      disabled={!isUnread || disabled}
      onPress={isUnread ? onMarkRead : undefined}
      style={({ pressed }) => [styles.card, isUnread ? styles.cardUnread : null, pressed ? styles.pressed : null]}
    >
      <View style={[styles.icon, isUnread ? styles.iconUnread : null]}>
        <AppIcon color={isUnread ? colors.primary : colors.subtle} name={getNotificationIcon(notification)} size={18} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, isUnread ? styles.titleUnread : null]}>
            {notification.title}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(notification.createdAt).toUpperCase()}</Text>
        </View>
        <Text numberOfLines={3} style={styles.body}>
          {notification.body}
        </Text>
        {isUnread ? (
          <Text style={styles.markRead}>{reading ? "Marking as read…" : "Tap to mark as read"}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontSize: 13.5,
    lineHeight: 19
  },
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  cardUnread: {
    borderColor: "rgba(59, 91, 219, 0.28)"
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  iconUnread: {
    backgroundColor: colors.primaryMuted
  },
  markRead: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 4
  },
  pressed: {
    opacity: 0.85
  },
  time: {
    color: colors.subtle,
    flexShrink: 0,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    lineHeight: 19
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    lineHeight: 19
  },
  titleRow: {
    flexDirection: "row",
    gap: 10
  },
  titleUnread: {
    fontWeight: "700"
  }
});
