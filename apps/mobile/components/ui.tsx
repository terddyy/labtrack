import type { ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { colors, spacing } from "@/constants/theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: spacing.radius, borderWidth: 1, padding: 16, gap: 12 }, style]}>
      {children}
    </View>
  );
}

export function Button({ children, onPress, variant = "primary" }: { children: ReactNode; onPress?: () => void; variant?: "primary" | "secondary" }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: isPrimary ? colors.primary : colors.surface,
        borderColor: isPrimary ? colors.primary : colors.border,
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 46,
        justifyContent: "center",
        paddingHorizontal: 16
      }}
    >
      <Text selectable style={{ color: isPrimary ? colors.surface : colors.text, fontWeight: "700" }}>{children}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneColor = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : colors.muted;
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text selectable style={{ color: toneColor, fontSize: 12, fontWeight: "800" }}>{label.replaceAll("_", " ")}</Text>
    </View>
  );
}

export function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{title}</Text>
      {caption ? <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>{caption}</Text> : null}
    </View>
  );
}
