import { formatStatusLabel, getBookingStatusTone, getRoleDisplayLabel } from "@labtrack/shared";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Notice, ScreenScrollView, SkeletonCard } from "@/components/ui";
import { colors, shadows, spacing } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";
import { useBookings } from "@/lib/use-bookings";
import { useDashboardSummary } from "@/lib/use-dashboard-summary";
import { useDefectReports } from "@/lib/use-defect-reports";
import type { MobileBooking, MobileDefectReport } from "@/lib/labtrack-api";

export default function HomeScreen() {
  const auth = useCurrentProfile();
  const isReady = auth.status === "ready";
  const { summary } = useDashboardSummary(isReady);
  const bookingQueue = useBookings();
  const defects = useDefectReports();
  const profile = auth.status === "ready" || auth.status === "inactive" ? auth.profile : null;
  const displayName = profile?.fullName ?? "Faculty user";
  const department = profile?.department ?? "Computing Department";
  const roleLabel = profile ? getRoleDisplayLabel(profile.role) : "Mobile workspace";
  const trackedAssets = summary.totalAssets || summary.availableAssets + summary.checkedOutAssets + summary.repairAssets;
  const availableAssets = summary.availableAssets;
  const inventoryHealth = trackedAssets ? Math.round((availableAssets / trackedAssets) * 100) : 0;
  const onLoan = summary.checkedOutAssets || summary.pendingBookings;

  useEffect(() => {
    if (auth.status === "ready") {
      registerForPushNotifications().catch((error) => {
        console.warn("LABTRACK push notification registration failed.", error);
      });
    }
  }, [auth.status]);

  return (
    <ScreenScrollView includeTopInset>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.brandName}>LABTRACK</Text>
            <Text numberOfLines={1} style={styles.department}>{department}</Text>
          </View>
        </View>
        <NotificationAction disabled={!isReady} unread={summary.unreadNotifications} />
      </View>

      {auth.status === "missing-config" ? (
        <Notice tone="warning">Supabase mobile configuration is missing. Add the mobile environment keys before scanning.</Notice>
      ) : null}
      {auth.status === "error" ? <Notice tone="danger">{auth.error}</Notice> : null}
      {auth.status === "inactive" ? <Notice tone="danger">Your LABTRACK profile is inactive. Contact a custodian before using workflows.</Notice> : null}
      {summary.error ? <Notice tone="warning">{summary.error}</Notice> : null}
      {bookingQueue.error ? <Notice tone="warning">{bookingQueue.error}</Notice> : null}
      {defects.error ? <Notice tone="warning">{defects.error}</Notice> : null}

      <View style={styles.quickRow}>
        <QuickAction label="Scan" icon="scan" onPress={() => router.push("/scan")} />
        <QuickAction label="Borrow" icon="box" onPress={() => router.push("/borrow")} />
        <QuickAction label="Report" icon="alert" onPress={() => router.push("/reports")} />
        <QuickAction label="Tickets" icon="message" onPress={() => router.push("/ticket")} />
      </View>

      <Card style={styles.primaryCard}>
        <View style={styles.cardLabelRow}>
          <Text style={styles.eyebrow}>Dashboard</Text>
          <SoftIcon color={colors.primary} name="monitor" />
        </View>
        <Text style={styles.assetCount}>{formatNumber(trackedAssets)}</Text>
        <Text style={styles.assetCaption}>
          tracked assets across {summary.labCount || 5} computer laboratories
        </Text>
        <View style={styles.heroMetaRow}>
          <MiniStat label="Role" value={roleLabel} />
          <MiniStat label="Open work" value={String(summary.pendingBookings + summary.openDefects)} />
        </View>
      </Card>

      <View style={styles.metricGrid}>
        <MetricCard color={colors.blue} icon="box" label="On loan" value={onLoan} />
        <MetricCard color={colors.purple} icon="clock" label="Pending requests" value={summary.pendingBookings} />
        <MetricCard color={colors.warning} icon="alert" label="Open defects" value={summary.openDefects} />
        <MetricCard color={colors.success} icon="check" label="Available assets" value={summary.availableAssets} />
      </View>

      <SectionHeader actionLabel="Review all" onAction={() => router.push("/borrow")} title="Borrowing Queue" />
      <View style={styles.queueList}>
        {!bookingQueue.hasLoaded && bookingQueue.isLoading ? <SkeletonCard lines={3} /> : null}
        {bookingQueue.bookings.slice(0, 3).map((booking) => (
          <BorrowQueueCard booking={booking} key={booking.id} />
        ))}
        {!bookingQueue.bookings.length && bookingQueue.hasLoaded && !bookingQueue.isLoading ? (
          <SoftEmpty body="Approved, pending, and returned borrowing activity will appear here." title="No active borrowing queue" />
        ) : null}
      </View>

      <SectionHeader actionLabel="Labs" title="Inventory Health" />
      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <View style={styles.healthCopy}>
            <Text style={styles.healthTitle}>Computer Laboratory Assets</Text>
            <Text style={styles.healthCaption}>Availability, checkouts, and repair status</Text>
          </View>
          <CircularProgress value={inventoryHealth} />
        </View>
        <View style={styles.progressList}>
          <ProgressLine color={colors.success} label="Available" total={trackedAssets} value={summary.availableAssets} />
          <ProgressLine color={colors.primary} label="Checked out" total={trackedAssets} value={summary.checkedOutAssets} />
          <ProgressLine color={colors.warning} label="For repair" total={trackedAssets} value={summary.repairAssets} />
        </View>
      </Card>

      <SectionHeader actionLabel="Open" onAction={() => router.push("/reports")} title="Recent Defect Reports" />
      <View style={styles.defectList}>
        {!defects.hasLoaded && defects.isLoading ? <SkeletonCard lines={3} /> : null}
        {defects.reports.slice(0, 3).map((report) => (
          <IncidentCard key={report.id} report={report} />
        ))}
        {!defects.reports.length && defects.hasLoaded && !defects.isLoading ? (
          <SoftEmpty body="New laboratory incidents will appear here after defect reports are submitted." title="No recent incidents" />
        ) : null}
      </View>
    </ScreenScrollView>
  );
}

