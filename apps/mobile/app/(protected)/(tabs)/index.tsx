import { Link, router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { useDashboardSummary } from "@/lib/use-dashboard-summary";
import { registerForPushNotifications } from "@/lib/notifications";

type DashboardHref = "/borrow" | "/notifications" | "/reports" | "/scan" | "/ticket";

export default function HomeScreen() {
  const auth = useCurrentProfile();
  const isReady = auth.status === "ready";
  const { summary } = useDashboardSummary(isReady);
  const profile = auth.status === "ready" || auth.status === "inactive" ? auth.profile : null;
  const displayName = profile?.fullName ?? "Lab instructor";
  const roleLabel = profile?.role.replaceAll("_", " ") ?? "mobile workspace";
  const firstName = displayName.split(" ")[0] || displayName;

  const actionRows = useMemo(
    () => [
      {
        accent: colors.primary,
        caption: "Open the camera and resolve an equipment QR code.",
        href: "/scan" as const,
        label: "Scan equipment",
        value: "QR"
      },
      {
        accent: colors.secondary,
        caption: `${summary.pendingBookings} active of ${summary.bookings} total borrow requests.`,
        href: "/borrow" as const,
        label: "Borrow items",
        value: String(summary.pendingBookings)
      },
      {
        accent: colors.coral,
        caption: `${summary.openDefects} reports need follow-up.`,
        href: "/reports" as const,
        label: "Defect reports",
        value: String(summary.openDefects)
      },
      {
        accent: colors.pink,
        caption: `${summary.unreadNotifications} unread updates from LABTRACK.`,
        href: "/notifications" as const,
        label: "Notifications",
        value: String(summary.unreadNotifications)
      },
      {
        accent: colors.success,
        caption: `${summary.threads} borrow or defect conversations.`,
        href: "/ticket" as const,
        label: "Ticket chat",
        value: String(summary.threads)
      }
    ],
    [summary.bookings, summary.openDefects, summary.pendingBookings, summary.threads, summary.unreadNotifications]
  );

  useEffect(() => {
    if (auth.status === "ready") {
      void registerForPushNotifications();
    }
  }, [auth.status]);

  return (
    <ScreenScrollView>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.greeting}>Hello</Text>
            <Text numberOfLines={1} style={styles.name}>
              {firstName}
            </Text>
          </View>
        </View>
        <NotificationAction disabled={!isReady} unread={summary.unreadNotifications} />
      </View>

      {auth.status === "missing-config" ? (
        <Notice tone="warning">Supabase mobile configuration is missing. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.</Notice>
      ) : null}
      {auth.status === "error" ? <Notice tone="danger">{auth.error}</Notice> : null}
      {auth.status === "inactive" ? (
        <Notice tone="danger">Your LABTRACK profile is inactive. Contact an administrator before scanning or submitting requests.</Notice>
      ) : null}
      {summary.error ? <Notice tone="warning">{summary.error}</Notice> : null}

      <Card style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Instructor workspace</Text>
          <Text style={styles.heroTitle}>{isReady ? "Ready for lab handoffs" : "Sign in to start scanning"}</Text>
          <Text style={styles.heroText}>
            {isReady
              ? "Scan QR labels, track approvals, report defects, and keep ticket replies in one queue."
              : "Authentication unlocks QR scanning, borrow requests, defect reports, ticket chat, and notifications."}
          </Text>
        </View>
        <Link href={isReady ? "/scan" : "/sign-in"} asChild>
          <Button fullWidth={false} variant={isReady ? "primary" : "subtle"}>
            {isReady ? "Scan QR" : "Sign in"}
          </Button>
        </Link>
      </Card>

      {auth.status === "signed-out" ? (
        <Card style={styles.accountCard}>
          <SectionTitle title="Sign in required" caption="Use your LABTRACK account before scanning or submitting equipment requests." />
          <Link href="/sign-in" asChild>
            <Button>Sign in</Button>
          </Link>
        </Card>
      ) : null}

      {profile ? (
        <Card style={styles.accountCard}>
          <View style={styles.accountRow}>
            <View style={styles.accountCopy}>
              <Badge label={roleLabel} tone={auth.status === "ready" ? "success" : "danger"} />
              <Text numberOfLines={1} style={styles.accountName}>
                {displayName}
              </Text>
              <Text numberOfLines={1} style={styles.accountEmail}>
                {profile.email}
              </Text>
            </View>
            <Button fullWidth={false} onPress={() => void auth.signOut()} variant="secondary">
              Sign out
            </Button>
          </View>
        </Card>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionTitle title="Open work" caption={summary.isLoading ? "Syncing your current queues." : "Current borrow, defect, and message pressure."} />
        <View style={styles.statusGrid}>
          <StatusTile accent={colors.secondary} label="Borrows" value={summary.pendingBookings} />
          <StatusTile accent={colors.coral} label="Defects" value={summary.openDefects} />
          <StatusTile accent={colors.pink} label="Unread" value={summary.unreadNotifications} />
          <StatusTile accent={colors.success} label="Threads" value={summary.threads} />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle title="Actions" caption="Choose the workflow you need during setup or class handoff." />
        <View style={styles.actionList}>
          {actionRows.map((row) => (
            <ActionRow
              accent={row.accent}
              caption={row.caption}
              disabled={!isReady}
              href={row.href}
              key={row.label}
              label={row.label}
              value={row.value}
            />
          ))}
        </View>
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
      <Text style={styles.notificationText}>{unread}</Text>
    </Pressable>
  );
}

function StatusTile({ accent, label, value }: { accent: string; label: string; value: number }) {
  return (
    <View style={styles.statusTile}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  accent,
  caption,
  disabled,
  href,
  label,
  value
}: {
  accent: string;
  caption: string;
  disabled: boolean;
  href: DashboardHref;
  label: string;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.actionRow, disabled ? styles.disabled : pressed ? styles.pressed : null]}
    >
      <View style={[styles.actionMarker, { backgroundColor: `${accent}1A` }]}>
        <Text style={[styles.actionMarkerText, { color: accent }]}>{value}</Text>
      </View>
      <View style={styles.actionCopy}>
        <Text numberOfLines={1} style={styles.actionLabel}>
          {label}
        </Text>
        <Text numberOfLines={2} style={styles.actionCaption}>
          {caption}
        </Text>
      </View>
      <Text style={styles.actionChevron}>{">"}</Text>
    </Pressable>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

const styles = StyleSheet.create({
  accountCard: {
    gap: 14
  },
  accountCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  accountEmail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  accountName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  actionCaption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  actionChevron: {
    color: colors.muted,
    fontSize: 28,
    lineHeight: 28
  },
  actionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  actionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  actionList: {
    gap: 10
  },
  actionMarker: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  actionMarkerText: {
    fontSize: 13,
    fontWeight: "900"
  },
  actionRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    padding: 12
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  avatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  greeting: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.secondaryMuted,
    gap: 14
  },
  heroCopy: {
    gap: 7
  },
  heroText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  identityCopy: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  notificationText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.82
  },
  sectionBlock: {
    gap: 12
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  statusTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    minHeight: 74,
    padding: 13
  },
  statusValue: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  }
});
