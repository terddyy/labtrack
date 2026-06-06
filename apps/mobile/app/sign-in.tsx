import { buildQuickLoginAccounts, type QuickLoginAccount } from "@labtrack/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors, shadows, spacing } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, hasSupabaseConfig, signInWithPassword, signUpWithPassword } from "@/lib/labtrack-api";

type AuthMode = "sign-in" | "sign-up";
type AuthMessage = { tone: "danger" | "success"; text: string };

const isQuickLoginEnabled = process.env.EXPO_PUBLIC_ENABLE_QUICK_LOGIN !== "false";
const quickLoginAccounts = isQuickLoginEnabled
  ? buildQuickLoginAccounts(
    {
      super_admin: {
        email: process.env.EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL,
        password: process.env.EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD
      },
      admin: {
        email: process.env.EXPO_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL,
        password: process.env.EXPO_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD
      },
      instructor: {
        email: process.env.EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL,
        password: process.env.EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD
      }
    },
    {
      includeDefaults: true,
      roles: ["super_admin", "admin", "instructor"] as const
    }
  )
  : [];

export default function SignInScreen() {
  const auth = useCurrentProfile();
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuickRole, setPendingQuickRole] = useState<string | null>(null);
  const isConfigured = hasSupabaseConfig();
  const isSignUp = authMode === "sign-up";
  const isManualAuthDisabled = isSubmitting || !isConfigured || !email.trim() || !password || (isSignUp && !fullName.trim());

  async function handleManualAuth() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const result = await signUpWithPassword(email.trim(), password, fullName);

        if (!result.signedIn) {
          setMessage({ tone: "success", text: "Registration submitted. Check your email to confirm the account before signing in." });
          return;
        }
      } else {
        await signInWithPassword(email.trim(), password);
      }

      await auth.refresh({ showLoading: true });
      router.replace("/");
    } catch (error) {
      setMessage({ tone: "danger", text: formatApiError(error) });
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
      await auth.refresh({ showLoading: true });
      router.replace("/");
    } catch (error) {
      setMessage({ tone: "danger", text: formatApiError(error) });
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
            <Image
              accessibilityIgnoresInvertColors
              source={require("../assets/brand/labtrack-icon.png")}
              style={styles.brandMarkImage}
            />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>LABTRACK</Text>
            <Text style={styles.brandCaption}>Mobile asset access</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Soft, fast lab operations in one secure mobile workspace.</Text>
        <Text style={styles.heroCaption}>Scan assets, submit borrowing requests, and report defects with your LABTRACK account.</Text>
      </View>

      {!isConfigured ? <Notice tone="warning">Supabase mobile configuration is missing.</Notice> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card style={styles.formPanel}>
        <SectionTitle
          title={isSignUp ? "Create account" : "Sign in"}
          caption={isSignUp ? "Register with your LABTRACK borrowing account details." : "Use your LABTRACK account to open the mobile workflow."}
        />
        <View style={styles.authModeRow}>
          <Button disabled={isSubmitting} fullWidth={false} onPress={() => setAuthMode("sign-in")} style={styles.authModeButton} variant={isSignUp ? "secondary" : "primary"}>
            Sign in
          </Button>
          <Button disabled={isSubmitting} fullWidth={false} onPress={() => setAuthMode("sign-up")} style={styles.authModeButton} variant={isSignUp ? "primary" : "secondary"}>
            Register
          </Button>
        </View>
        {isSignUp ? (
          <Field
            autoCapitalize="words"
            label="Full name"
            onChangeText={setFullName}
            placeholder="Juan Dela Cruz"
            textContentType="name"
            value={fullName}
          />
        ) : null}
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="faculty@pampangastateu.edu.ph"
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
        <Button disabled={isManualAuthDisabled} loading={isSubmitting && !pendingQuickRole} onPress={handleManualAuth}>
          {isSignUp ? "Create account" : "Open dashboard"}
        </Button>
      </Card>

      {quickLoginAccounts.length ? (
        <Card style={styles.quickPanel}>
          <SectionTitle title="Quick login" caption="Sample production accounts for one-tap access." />
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
  authModeButton: {
    flex: 1
  },
  authModeRow: {
    flexDirection: "row",
    gap: 10
  },
  brandCaption: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  brandCopy: {
    flex: 1,
    gap: 2
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surface,
    borderRadius: 22,
    borderWidth: 3,
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58,
    ...shadows.soft
  },
  brandMarkImage: {
    height: 58,
    width: 58
  },
  brandName: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  formPanel: {
    gap: 16
  },
  heroCaption: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  },
  heroPanel: {
    backgroundColor: colors.mintSoft,
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: spacing.radiusLarge,
    borderWidth: 1,
    gap: 16,
    padding: 22,
    ...shadows.card
  },
  heroTitle: {
    color: colors.text,
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
