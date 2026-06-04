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
import { colors, shadows, spacing } from "@/constants/theme";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "secondary";

const toneStyles: Record<Tone, { background: string; border: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, border: colors.border, text: colors.muted },
  success: { background: colors.successMuted, border: colors.success, text: colors.success },
  warning: { background: colors.warningMuted, border: colors.warning, text: colors.warning },
  danger: { background: colors.dangerMuted, border: colors.danger, text: colors.danger },
  info: { background: colors.blueMuted, border: colors.blue, text: colors.blue },
  secondary: { background: colors.purpleMuted, border: colors.purple, text: colors.purple }
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
        { paddingBottom: Math.max(insets.bottom + 112, 128) },
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
        placeholderTextColor={colors.subtle}
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
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
    textTransform: "capitalize"
  },
  button: {
    alignItems: "center",
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 13
  },
  buttonAuto: {
    alignSelf: "flex-start"
  },
  buttonFull: {
    alignSelf: "stretch"
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.accent
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    ...shadows.soft
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
    color: colors.primaryDark
  },
  buttonTextSubtle: {
    color: colors.primaryDark
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: spacing.radius,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    ...shadows.card,
    ...Platform.select({ ios: { borderCurve: "continuous" } })
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
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 22
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23
  },
  field: {
    gap: 8
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  inlineMeta: {
    borderTopColor: colors.surfaceMuted,
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 12
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
    fontWeight: "700",
    lineHeight: 21
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  notice: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  noticeText: {
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }]
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
    paddingTop: 18,
    width: "100%"
  },
  screenViewport: {
    alignItems: "center",
    flexGrow: 1
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  sectionTitle: {
    gap: 5
  },
  sectionTitleText: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26
  }
});
