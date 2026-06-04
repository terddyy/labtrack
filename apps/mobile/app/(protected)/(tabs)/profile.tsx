import { getRoleDisplayLabel } from "@labtrack/shared";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, InlineMeta, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
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

      <Card>
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
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  avatarText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900"
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  heroCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  heroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  }
});