function NotificationAction({ disabled, unread }: { disabled: boolean; unread: number }) {
  return (
    <Pressable
      accessibilityLabel={disabled ? "Notifications unavailable until sign in" : "Open notifications"}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [styles.notificationButton, disabled ? styles.disabled : pressed ? styles.pressed : null]}
    >
      <View style={styles.bellGlyph}>
        <View style={styles.bellBody} />
        <View style={styles.bellBase} />
      </View>
      {unread ? <View style={styles.notificationDot} /> : null}
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed ? styles.pressed : null]}>
      <SoftIcon color={colors.primary} name={icon} size={18} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function MetricCard({ color, icon, label, value }: { color: string; icon: IconName; label: string; value: number }) {
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <SoftIcon color={color} name={icon} size={19} />
      </View>
      <Text style={styles.metricValue}>{formatNumber(value)}</Text>
      <Text numberOfLines={2} style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

function SectionHeader({ actionLabel, onAction, title }: { actionLabel?: string; onAction?: () => void; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => [pressed ? styles.pressed : null]}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BorrowQueueCard({ booking }: { booking: MobileBooking }) {
  const overdue = isOverdue(booking);
  const borrower = booking.resourceType === "room" ? "Room request" : "Asset request";
  const tone = overdue ? "danger" : getBookingStatusTone(booking.status);

  return (
    <Card style={styles.queueCard}>
      <View style={styles.avatarSmall}>
        <Text style={styles.avatarSmallText}>{getInitials(booking.purpose)}</Text>
      </View>
      <View style={styles.queueCopy}>
        <Text numberOfLines={1} style={styles.queueTitle}>{booking.purpose}</Text>
        <Text numberOfLines={1} style={styles.queueMeta}>
          {borrower} • Due {formatDueTime(booking.requestedEndAt)}
        </Text>
      </View>
      <Badge label={overdue ? "overdue" : formatStatusLabel(booking.status)} tone={tone} />
    </Card>
  );
}

function CircularProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.progressRing}>
      <View style={[styles.progressArc, { transform: [{ rotate: `${Math.max(35, clamped * 2.7)}deg` }] }]} />
      <View style={styles.progressInner}>
        <Text style={styles.progressValue}>{clamped}%</Text>
      </View>
    </View>
  );
}

function ProgressLine({ color, label, total, value }: { color: string; label: string; total: number; value: number }) {
  const percent = total ? Math.max(5, Math.min(100, (value / total) * 100)) : 5;

  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { backgroundColor: color, width: `${percent}%` }]} />
      </View>
      <Text style={styles.progressCount}>{formatNumber(value)}</Text>
    </View>
  );
}

function IncidentCard({ report }: { report: MobileDefectReport }) {
  const critical = report.status === "pending" || report.status === "sent_for_repair";
  const tone = report.status === "resolved" ? "success" : critical ? "danger" : "secondary";

  return (
    <Card style={styles.incidentCard}>
      <View style={[styles.severityIcon, critical ? styles.severityCritical : styles.severityReview]}>
        <Text style={styles.severityText}>{critical ? "!" : "?"}</Text>
      </View>
      <View style={styles.incidentCopy}>
        <Text numberOfLines={1} style={styles.incidentTitle}>{report.title}</Text>
        <Text numberOfLines={1} style={styles.incidentMeta}>
          Asset {formatReference(report.assetId)} • Reported {formatRelative(report.createdAt)}
        </Text>
      </View>
      <Badge label={formatStatusLabel(report.status)} tone={tone} />
    </Card>
  );
}

