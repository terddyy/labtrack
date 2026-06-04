import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants/theme";

type Tone = "neutral" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, { background: string; border: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, border: colors.border, text: colors.muted },
  success: { background: colors.successMuted, border: colors.success, text: colors.success },
  warning: { background: colors.warningMuted, border: colors.warning, text: colors.warning },
  danger: { background: colors.dangerMuted, border: colors.danger, text: colors.danger }
};

export function ScreenScrollView({
  children,
  contentContainerStyle,
  includeTopInset = false,
  ...props
}: ScrollViewProps & { children: ReactNode; includeTopInset?: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
      style={[styles.screen, props.style]}
      contentContainerStyle={[
        styles.screenViewport,
        includeTopInset ? { paddingTop: Math.max(insets.top + 16, 28) } : null,
        { paddingBottom: Math.max(insets.bottom + 24, 32) },
        contentContainerStyle
      ]}
    >
      <View style={styles.screenInner}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  children,
  disabled = false,
  fullWidth = true,
  loading = false,
  onPress,
  style,
  textStyle,
  variant = "primary",
  ...props
}: Omit<PressableProps, "children" | "disabled" | "onPress" | "style"> & {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  onPress?: PressableProps["onPress"];
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  textStyle?: StyleProp<TextStyle>;
  variant?: "primary" | "secondary" | "subtle";
}) {
  const isPrimary = variant === "primary";
  const isSubtle = variant === "subtle";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={8}
      onPress={onPress}
      {...props}
      style={({ pressed }) => [
        styles.button,
        fullWidth ? styles.buttonFull : styles.buttonAuto,
        isPrimary ? styles.buttonPrimary : isSubtle ? styles.buttonSubtle : styles.buttonSecondary,
        isDisabled ? styles.disabled : pressed ? styles.pressed : null,
        typeof style === "function" ? style({ pressed }) : style
      ]}
    >
      {loading ? <ActivityIndicator color={isPrimary ? colors.surface : colors.primary} size="small" /> : null}
      <Text
        numberOfLines={2}
        style={[
          styles.buttonText,
          isPrimary ? styles.buttonTextPrimary : isSubtle ? styles.buttonTextSubtle : styles.buttonTextSecondary,
          isDisabled ? styles.buttonTextDisabled : null,
          textStyle
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.notice, { backgroundColor: toneStyle.background, borderColor: toneStyle.border }]}>
      <Text style={[styles.noticeText, { color: toneStyle.text }]}>{children}</Text>
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.background }]}>
      <Text numberOfLines={1} style={[styles.badgeText, { color: toneStyle.text }]}>
        {label.replaceAll("_", " ")}
      </Text>
    </View>
  );
}

export function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

export function EmptyState({ action, body, title }: { action?: ReactNode; body: string; title: string }) {
  return (
    <Card style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </Card>
  );
}

export function Field({
  inputStyle,
  label,
  style,
  ...props
}: TextInputProps & { inputStyle?: StyleProp<TextStyle>; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline ? styles.inputMultiline : null, inputStyle]}
        {...props}
      />
    </View>
  );
}

export function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineMeta}>
      <Text style={styles.inlineMetaLabel}>{label}</Text>
      <Text selectable style={styles.inlineMetaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  button: {
    alignItems: "center",
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonAuto: {
    alignSelf: "flex-start"
  },
  buttonFull: {
    alignSelf: "stretch"
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  buttonSubtle: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryMuted
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center"
  },
  buttonTextDisabled: {
    color: colors.muted
  },
  buttonTextPrimary: {
    color: colors.surface
  },
  buttonTextSecondary: {
    color: colors.text
  },
  buttonTextSubtle: {
    color: colors.primaryDark
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    ...Platform.select({ android: { elevation: 1 } })
  },
  disabled: {
    opacity: 0.58
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  emptyState: {
    gap: 8
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  field: {
    gap: 7
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  inlineMeta: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 10
  },
  inlineMetaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  inlineMetaValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  notice: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.82
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  screenInner: {
    boxSizing: "border-box",
    gap: spacing.gap,
    maxWidth: 390,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.page,
    width: "100%"
  },
  screenViewport: {
    alignItems: "center",
    flexGrow: 1
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  sectionTitle: {
    gap: 4
  },
  sectionTitleText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25
  }
});
