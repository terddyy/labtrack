import { formatStatusLabel, getBookingStatusTone, getDefectStatusTone, getRoleDisplayLabel } from "@labtrack/shared";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  Badge,
  Card,
  ConsoleHeader,
  EmptyState,
  HeaderIconButton,
  IconTile,
  ListRow,
  Notice,
  ReadoutStrip,
  ScreenScrollView,
  SectionHeader,
  SkeletonCard,
  formatReference,
  formatRelativeTime,
  type Tone
} from "@/components/ui";
import { colors, fonts, spacing, typography } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";
import { useBookings } from "@/lib/use-bookings";
import { useDashboardSummary } from "@/lib/use-dashboard-summary";
import { useDefectReports } from "@/lib/use-defect-reports";
import type { MobileBooking } from "@/lib/labtrack-api";

const quickActions: Array<{ caption: string; icon: AppIconName; label: string; route: "/scan" | "/borrow" | "/ticket" }> = [
  { caption: "Open an asset", icon: "scan", label: "Scan QR", route: "/scan" },
  { caption: "Reserve items", icon: "borrow", label: "Borrow", route: "/borrow" },
  { caption: "Ask custodians", icon: "ticket", label: "Support", route: "/ticket" }
];

export default function HomeScreen() {
  const auth = useCurrentProfile();
  const isReady = auth.status === "ready";
  const { summary } = useDashboardSummary(isReady);
  const bookingQueue = useBookings();
  const defects = useDefectReports();
  const profile = auth.status === "ready" || auth.status === "inactive" ? auth.profile : null;
  const firstName = profile?.fullName.trim().split(/\s+/)[0] ?? "there";
  const department = profile?.department ?? "Computing Department";
  const roleLabel = profile ? getRoleDisplayLabel(profile.role) : "Mobile workspace";
  const trackedAssets = summary.totalAssets || summary.availableAssets + summary.checkedOutAssets + summary.repairAssets;
  const inventoryHealth = trackedAssets ? Math.round((summary.availableAssets / trackedAssets) * 100) : 0;

  useEffect(() => {
    if (auth.status === "ready") {
      registerForPushNotifications().catch((error) => {
        console.warn("LABTRACK push notification registration failed.", error);
      });
    }
  }, [auth.status]);

  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption={`${roleLabel} · ${formatToday()}`}
          eyebrow={`Labtrack · ${department}`}
          right={(
            <HeaderIconButton
              accessibilityLabel={isReady ? "Open notifications" : "Notifications unavailable until sign in"}
              badge={summary.unreadNotifications}
              disabled={!isReady}
              icon="bell"
              onPress={() => router.push("/notifications")}
            />
          )}
          title={`${getGreeting()},\n${firstName}`}
        >
          <ReadoutStrip
            items={[
              { label: "Tracked assets", value: formatNumber(trackedAssets) },
              { label: "Pending", tone: summary.pendingBookings ? "warning" : "neutral", value: formatNumber(summary.pendingBookings) },
              { label: "Open defects", tone: summary.openDefects ? "danger" : "success", value: formatNumber(summary.openDefects) }
            ]}
          />
        </ConsoleHeader>
      )}
    >
      <View style={styles.actionRow}>
        {quickActions.map((action, index) => (
          <QuickAction featured={index === 0} key={action.route} {...action} />
        ))}
      </View>

      {auth.status === "missing-config" ? (
        <Notice tone="warning">Supabase mobile configuration is missing. Add the mobile environment keys before scanning.</Notice>
      ) : null}
      {auth.status === "error" ? <Notice tone="danger">{auth.error}</Notice> : null}
      {auth.status === "inactive" ? <Notice tone="danger">Your LABTRACK profile is inactive. Contact a custodian before using workflows.</Notice> : null}
      {summary.error ? <Notice tone="warning">{summary.error}</Notice> : null}
      {bookingQueue.error ? <Notice tone="warning">{bookingQueue.error}</Notice> : null}
      {defects.error ? <Notice tone="warning">{defects.error}</Notice> : null}

      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <View style={styles.healthCopy}>
            <Text style={styles.cardEyebrow}>INVENTORY HEALTH</Text>
            <Text style={styles.healthCaption}>
              Across {summary.labCount || 5} computer laboratories
            </Text>
          </View>
          <View style={styles.healthReadout}>
            <Text style={styles.healthValue}>{inventoryHealth}</Text>
            <Text style={styles.healthUnit}>% free</Text>
          </View>
        </View>
        <StackedBar
          segments={[
            { color: colors.success, value: summary.availableAssets },
            { color: colors.primary, value: summary.checkedOutAssets },
            { color: colors.warning, value: summary.repairAssets }
          ]}
        />
        <View style={styles.legend}>
          <LegendItem color={colors.success} label="Available" value={summary.availableAssets} />
          <LegendItem color={colors.primary} label="Checked out" value={summary.checkedOutAssets} />
          <LegendItem color={colors.warning} label="For repair" value={summary.repairAssets} />
        </View>
      </Card>

      <SectionHeader
        actionLabel="Review all"
        count={bookingQueue.bookings.length}
        onAction={() => router.push("/borrow")}
        title="Borrowing queue"
      />
      {!bookingQueue.hasLoaded && bookingQueue.isLoading ? <SkeletonCard lines={3} /> : null}
      {bookingQueue.bookings.length ? (
        <Card style={styles.groupCard}>
          {bookingQueue.bookings.slice(0, 3).map((booking, index) => (
            <BookingRow booking={booking} divider={index > 0} key={booking.id} />
          ))}
        </Card>
      ) : null}
      {!bookingQueue.bookings.length && bookingQueue.hasLoaded && !bookingQueue.isLoading ? (
        <EmptyState body="Approved, pending, and returned borrowing activity will appear here." icon="borrow" title="No active borrowing queue" />
      ) : null}

      <SectionHeader
        actionLabel="Open"
        count={defects.reports.length}
        onAction={() => router.push("/reports")}
        title="Recent defects"
      />
      {!defects.hasLoaded && defects.isLoading ? <SkeletonCard lines={3} /> : null}
      {defects.reports.length ? (
        <Card style={styles.groupCard}>
          {defects.reports.slice(0, 3).map((report, index) => {
            const tone = getDefectStatusTone(report.status) as Tone;
            return (
              <ListRow
                divider={index > 0}
                key={report.id}
                leading={<IconTile icon={report.status === "resolved" ? "check" : "wrench"} tone={tone} />}
                meta={`ASSET ${formatReference(report.assetId, 6)} · ${formatRelativeTime(report.createdAt).toUpperCase()}`}
                onPress={() => router.push("/reports")}
                title={report.title}
                trailing={<Badge label={formatStatusLabel(report.status)} tone={tone} />}
              />
            );
          })}
        </Card>
      ) : null}
      {!defects.reports.length && defects.hasLoaded && !defects.isLoading ? (
        <EmptyState body="New laboratory incidents will appear here after defect reports are submitted." icon="wrench" title="No recent incidents" />
      ) : null}
    </ScreenScrollView>
  );
}

