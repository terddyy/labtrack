import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { colors, glass, shadows, spacing } from "@/constants/theme";

export type GlassTint = "default" | "blue" | "green" | "purple" | "orange";

function hasNativeView(name: string): boolean {
  try {
    if (typeof UIManager.getViewManagerConfig === "function") {
      return UIManager.getViewManagerConfig(name) != null;
    }
    return (UIManager as unknown as Record<string, unknown>)[name] != null;
  } catch {
    return false;
  }
}

// ponytail: view-config check — old APKs lack ExpoBlur until native rebuild
const hasNativeBlur = hasNativeView("ExpoBlurView") || hasNativeView("BlurView");

const BlurView = hasNativeBlur
  ? (require("expo-blur") as typeof import("expo-blur")).BlurView
  : null;

const tintAccents: Record<GlassTint, string | null> = {
  default: null,
  blue: colors.primary,
  green: colors.success,
  purple: colors.purple,
  orange: colors.warning
};

type GlassSurfaceProps = {
  children: ReactNode;
  intensity?: number;
  interactive?: boolean;
  onPress?: PressableProps["onPress"];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  tint?: GlassTint;
  variant?: "glass" | "solid" | "ink";
};

/** Smoked dark blur for chrome floating over the camera. Falls back to translucent ink. */
export function FrostLayer({ intensity = glass.blurIntensityStrong, style }: { intensity?: number; style?: StyleProp<ViewStyle> }) {
  if (BlurView) {
    return (
      <BlurView
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        intensity={intensity}
        style={style}
        tint="dark"
      />
    );
  }
  return <View style={[style, styles.fallbackFrost]} />;
}

/** Paper card: solid white sheet, hairline border, optional tint accent rail. */
export function GlassSurface({
  children,
  interactive = false,
  onPress,
  radius = spacing.radius,
  style,
  tint = "default",
  variant = "glass"
}: GlassSurfaceProps) {
  const accent = tintAccents[tint];
  const content = (
    <View style={[styles.surfaceShell, variant === "ink" ? styles.inkShell : null, { borderRadius: radius }, style]}>
      {accent ? <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );

  if (interactive || onPress) {
    return (
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        onPress={onPress}
        style={({ pressed }) => [pressed ? { opacity: 0.92, transform: [{ scale: glass.interactiveScale }] } : null]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

/** Paper page ground. */
export function AmbientBackground({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.ambientRoot, style]}>{children}</View>;
}

/** Blueprint grid drawn with hairlines — the console's signature texture. */
export function BlueprintGrid({ cell = 28, color = colors.inkGrid, columns = 16, rows = 14 }: { cell?: number; color?: string; columns?: number; rows?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: columns }).map((_, index) => (
        <View key={`c${index}`} style={[styles.gridLineV, { backgroundColor: color, left: index * cell }]} />
      ))}
      {Array.from({ length: rows }).map((_, index) => (
        <View key={`r${index}`} style={[styles.gridLineH, { backgroundColor: color, top: index * cell }]} />
      ))}
    </View>
  );
}

/** QR-style registration corners around a box. */
export function RegistrationMarks({ color = colors.inkAccent, inset = 0, size = 14, thickness = 2 }: { color?: string; inset?: number; size?: number; thickness?: number }) {
  const base = { borderColor: color, height: size, position: "absolute" as const, width: size };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[base, { borderLeftWidth: thickness, borderTopWidth: thickness, left: inset, top: inset }]} />
      <View style={[base, { borderRightWidth: thickness, borderTopWidth: thickness, right: inset, top: inset }]} />
      <View style={[base, { borderBottomWidth: thickness, borderLeftWidth: thickness, bottom: inset, left: inset }]} />
      <View style={[base, { borderBottomWidth: thickness, borderRightWidth: thickness, bottom: inset, right: inset }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  accentRail: {
    bottom: 14,
    borderRadius: 2,
    left: 0,
    position: "absolute",
    top: 14,
    width: 3
  },
  ambientRoot: {
    backgroundColor: colors.background,
    flex: 1
  },
  fallbackFrost: {
    backgroundColor: "rgba(19, 23, 34, 0.82)"
  },
  gridLineH: {
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: "absolute",
    right: 0
  },
  gridLineV: {
    bottom: 0,
    position: "absolute",
    top: 0,
    width: StyleSheet.hairlineWidth
  },
  inkShell: {
    backgroundColor: colors.inkRaised,
    borderColor: colors.inkBorder
  },
  surfaceShell: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    overflow: "hidden",
    padding: 16,
    ...shadows.card,
    ...Platform.select({ ios: { borderCurve: "continuous" } })
  }
});
