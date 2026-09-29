import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/icons";
import { Button, Card, ConsoleHeader, Field, Notice, ScreenScrollView, SegmentedControl } from "@/components/ui";
import { colors, typography } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, hasSupabaseConfig, signInWithPassword, signUpWithPassword } from "@/lib/labtrack-api";

type AuthMode = "sign-in" | "sign-up";
type BorrowerRole = "faculty" | "student";
type AuthMessage = { tone: "danger" | "success"; text: string };

const authModes: Array<{ label: string; value: AuthMode }> = [
  { label: "Sign in", value: "sign-in" },
  { label: "Register", value: "sign-up" }
];
const borrowerRoles: Array<{ label: string; value: BorrowerRole }> = [
  { label: "Faculty", value: "faculty" },
  { label: "Student", value: "student" }
];

export default function SignInScreen() {
  const auth = useCurrentProfile();
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [borrowerRole, setBorrowerRole] = useState<BorrowerRole>("student");
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isConfigured = hasSupabaseConfig();
  const isSignUp = authMode === "sign-up";
  const isManualAuthDisabled = isSubmitting || !isConfigured || !email.trim() || !password || (isSignUp && !fullName.trim());

  async function handleManualAuth() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const result = await signUpWithPassword(email.trim(), password, fullName, borrowerRole);

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

  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption="Scan equipment, borrow rooms, and report defects from your pocket."
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
            <Highlight icon="borrow" label="Borrow" />
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
          <>
            <Field
              autoCapitalize="words"
              label="Full name"
              onChangeText={setFullName}
              placeholder="Juan Dela Cruz"
              textContentType="name"
              value={fullName}
            />
            <View style={styles.roleField}>
              <Text style={styles.roleLabel}>Account type</Text>
              <SegmentedControl onChange={setBorrowerRole} options={borrowerRoles} value={borrowerRole} />
              {!borrowerRole ? <Text style={styles.roleHint}>Choose the account type that matches your school role.</Text> : null}
            </View>
          </>
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
        <Button disabled={isManualAuthDisabled} loading={isSubmitting} onPress={handleManualAuth}>
          {isSignUp ? "Create account" : "Continue"}
        </Button>
        {!isSignUp ? <Text style={styles.formCaption}>Sign in with the LABTRACK email and password issued for your account.</Text> : null}
      </Card>

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
  },
  roleField: {
    gap: 7
  },
  roleHint: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 17
  },
  roleLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  }
});
