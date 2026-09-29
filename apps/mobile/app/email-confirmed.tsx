import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/icons";
import { Button, Card, ConsoleHeader, ScreenScrollView } from "@/components/ui";
import { colors, typography } from "@/constants/theme";

export default function EmailConfirmedScreen() {
  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption="Your LABTRACK borrowing account is ready."
          eyebrow="Labtrack · Account confirmation"
          title={"Email confirmed.\nYou’re ready to sign in."}
        />
      )}
    >
      <Card style={styles.card}>
        <View style={styles.icon}>
          <AppIcon color={colors.success} name="check" size={22} />
        </View>
        <Text style={styles.title}>Your email is confirmed</Text>
        <Text style={styles.body}>You can now sign in to LABTRACK with the email address and password you registered.</Text>
        <Button icon="chevron-forward" onPress={() => router.replace("/sign-in")}>
          Go to sign in
        </Button>
      </Card>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    ...typography.body
  },
  card: {
    gap: 14,
    padding: 20
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.successMuted,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  title: {
    color: colors.text,
    ...typography.title,
    fontSize: 19
  }
});