function SoftEmpty({ body, title }: { body: string; title: string }) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </Card>
  );
}

type IconName = "alert" | "box" | "check" | "clock" | "message" | "monitor" | "scan";

function SoftIcon({ color, name, size = 22 }: { color: string; name: IconName; size?: number }) {
  if (name === "alert") {
    return (
      <View style={[styles.iconCanvas, { height: size, width: size }]}>
        <View style={[styles.alertTriangle, { borderBottomColor: color, borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size - 2 }]} />
        <View style={[styles.alertStem, { backgroundColor: colors.surface }]} />
      </View>
    );
  }

  if (name === "clock") {
    return (
      <View style={[styles.iconCanvas, styles.clockIcon, { borderColor: color, height: size, width: size }]}>
        <View style={[styles.clockHandLong, { backgroundColor: color }]} />
        <View style={[styles.clockHandShort, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "check") {
    return (
      <View style={[styles.iconCanvas, { height: size, width: size }]}>
        <View style={[styles.checkStem, { borderColor: color }]} />
      </View>
    );
  }

  if (name === "scan") {
    return (
      <View style={[styles.iconCanvas, { height: size, width: size }]}>
        <View style={[styles.scanMiniCorner, styles.scanMiniTopLeft, { borderColor: color }]} />
        <View style={[styles.scanMiniCorner, styles.scanMiniTopRight, { borderColor: color }]} />
        <View style={[styles.scanMiniCorner, styles.scanMiniBottomLeft, { borderColor: color }]} />
        <View style={[styles.scanMiniCorner, styles.scanMiniBottomRight, { borderColor: color }]} />
      </View>
    );
  }

  if (name === "monitor") {
    return (
      <View style={[styles.iconCanvas, { height: size, width: size }]}>
        <View style={[styles.monitorScreen, { borderColor: color }]} />
        <View style={[styles.monitorStand, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "message") {
    return (
      <View style={[styles.iconCanvas, { height: size, width: size }]}>
        <View style={[styles.messageBubble, { borderColor: color }]} />
        <View style={[styles.messageTail, { borderTopColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.iconCanvas, { height: size, width: size }]}>
      <View style={[styles.boxIcon, { borderColor: color }]} />
      <View style={[styles.boxLine, { backgroundColor: color }]} />
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: value > 999 ? "compact" : "standard" }).format(value);
}

function formatReference(value: string) {
  return value.slice(0, 6).toUpperCase();
}

function formatDueTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}

function isOverdue(booking: MobileBooking) {
  return booking.status === "checked_out" && new Date(booking.requestedEndAt).getTime() < Date.now();
}

const styles = StyleSheet.create({
  alertStem: {
    borderRadius: 999,
    height: 6,
    position: "absolute",
    top: 8,
    width: 2
  },
  alertTriangle: {
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    height: 0,
    width: 0
  },
  assetCaption: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    maxWidth: 210
  },
  assetCount: {
    color: colors.text,
    fontSize: 64,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 70
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#2C3A78",
    borderColor: colors.surface,
    borderRadius: 22,
    borderWidth: 4,
    height: 62,
    justifyContent: "center",
    width: 62,
    ...shadows.soft
  },
  avatarSmall: {
    alignItems: "center",
    backgroundColor: "#2C3A78",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  avatarSmallText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  avatarText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900"
  },
  bellBase: {
    backgroundColor: colors.iconMuted,
    borderRadius: 999,
    height: 3,
    marginTop: -1,
    width: 16
  },
  bellBody: {
    borderColor: colors.iconMuted,
    borderRadius: 8,
    borderWidth: 2,
    height: 17,
    width: 16
  },
  bellGlyph: {
    alignItems: "center",
    justifyContent: "center"
  },
  boxIcon: {
    borderRadius: 5,
    borderWidth: 2,
    height: 16,
    width: 18
  },
  boxLine: {
    borderRadius: 999,
    height: 2,
    marginTop: -9,
    width: 9
  },
  brandName: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29
  },
  cardLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  checkStem: {
    borderBottomWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopWidth: 0,
    height: 14,
    transform: [{ rotate: "45deg" }],
    width: 8
  },
  clockHandLong: {
    borderRadius: 999,
    height: 7,
    position: "absolute",
    top: 4,
    width: 2
  },
  clockHandShort: {
    borderRadius: 999,
    height: 2,
    left: 10,
    position: "absolute",
    top: 10,
    width: 5
  },
  clockIcon: {
    borderRadius: 999,
    borderWidth: 2
  },
  department: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  },
  disabled: {
    opacity: 0.5
  },
  defectList: {
    gap: 10
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  emptyCard: {
    gap: 6,
    paddingVertical: 20
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  healthCaption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  healthCard: {
    gap: 18,
    padding: 20
  },
  healthCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  healthHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  healthTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  heroGrid: {
    flexDirection: "row",
    gap: 14
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 6
  },
  iconCanvas: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    minWidth: 0
  },
  identityCopy: {
    flex: 1,
    minWidth: 0
  },
  incidentCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 76,
    padding: 12
  },
  incidentCopy: {
    flex: 1,
    flexBasis: 150,
    gap: 3,
    minWidth: 0
  },
  incidentMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  incidentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  metricCard: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 10,
    minHeight: 130,
    padding: 16
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19
  },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 34
  },
  miniStat: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    flex: 1,
    gap: 2,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  miniStatLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  miniStatValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  monitorScreen: {
    borderRadius: 5,
    borderWidth: 2,
    height: 16,
    width: 20
  },
  monitorStand: {
    borderRadius: 999,
    height: 3,
    marginTop: 2,
    width: 12
  },
  messageBubble: {
    borderRadius: 7,
    borderWidth: 2,
    height: 15,
    width: 19
  },
  messageTail: {
    borderLeftColor: "transparent",
    borderLeftWidth: 4,
    borderRightColor: "transparent",
    borderRightWidth: 0,
    borderTopWidth: 5,
    height: 0,
    marginLeft: -8,
    marginTop: -2,
    width: 0
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    position: "relative",
    width: 58,
    ...shadows.soft
  },
  notificationDot: {
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 14,
    top: 13,
    width: 12
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }]
  },
  primaryCard: {
    flex: 1,
    gap: 12,
    minHeight: 214,
    padding: 22
  },
  progressArc: {
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    borderRadius: 999,
    borderRightColor: colors.primary,
    borderTopColor: colors.primary,
    borderWidth: 9,
    height: 76,
    position: "absolute",
    width: 76
  },
  progressCount: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    minWidth: 34,
    textAlign: "right"
  },
  progressFill: {
    borderRadius: 999,
    height: 8
  },
  progressInner: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    width: 86
  },
  progressList: {
    gap: 13
  },
  progressRing: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 82,
    justifyContent: "center",
    overflow: "hidden",
    width: 82
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: "hidden"
  },
  progressValue: {
    color: colors.text,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    fontWeight: "900"
  },
  qrBlock: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: 13,
    width: 13
  },
  qrBlockRow: {
    flexDirection: "row",
    gap: 5
  },
  qrBlockWide: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: 13,
    width: 22
  },
  queueCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 84,
    padding: 14
  },
  queueCopy: {
    flex: 1,
    flexBasis: 150,
    gap: 4,
    minWidth: 0
  },
  queueList: {
    gap: 10
  },
  queueMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  queueTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minWidth: 140,
    minHeight: 50,
    paddingHorizontal: 10,
    ...shadows.soft
  },
  quickActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  scanBottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    left: 0
  },
  scanBottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    right: 0
  },
  scanCard: {
    alignItems: "center",
    backgroundColor: colors.mintSoft,
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: spacing.radiusLarge,
    borderWidth: 1,
    gap: 16,
    justifyContent: "center",
    minHeight: 214,
    padding: 16,
    width: 126,
    ...shadows.card
  },
  scanCorner: {
    borderColor: colors.primary,
    borderRadius: 5,
    borderWidth: 3,
    height: 18,
    position: "absolute",
    width: 18
  },
  scanFrame: {
    alignItems: "center",
    height: 86,
    justifyContent: "center",
    position: "relative",
    width: 86
  },
  scanGlyphBox: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 20,
    gap: 5,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  scanMiniBottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    left: 0
  },
  scanMiniBottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    right: 0
  },
  scanMiniCorner: {
    borderRadius: 3,
    borderWidth: 2,
    height: 8,
    position: "absolute",
    width: 8
  },
  scanMiniTopLeft: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    left: 0,
    top: 0
  },
  scanMiniTopRight: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    right: 0,
    top: 0
  },
  scanTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    textAlign: "center"
  },
  scanTopLeft: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    left: 0,
    top: 0
  },
  scanTopRight: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    right: 0,
    top: 0
  },
  sectionAction: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: 4
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  },
  severityCritical: {
    backgroundColor: colors.danger
  },
  severityIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  severityReview: {
    backgroundColor: colors.purple
  },
  severityText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 4
  }
});
