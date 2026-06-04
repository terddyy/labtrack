import { getRoleDisplayLabel } from "@labtrack/shared";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, InlineMeta, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors, shadows } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";

export default function ProfileScreen() {
  const auth = useCurrentProfile();

  if (auth.status !== "ready") {
    return null;
  }

  const roleLabel = getRoleDisplayLabel(auth.profile.role);
  const initials = getInitials(auth.profile.fullName);

  return (
    <ScreenScrollView>
      <Card style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Badge label={roleLabel} tone="success" />
          <Text style={styles.name}>{auth.profile.fullName}</Text>
          <Text style={styles.email}>{auth.profile.email}</Text>
        </View>
      </Card>

      <View style={styles.metricGrid}>
        <Card style={styles.profileMetric}>
          <Text style={styles.metricValue}>Active</Text>
          <Text style={styles.metricLabel}>Account status</Text>
        </Card>
        <Card style={styles.profileMetric}>
          <Text numberOfLines={1} style={styles.metricValue}>{auth.profile.department ?? "Lab"}</Text>
          <Text style={styles.metricLabel}>Department</Text>
        </Card>
      </View>

      <Card style={styles.detailCard}>
        <SectionTitle title="Account details" caption="Profile information used by LABTRACK workflows." />
        <InlineMeta label="Department" value={auth.profile.department ?? "Not assigned"} />
        <InlineMeta label="Status" value={auth.profile.isActive ? "Active" : "Inactive"} />
      </Card>

      <Button onPress={() => void auth.signOut()} variant="secondary">
        Sign out
      </Button>
    </ScreenScrollView>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: "#2C3A78",
    borderColor: colors.surface,
    borderRadius: 28,
    borderWidth: 4,
    height: 76,
    justifyContent: "center",
    width: 76,
    ...shadows.soft
  },
  avatarText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900"
  },
  detailCard: {
    gap: 16
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: colors.mintSoft,
    borderColor: "rgba(255,255,255,0.84)",
    flexDirection: "row",
    gap: 16,
    padding: 22
  },
  heroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  profileMetric: {
    flex: 1,
    gap: 5,
    minHeight: 86,
    padding: 16
  }
});