function QuickAction({ caption, featured, icon, label, route }: { caption: string; featured: boolean; icon: AppIconName; label: string; route: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(route as "/scan")}
      style={({ pressed }) => [styles.actionTile, featured ? styles.actionTileFeatured : null, pressed ? styles.pressed : null]}
    >
      <View style={[styles.actionIcon, featured ? styles.actionIconFeatured : null]}>
        <AppIcon color={featured ? "#FFFFFF" : colors.text} name={icon} size={19} />
      </View>
      <View>
        <Text style={[styles.actionLabel, featured ? styles.actionLabelFeatured : null]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.actionCaption, featured ? styles.actionCaptionFeatured : null]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function BookingRow({ booking, divider }: { booking: MobileBooking; divider: boolean }) {
  const overdue = booking.status === "checked_out" && new Date(booking.requestedEndAt).getTime() < Date.now();
  const tone = (overdue ? "danger" : getBookingStatusTone(booking.status)) as Tone;

  return (
    <ListRow
      divider={divider}
      leading={<IconTile icon={booking.resourceType === "room" ? "room" : "laptop"} tone={tone === "neutral" ? "neutral" : tone} />}
      meta={`DUE ${formatDueTime(booking.requestedEndAt).toUpperCase()}`}
      onPress={() => router.push("/borrow")}
      subtitle={booking.resourceType === "room" ? "Room request" : "Equipment request"}
      title={booking.purpose}
      trailing={<Badge label={overdue ? "overdue" : formatStatusLabel(booking.status)} tone={tone} />}
    />
  );
}

function StackedBar({ segments }: { segments: Array<{ color: string; value: number }> }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <View style={styles.stackedBar}>
      {total ? (
        segments.filter((segment) => segment.value > 0).map((segment, index) => (
          <View key={index} style={{ backgroundColor: segment.color, flex: segment.value }} />
        ))
      ) : null}
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={styles.legendLabelRow}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={styles.legendLabel}>{label}</Text>
      </View>
      <Text style={styles.legendValue}>{formatNumber(value)}</Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", weekday: "short" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: value > 999 ? "compact" : "standard" }).format(value);
}

function formatDueTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  actionCaption: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 1
  },
  actionCaptionFeatured: {
    color: "rgba(255,255,255,0.72)"
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actionIconFeatured: {
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  actionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  actionLabelFeatured: {
    color: "#FFFFFF"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8
  },
  actionTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 14,
    minWidth: 0,
    padding: 12
  },
  actionTileFeatured: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  cardEyebrow: {
    color: colors.muted,
    ...typography.eyebrow
  },
  groupCard: {
    gap: 0,
    paddingVertical: 2
  },
  healthCaption: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500"
  },
  healthCard: {
    gap: 14
  },
  healthCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  healthHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12
  },
  healthReadout: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 3
  },
  healthUnit: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12
  },
  healthValue: {
    color: colors.text,
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 38,
    ...typography.readout
  },
  legend: {
    flexDirection: "row",
    gap: 8
  },
  legendDot: {
    borderRadius: 2,
    height: 8,
    width: 8
  },
  legendItem: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  legendLabel: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12
  },
  legendLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  legendValue: {
    color: colors.text,
    fontSize: 16,
    paddingLeft: 14,
    ...typography.readout
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }]
  },
  stackedBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 5,
    flexDirection: "row",
    gap: 2,
    height: 10,
    overflow: "hidden"
  }
});
