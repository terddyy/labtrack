import { getRoleDisplayLabel } from "@labtrack/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { RegistrationMarks } from "@/components/glass";
import { AppIcon, type AppIconName } from "@/components/icons";
import { Button, Card, ConsoleHeader, IconTile, ListRow, Notice, ScreenScrollView, SectionHeader, getInitials } from "@/components/ui";
import { colors, fonts, typography } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, resetMyActivityData } from "@/lib/labtrack-api";

const shortcuts: Array<{ caption: string; icon: AppIconName; label: string; route: "/borrow" | "/scan" | "/ticket" | "/reports" }> = [
  { caption: "Reservations and history", icon: "borrow", label: "Borrowing", route: "/borrow" },
  { caption: "Your submitted incidents", icon: "wrench", label: "Defect reports", route: "/reports" },
  { caption: "Conversations with custodians", icon: "ticket", label: "Support tickets", route: "/ticket" },
  { caption: "Open an asset by its label", icon: "scan", label: "Scan a QR code", route: "/scan" }
];

type ResetMessage = { tone: "danger" | "success"; text: string };

export default function ProfileScreen() {
  const auth = useCurrentProfile();
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<ResetMessage | null>(null);

  if (auth.status !== "ready") {
    return null;
  }

  const roleLabel = getRoleDisplayLabel(auth.profile.role);

  function confirmReset() {
    Alert.alert(
      "Reset app data?",
      "This clears your borrowings, defect reports, support tickets, and notifications. Your account stays signed in.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Reset",
          onPress: () => {
            void runReset();
          }
        }
      ]
    );
  }

  async function runReset() {
    setIsResetting(true);
    setResetMessage(null);

    try {
      const result = await resetMyActivityData();
      setResetMessage({
        tone: "success",
        text: `Cleared ${result.bookings_deleted} borrowings, ${result.defect_reports_deleted} defect reports, ${result.notifications_deleted} notifications.`
      });
    } catch (error) {
      setResetMessage({ tone: "danger", text: formatApiError(error) });
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader eyebrow={`${roleLabel} workspace`} title="Profile">
          <View style={styles.idCard}>
            <View style={styles.idAvatar}>
              <RegistrationMarks color={colors.inkAccent} size={10} thickness={2} />
              <Text style={styles.idInitials}>{getInitials(auth.profile.fullName)}</Text>
            </View>
            <View style={styles.idCopy}>
              <Text numberOfLines={2} style={styles.idName}>{auth.profile.fullName}</Text>
              <Text numberOfLines={1} style={styles.idEmail}>{auth.profile.email}</Text>
              <View style={styles.idStatus}>
                <View style={[styles.idStatusDot, { backgroundColor: auth.profile.isActive ? colors.mint : "#FF8A7A" }]} />
                <Text style={styles.idStatusText}>{auth.profile.isActive ? "ACTIVE" : "INACTIVE"} · {roleLabel.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </ConsoleHeader>
      )}
    >
      <Card style={styles.groupCard}>
        <ListRow leading={<IconTile icon="building" size={36} />} subtitle={auth.profile.department ?? "Not assigned"} title="Department" />
        <ListRow divider leading={<IconTile icon="mail" size={36} />} subtitle={auth.profile.email} title="Email" />
      </Card>

      <SectionHeader title="Shortcuts" />
      <Card style={styles.groupCard}>
        {shortcuts.map((shortcut, index) => (
          <ListRow
            divider={index > 0}
            key={shortcut.route}
            leading={<IconTile icon={shortcut.icon} size={36} tone="info" />}
            onPress={() => router.push(shortcut.route)}
            subtitle={shortcut.caption}
            title={shortcut.label}
            trailing={<AppIcon color={colors.subtle} name="chevron-forward" size={16} />}
          />
        ))}
      </Card>

      <SectionHeader title="Data" />
      <Card style={styles.dangerCard}>
        <View style={styles.dangerCopy}>
          <Text style={styles.dangerTitle}>Reset app data</Text>
          <Text style={styles.dangerCaption}>
            Clear your borrowings, defect reports, support tickets, and notifications. Your account stays signed in.
          </Text>
        </View>
        {resetMessage ? <Notice tone={resetMessage.tone}>{resetMessage.text}</Notice> : null}
        <Button disabled={isResetting} icon="trash" loading={isResetting} onPress={confirmReset} variant="danger">
          Reset my data
        </Button>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => void auth.signOut()}
        style={({ pressed }) => [styles.signOut, pressed ? styles.signOutPressed : null]}
      >
        <AppIcon color={colors.danger} name="logout" size={18} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <Text style={styles.version}>LABTRACK MOBILE</Text>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  dangerCaption: {
    color: colors.muted,
    ...typography.caption
  },
  dangerCard: {
    gap: 12
  },
  dangerCopy: {
    gap: 3
  },
  dangerTitle: {
    color: colors.text,
    ...typography.headline
  },
  groupCard: {
    gap: 0,
    paddingVertical: 2
  },
  idAvatar: {
    alignItems: "center",
    backgroundColor: colors.inkRaised,
    borderRadius: 18,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  idCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  idCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  idEmail: {
    color: colors.inkMuted,
    fontSize: 13.5
  },
  idInitials: {
    color: colors.inkText,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  idName: {
    color: colors.inkText,
    ...typography.title,
    fontSize: 20,
    lineHeight: 25
  },
  idStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  idStatusDot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  idStatusText: {
    color: colors.inkMuted,
    ...typography.eyebrow
  },
  signOut: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50
  },
  signOutPressed: {
    backgroundColor: colors.dangerMuted
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600"
  },
  version: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    paddingTop: 4,
    textAlign: "center"
  }
});
