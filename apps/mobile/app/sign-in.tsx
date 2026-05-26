import { buildQuickLoginAccounts, type QuickLoginAccount } from "@labtrack/shared";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { formatApiError, hasSupabaseConfig, signInWithPassword } from "@/lib/labtrack-api";

const quickLoginAccounts = buildQuickLoginAccounts({
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
});

export default function SignInScreen() {
  const auth = useCurrentProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuickRole, setPendingQuickRole] = useState<string | null>(null);
  const isConfigured = hasSupabaseConfig();

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
    <ScreenScrollView includeTopInset>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>LT</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>LABTRACK</Text>
          <Text style={styles.brandCaption}>Instructor asset workflow</Text>
        </View>
      </View>

      <Card style={styles.introCard}>
        <View style={styles.introCopy}>
          <Text style={styles.eyebrow}>Mobile portal</Text>
          <Text style={styles.heroTitle}>Scan, book, report, and reply from the lab floor.</Text>
          <Text style={styles.heroText}>
            Use the same LABTRACK account to open QR scanning, booking status, defect reports, tickets, and notifications.
          </Text>
        </View>
        <View style={styles.previewGrid}>
          <PreviewPill accent={colors.primary} label="QR scan" value="Ready" />
          <PreviewPill accent={colors.coral} label="Bookings" value="Live" />
          <PreviewPill accent={colors.secondary} label="Tickets" value="Synced" />
        </View>
      </Card>

      {!isConfigured ? <Notice tone="warning">Supabase mobile configuration is missing.</Notice> : null}
      {message ? <Notice tone="danger">{message}</Notice> : null}

      <Card style={styles.formPanel}>
        <SectionTitle title="Sign in" caption="Use your LABTRACK account to unlock scanner and workflow actions." />
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
        <Button disabled={isSubmitting || !isConfigured} loading={isSubmitting && !pendingQuickRole} onPress={handleSignIn}>
          Open dashboard
        </Button>
      </Card>

      {quickLoginAccounts.length ? (
        <Card style={styles.quickPanel}>
          <SectionTitle title="Quick access" caption="Demo accounts appear here when local credentials are configured." />
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

function PreviewPill({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <View style={styles.previewPill}>
      <View style={[styles.previewDot, { backgroundColor: accent }]} />
      <View style={styles.previewCopy}>
        <Text style={styles.previewLabel}>{label}</Text>
        <Text style={styles.previewValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandMarkText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  brandName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  formPanel: {
    gap: 14
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
  introCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: "#C3DED8",
    gap: 14
  },
  introCopy: {
    gap: 7
  },
  previewCopy: {
    flex: 1,
    gap: 1
  },
  previewDot: {
    borderRadius: 999,
    height: 9,
    width: 9
  },
  previewGrid: {
    gap: 8
  },
  previewLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  previewPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 42,
    paddingHorizontal: 11
  },
  previewValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  quickGrid: {
    gap: 10
  },
  quickPanel: {
    gap: 14
  }
});
