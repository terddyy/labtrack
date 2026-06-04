import { buildQuickLoginAccounts, type QuickLoginAccount } from "@labtrack/shared";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, hasSupabaseConfig, signInWithPassword } from "@/lib/labtrack-api";

const isQuickLoginEnabled = process.env.EXPO_PUBLIC_ENABLE_QUICK_LOGIN === "true" || process.env.NODE_ENV !== "production";
const quickLoginAccounts = isQuickLoginEnabled
  ? buildQuickLoginAccounts(
    {
      instructor: {
        email: process.env.EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL,
        password: process.env.EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD
      }
    },
    {
      includeDefaults: process.env.NODE_ENV !== "production",
      roles: ["instructor"] as const
    }
  )
  : [];

export default function SignInScreen() {
  const auth = useCurrentProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuickRole, setPendingQuickRole] = useState<string | null>(null);
  const isConfigured = hasSupabaseConfig();
  const isManualSignInDisabled = isSubmitting || !isConfigured || !email.trim() || !password;

  async function handleSignIn() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await signInWithPassword(email.trim(), password);
      await auth.refresh();
      router.replace("/");
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickSignIn(account: QuickLoginAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setIsSubmitting(true);
    setPendingQuickRole(account.role);
    setMessage(null);

    try {
      await signInWithPassword(account.email, account.password);
      await auth.refresh();
      router.replace("/");
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setIsSubmitting(false);
      setPendingQuickRole(null);
    }
  }

  return (
    <ScreenScrollView contentContainerStyle={styles.screenContent} includeTopInset>
      <View style={styles.heroPanel}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>LT</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>LABTRACK</Text>
            <Text style={styles.brandCaption}>Mobile asset access</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Sign in to borrow, scan, and report lab equipment.</Text>
      </View>

      {!isConfigured ? <Notice tone="warning">Supabase mobile configuration is missing.</Notice> : null}
      {message ? <Notice tone="danger">{message}</Notice> : null}

      <Card style={styles.formPanel}>
        <SectionTitle title="Sign in" caption="Use your LABTRACK account to open the mobile workflow." />
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="instructor@labtrack.local"
          textContentType="emailAddress"
          value={email}
        />
        <Field
          autoCapitalize="none"
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        <Button disabled={isManualSignInDisabled} loading={isSubmitting && !pendingQuickRole} onPress={handleSignIn}>
          Open dashboard
        </Button>
      </Card>

      {quickLoginAccounts.length ? (
        <Card style={styles.quickPanel}>
          <SectionTitle title="Quick login" caption="Training access is shown only when quick login is enabled for this build." />
          <View style={styles.quickGrid}>
            {quickLoginAccounts.map((account) => (
              <Button
                disabled={isSubmitting || !isConfigured}
                key={account.role}
                loading={pendingQuickRole === account.role}
                onPress={() => void handleQuickSignIn(account)}
                variant="secondary"
              >
                {account.label}
              </Button>
            ))}
          </View>
        </Card>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  brandCaption: {
    color: "#C8D8EF",
    fontSize: 13,
    fontWeight: "700"
  },
  brandCopy: {
    flex: 1,
    gap: 2
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandMarkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  brandName: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  formPanel: {
    gap: 14
  },
  heroPanel: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    gap: 28,
    padding: 20
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34
  },
  quickGrid: {
    gap: 10
  },
  quickPanel: {
    gap: 14
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center"
  }
});
