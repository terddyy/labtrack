import { buildQuickLoginAccounts, type QuickLoginAccount } from "@labtrack/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/icons";
import { Button, Card, ConsoleHeader, Field, ListRow, Notice, ScreenScrollView, SegmentedControl } from "@/components/ui";
import { colors, typography } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, hasSupabaseConfig, signInWithPassword, signUpWithPassword } from "@/lib/labtrack-api";

type AuthMode = "sign-in" | "sign-up";
type AuthMessage = { tone: "danger" | "success"; text: string };

const authModes: Array<{ label: string; value: AuthMode }> = [
  { label: "Sign in", value: "sign-in" },
  { label: "Register", value: "sign-up" }
];

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
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption="Scan equipment, reserve rooms, and report defects from your pocket."
          eyebrow="Labtrack · Mobile access"
          right={(
            <View style={styles.brandMark}>
              <Image
                accessibilityIgnoresInvertColors
                source={require("../assets/brand/labtrack-icon.png")}
                style={styles.brandMarkImage}
              />
            </View>
          )}
          title={"Every device,\naccounted for."}
        >
          <View style={styles.highlights}>
            <Highlight icon="scan" label="QR scan" />
            <Highlight icon="borrow" label="Reserve" />
            <Highlight icon="wrench" label="Report" />
          </View>
        </ConsoleHeader>
      )}
    >
      {!isConfigured ? <Notice tone="warning">Supabase mobile configuration is missing.</Notice> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
          <Text style={styles.formCaption}>
            {isSignUp ? "Register with your LABTRACK borrowing account details." : "Use your LABTRACK account to continue."}
          </Text>
        </View>
        <SegmentedControl
          onChange={(mode) => {
            if (!isSubmitting) setAuthMode(mode);
          }}
          options={authModes}
          value={authMode}
        />
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
          {isSignUp ? "Create account" : "Continue"}
        </Button>
      </Card>

      {quickLoginAccounts.length ? (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>DEMO ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>
          <Card style={styles.groupCard}>
            {quickLoginAccounts.map((account, index) => (
              <ListRow
                divider={index > 0}
                key={account.role}
                leading={(
                  <View style={styles.quickIcon}>
                    <AppIcon color={colors.primary} name="flash" size={16} />
                  </View>
                )}
                meta={account.email}
                onPress={isSubmitting || !isConfigured ? undefined : () => void handleQuickSignIn(account)}
                title={account.label}
                trailing={
                  pendingQuickRole === account.role
                    ? <Text style={styles.quickPending}>Signing in…</Text>
                    : <AppIcon color={colors.subtle} name="chevron-forward" size={16} />
                }
              />
            ))}
          </Card>
        </>
      ) : null}
    </ScreenScrollView>
  );
}

function Highlight({ icon, label }: { icon: "scan" | "borrow" | "wrench"; label: string }) {
  return (
    <View style={styles.highlight}>
      <AppIcon color={colors.inkAccent} name={icon} size={15} />
      <Text style={styles.highlightText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    borderColor: colors.inkBorder,
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    overflow: "hidden",
    width: 52
  },
  brandMarkImage: {
    height: 52,
    width: 52
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingTop: 8
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: StyleSheet.hairlineWidth
  },
  dividerText: {
    color: colors.subtle,
    ...typography.eyebrow
  },
  formCaption: {
    color: colors.muted,
    ...typography.caption
  },
  formCard: {
    gap: 14,
    padding: 18
  },
  formHeader: {
    gap: 3
  },
  formTitle: {
    color: colors.text,
    ...typography.title,
    fontSize: 20
  },
  groupCard: {
    gap: 0,
    paddingVertical: 2
  },
  highlight: {
    alignItems: "center",
    backgroundColor: colors.inkRaised,
    borderColor: colors.inkBorder,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6
  },
  highlightText: {
    color: colors.inkText,
    fontSize: 12.5,
    fontWeight: "500"
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  quickPending: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: "600"
  }
});
