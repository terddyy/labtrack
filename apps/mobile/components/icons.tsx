import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { colors } from "@/constants/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type AppIconName =
  | "home"
  | "borrow"
  | "scan"
  | "notifications"
  | "profile"
  | "bell"
  | "box"
  | "alert"
  | "message"
  | "monitor"
  | "clock"
  | "calendar"
  | "check"
  | "chevron-forward"
  | "refresh"
  | "search"
  | "send"
  | "close"
  | "camera"
  | "ticket"
  | "settings"
  | "info"
  | "logout"
  | "room"
  | "laptop"
  | "wrench"
  | "flash"
  | "mail"
  | "trash"
  | "building";

const iconMap: Record<AppIconName, IoniconName> = {
  home: "grid-outline",
  borrow: "cube-outline",
  scan: "qr-code-outline",
  notifications: "notifications-outline",
  profile: "person-outline",
  bell: "notifications-outline",
  box: "cube-outline",
  alert: "warning-outline",
  message: "chatbubble-ellipses-outline",
  monitor: "desktop-outline",
  clock: "time-outline",
  calendar: "calendar-outline",
  check: "checkmark-circle-outline",
  "chevron-forward": "chevron-forward",
  refresh: "refresh-outline",
  search: "search-outline",
  send: "arrow-up",
  close: "close",
  camera: "camera-outline",
  ticket: "chatbubbles-outline",
  settings: "settings-outline",
  info: "information-circle-outline",
  logout: "log-out-outline",
  room: "business-outline",
  laptop: "laptop-outline",
  wrench: "construct-outline",
  flash: "flash-outline",
  mail: "mail-outline",
  trash: "trash-outline",
  building: "school-outline"
};

const filledMap: Partial<Record<AppIconName, IoniconName>> = {
  home: "grid",
  borrow: "cube",
  scan: "qr-code",
  notifications: "notifications",
  profile: "person",
  bell: "notifications",
  check: "checkmark-circle"
};

type AppIconProps = {
  color?: ColorValue;
  focused?: boolean;
  name: AppIconName;
  size?: number;
};

/** Semantic icon wrapper over Ionicons for tab bar + screen chrome. */
export function AppIcon({ color = colors.iconMuted, focused = false, name, size = 22 }: AppIconProps) {
  const glyph = (focused && filledMap[name] ? filledMap[name] : iconMap[name]) ?? "ellipse-outline";
  return <Ionicons color={color} name={glyph} size={size} />;
}
