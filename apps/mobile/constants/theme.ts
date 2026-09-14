import { Platform } from "react-native";

/**
 * Field Console palette — ink instrument panels over paper sheets.
 * Mirrors the web console tokens (ink rail, indigo primary, dot status pills).
 */
export const colors = {
  // Ink — headers, tab dock, scanner chrome
  ink: "#131722",
  inkRaised: "#1C2130",
  inkBorder: "#2A3144",
  inkGrid: "rgba(255, 255, 255, 0.05)",
  inkText: "#F2F4F8",
  inkMuted: "#8F97AB",
  inkAccent: "#8EA2FF",

  // Paper — content sheets
  background: "#F3F4F7",
  backgroundGradient: ["#F3F4F7", "#F3F4F7", "#EEF0F5"] as const,
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#ECEEF3",
  surfaceGlass: "#F7F8FA",
  surfaceGlassAndroid: "#F7F8FA",
  border: "#E3E6ED",
  borderStrong: "#CDD2DD",
  glassBorder: "#E3E6ED",
  glassBorderSubtle: "#ECEEF3",

  text: "#151A26",
  muted: "#667085",
  subtle: "#98A1B3",
  iconMuted: "#8A93A6",

  primary: "#3B5BDB",
  primaryDark: "#2B45B0",
  primaryMuted: "rgba(59, 91, 219, 0.10)",
  secondary: "#3B5BDB",
  secondaryMuted: "rgba(59, 91, 219, 0.10)",
  blue: "#3B5BDB",
  blueMuted: "rgba(59, 91, 219, 0.10)",

  purple: "#7048E8",
  purpleMuted: "rgba(112, 72, 232, 0.10)",
  pink: "#7048E8",
  pinkMuted: "rgba(112, 72, 232, 0.10)",
  mint: "#63E6BE",
  mintSoft: "rgba(99, 230, 190, 0.18)",

  success: "#12A26B",
  successMuted: "rgba(18, 162, 107, 0.11)",
  warning: "#D9800B",
  warningMuted: "rgba(217, 128, 11, 0.12)",
  danger: "#E03E2D",
  dangerMuted: "rgba(224, 62, 45, 0.10)",
  coral: "#E03E2D",
  coralMuted: "rgba(224, 62, 45, 0.10)",

  avatar: "#1C2130"
};

export const spacing = {
  page: 16,
  gap: 12,
  radius: 16,
  radiusLarge: 22,
  controlRadius: 12,
  navRadius: 26,
  tabBarInset: 10,
  tabBarHorizontal: 16,
  /** How far the paper sheet overlaps the ink header. */
  sheetOverlap: 22
};

export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" })
};

/** Kept for components that still reference blur values (scanner chrome). */
export const glass = {
  blurIntensity: Platform.select({ ios: 60, android: 40, default: 50 }) ?? 50,
  blurIntensityStrong: Platform.select({ ios: 80, android: 55, default: 65 }) ?? 65,
  blurTint: "dark" as const,
  interactiveScale: 0.98,
  fill: colors.surface,
  border: colors.border,
  tintBlue: "rgba(59, 91, 219, 0.05)",
  tintGreen: "rgba(18, 162, 107, 0.05)",
  tintPurple: "rgba(112, 72, 232, 0.05)",
  tintOrange: "rgba(217, 128, 11, 0.06)"
};

export const typography = {
  display: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.6, lineHeight: 35 },
  largeTitle: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.4, lineHeight: 31 },
  title: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2, lineHeight: 23 },
  headline: { fontSize: 15, fontWeight: "600" as const, lineHeight: 20 },
  body: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  caption: { fontSize: 12.5, fontWeight: "400" as const, lineHeight: 17 },
  label: { fontSize: 11, fontWeight: "600" as const, lineHeight: 14 },
  eyebrow: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: "500" as const, letterSpacing: 1.2, lineHeight: 14 },
  readout: { fontFamily: fonts.mono, fontVariant: ["tabular-nums" as const], fontWeight: "600" as const }
};

export const shadows = {
  card: {
    boxShadow: "0 1px 2px rgba(19, 23, 34, 0.05)"
  },
  soft: {
    boxShadow: "0 4px 14px rgba(19, 23, 34, 0.06)"
  },
  floating: {
    boxShadow: "0 12px 32px rgba(19, 23, 34, 0.28)"
  },
  accent: {
    boxShadow: "0 8px 20px rgba(59, 91, 219, 0.32)"
  }
};
