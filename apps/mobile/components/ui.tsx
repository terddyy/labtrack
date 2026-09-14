import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type FlatListProps,
  type ListRenderItem,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientBackground, BlueprintGrid, GlassSurface, RegistrationMarks } from "@/components/glass";
import { AppIcon, type AppIconName } from "@/components/icons";
import { colors, fonts, shadows, spacing, typography } from "@/constants/theme";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "secondary";

export const toneColors: Record<Tone, { background: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, text: colors.muted },
  success: { background: colors.successMuted, text: colors.success },
  warning: { background: colors.warningMuted, text: colors.warning },
  danger: { background: colors.dangerMuted, text: colors.danger },
  info: { background: colors.primaryMuted, text: colors.primary },
  secondary: { background: colors.purpleMuted, text: colors.purple }
};

const TAB_BAR_CLEARANCE = 112;
const CONTENT_MAX_WIDTH = 520;

function resolveTopPadding(insetsTop: number, hasHeader: boolean, includeTopInset: boolean, includeHeaderInset: boolean): number {
  if (hasHeader) {
    return 0;
  }
  if (includeHeaderInset) {
    return 16;
  }
  if (includeTopInset) {
    return Math.max(insetsTop + 16, 28);
  }
  return 12;
}

function resolveBottomPadding(insetsBottom: number, includeHeaderInset: boolean): number {
  if (includeHeaderInset) {
    return Math.max(insetsBottom + 28, 40);
  }
  return Math.max(insetsBottom + TAB_BAR_CLEARANCE, 128);
}

type ScreenChrome = {
  /** Full-bleed ink header rendered above the paper sheet. */
  header?: ReactNode;
  includeHeaderInset?: boolean;
  includeTopInset?: boolean;
};

export function ScreenScrollView({
  children,
  contentContainerStyle,
  header,
  includeHeaderInset = false,
  includeTopInset = false,
  ...props
}: ScrollViewProps & ScreenChrome & { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <AmbientBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...props}
        style={[styles.screen, props.style]}
        contentContainerStyle={[
          styles.screenViewport,
          { paddingTop: resolveTopPadding(insets.top, Boolean(header), includeTopInset, includeHeaderInset) },
          { paddingBottom: resolveBottomPadding(insets.bottom, includeHeaderInset) },
          contentContainerStyle
        ]}
      >
        {header}
        <View style={[styles.screenInner, header ? styles.sheetOverlap : null]}>{children}</View>
      </ScrollView>
      {header && !includeHeaderInset ? <StatusBarScrim height={insets.top} /> : null}
    </AmbientBackground>
  );
}

export function ScreenFlatList<ItemT>({
  contentContainerStyle,
  empty,
  header,
  includeHeaderInset = false,
  includeTopInset = false,
  listHeader,
  renderItem,
  ...props
}: Omit<FlatListProps<ItemT>, "ListEmptyComponent" | "ListHeaderComponent" | "renderItem"> & ScreenChrome & {
  empty?: ReactNode;
  /** Paper-sheet content shown above the list items (filters, notices). */
  listHeader?: ReactNode;
  renderItem: ListRenderItem<ItemT>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <AmbientBackground>
      <FlatList
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...props}
        style={[styles.screen, props.style]}
        contentContainerStyle={[
          styles.screenListViewport,
          { paddingTop: resolveTopPadding(insets.top, Boolean(header), includeTopInset, includeHeaderInset) },
          { paddingBottom: resolveBottomPadding(insets.bottom, includeHeaderInset) },
          contentContainerStyle
        ]}
        ListEmptyComponent={empty ? <View style={styles.screenListItem}>{empty}</View> : null}
        ListHeaderComponent={
          header || listHeader ? (
            <View>
              {header}
              {listHeader ? <View style={[styles.screenListHeader, header ? styles.sheetOverlap : null]}>{listHeader}</View> : null}
            </View>
          ) : null
        }
        renderItem={(info) => <View style={styles.screenListItem}>{renderItem(info)}</View>}
      />
      {header && !includeHeaderInset ? <StatusBarScrim height={insets.top} /> : null}
    </AmbientBackground>
  );
}

/** Keeps scrolled content from running under the translucent status bar. */
function StatusBarScrim({ height }: { height: number }) {
  if (!height) {
    return null;
  }
  return <View pointerEvents="none" style={[styles.statusBarScrim, { height }]} />;
}

/**
 * Ink instrument header: blueprint grid, mono eyebrow, display title.
 * `inset` adds the status-bar safe area (tab screens); stack screens sit under the native ink header.
 */
export function ConsoleHeader({
  caption,
  children,
  eyebrow,
  inset = true,
  right,
  title
}: {
  caption?: string;
  children?: ReactNode;
  eyebrow?: string;
  inset?: boolean;
  right?: ReactNode;
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.consoleHeader, { paddingTop: (inset ? insets.top : 0) + 18 }]}>
      <BlueprintGrid />
      <View pointerEvents="none" style={styles.consoleGlow} />
      <View style={styles.consoleInner}>
        <View style={styles.consoleTopRow}>
          <View style={styles.consoleCopy}>
            {eyebrow ? (
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />
                <Text numberOfLines={1} style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text numberOfLines={2} style={styles.consoleTitle}>{title}</Text>
            {caption ? <Text numberOfLines={2} style={styles.consoleCaption}>{caption}</Text> : null}
          </View>
          {right ? <View style={styles.consoleRight}>{right}</View> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

/** Mono readout strip inside the ink header. */
export function ReadoutStrip({ items }: { items: Array<{ label: string; tone?: Tone; value: string | number }> }) {
  return (
    <View style={styles.readoutStrip}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.readoutCell, index > 0 ? styles.readoutCellDivider : null]}>
          <Text numberOfLines={1} style={[styles.readoutValue, item.tone && item.tone !== "neutral" ? { color: inkToneColor(item.tone) } : null]}>
            {item.value}
          </Text>
          <Text numberOfLines={1} style={styles.readoutLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function inkToneColor(tone: Tone) {
  if (tone === "success") return "#5BD6A0";
  if (tone === "warning") return "#F5B84C";
  if (tone === "danger") return "#FF8A7A";
  if (tone === "secondary") return "#B39DFF";
  return colors.inkAccent;
}

/** Round icon button for ink headers. */
export function HeaderIconButton({
  accessibilityLabel,
  badge,
  disabled = false,
  icon,
  loading = false,
  onPress
}: {
  accessibilityLabel: string;
  badge?: number;
  disabled?: boolean;
  icon: AppIconName;
  loading?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled || loading}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.headerIcon, disabled ? styles.disabled : pressed ? styles.headerIconPressed : null]}
    >
      {loading ? <ActivityIndicator color={colors.inkText} size="small" /> : <AppIcon color={colors.inkText} name={icon} size={19} />}
      {badge ? (
        <View style={styles.headerIconBadge}>
          <Text style={styles.headerIconBadgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  tint,
  variant = "glass"
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: "default" | "blue" | "green" | "purple" | "orange";
  variant?: "glass" | "solid" | "ink";
}) {
  return (
    <GlassSurface style={style} tint={tint} variant={variant}>
      {children}
    </GlassSurface>
  );
}

type ButtonVariant = "primary" | "secondary" | "subtle" | "danger" | "ghost";

export function Button({
  children,
  disabled = false,
  fullWidth = true,
  icon,
  loading = false,
  onPress,
  size = "default",
  style,
  textStyle,
  variant = "primary",
  ...props
}: Omit<PressableProps, "children" | "disabled" | "onPress" | "style"> & {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: AppIconName;
  loading?: boolean;
  onPress?: PressableProps["onPress"];
  size?: "default" | "small";
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
}) {
  const isDisabled = disabled || loading;
  const palette = buttonPalette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={6}
      onPress={onPress}
      {...props}
      style={({ pressed }) => [
        styles.button,
        size === "small" ? styles.buttonSmall : null,
        fullWidth ? styles.buttonFull : styles.buttonAuto,
        palette.container,
        isDisabled ? styles.disabled : pressed ? styles.pressed : null,
        typeof style === "function" ? style({ pressed }) : style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : icon ? (
        <AppIcon color={palette.text} name={icon} size={size === "small" ? 15 : 17} />
      ) : null}
      <Text numberOfLines={2} style={[styles.buttonText, size === "small" ? styles.buttonTextSmall : null, { color: palette.text }, textStyle]}>
        {children}
      </Text>
    </Pressable>
  );
}

const buttonPalette: Record<ButtonVariant, { container: ViewStyle; text: string }> = {
  primary: { container: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadows.accent }, text: "#FFFFFF" },
  secondary: { container: { backgroundColor: colors.surface, borderColor: colors.borderStrong }, text: colors.text },
  subtle: { container: { backgroundColor: colors.primaryMuted, borderColor: "transparent" }, text: colors.primaryDark },
  danger: { container: { backgroundColor: colors.dangerMuted, borderColor: "transparent" }, text: colors.danger },
  ghost: { container: { backgroundColor: "transparent", borderColor: "transparent" }, text: colors.muted }
};

const noticeIcons: Record<Tone, AppIconName> = {
  neutral: "info",
  success: "check",
  warning: "alert",
  danger: "alert",
  info: "info",
  secondary: "info"
};

export function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const toneStyle = toneColors[tone];

  return (
    <View style={[styles.notice, { backgroundColor: toneStyle.background }]}>
      <AppIcon color={toneStyle.text} name={noticeIcons[tone]} size={16} />
      <Text style={[styles.noticeText, { color: tone === "neutral" ? colors.text : toneStyle.text }]}>{children}</Text>
    </View>
  );
}

/** Dot status pill — same language as the web console. */
export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const toneStyle = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.background }]}>
      <View style={[styles.badgeDot, { backgroundColor: toneStyle.text }]} />
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

/** List section label with count and optional trailing action. */
export function SectionHeader({
  actionLabel,
  count,
  onAction,
  title
}: {
  actionLabel?: string;
  count?: number;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {count != null ? <Text style={styles.sectionHeaderCount}>{count}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed ? styles.pressed : null]}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <AppIcon color={colors.primary} name="chevron-forward" size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Underline-free segmented control used for list filters. */
export function SegmentedControl<T extends string>({
  counts,
  onChange,
  options,
  value
}: {
  counts?: Partial<Record<T, number>>;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segmentTrack}>
      {options.map((option) => {
        const selected = option.value === value;
        const count = counts?.[option.value];
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
          >
            <Text numberOfLines={1} style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>{option.label}</Text>
            {count != null ? (
              <Text style={[styles.segmentCount, selected ? styles.segmentCountSelected : null]}>{count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ action, body, icon = "box", title }: { action?: ReactNode; body: string; icon?: AppIconName; title: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <RegistrationMarks color={colors.borderStrong} size={9} thickness={1.5} />
        <AppIcon color={colors.subtle} name={icon} size={22} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </View>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Card style={styles.skeletonCard}>
      <Animated.View style={{ gap: 10, opacity }}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            key={index}
            style={[
              styles.skeletonLine,
              index === 0 ? styles.skeletonLineStrong : null,
              index === lines - 1 ? styles.skeletonLineShort : null
            ]}
          />
        ))}
      </Animated.View>
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

/** Search input with leading icon. */
export function SearchField({ onChangeText, placeholder, value }: { onChangeText: (value: string) => void; placeholder: string; value: string }) {
  return (
    <View style={styles.search}>
      <AppIcon color={colors.subtle} name="search" size={17} />
      <TextInput
        accessibilityLabel="Search"
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        returnKeyType="search"
        style={styles.searchInput}
        value={value}
      />
      {value ? (
        <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} onPress={() => onChangeText("")}>
          <AppIcon color={colors.subtle} name="close" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function InlineMeta({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <View style={styles.inlineMeta}>
      <Text style={styles.inlineMetaLabel}>{label}</Text>
      <Text numberOfLines={2} selectable style={[styles.inlineMetaValue, mono ? styles.mono : null]}>
        {value}
      </Text>
    </View>
  );
}

/** Row inside a grouped card. Pass `divider` for every row after the first. */
export function ListRow({
  divider = false,
  leading,
  meta,
  onPress,
  subtitle,
  title,
  trailing
}: {
  divider?: boolean;
  leading?: ReactNode;
  meta?: string;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
}) {
  const body = (
    <View style={[styles.listRow, divider ? styles.listRowDivider : null]}>
      {leading}
      <View style={styles.listRowCopy}>
        <Text numberOfLines={1} style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.listRowSubtitle}>{subtitle}</Text> : null}
        {meta ? <Text numberOfLines={1} style={styles.listRowMeta}>{meta}</Text> : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed ? styles.listRowPressed : null]}>
      {body}
    </Pressable>
  );
}

/** Rounded icon tile used as a row leading element. */
export function IconTile({ icon, size = 40, tone = "neutral" }: { icon: AppIconName; size?: number; tone?: Tone }) {
  const toneStyle = toneColors[tone];
  return (
    <View style={[styles.iconTile, { backgroundColor: toneStyle.background, borderRadius: size * 0.3, height: size, width: size }]}>
      <AppIcon color={tone === "neutral" ? colors.text : toneStyle.text} name={icon} size={Math.round(size * 0.46)} />
    </View>
  );
}

export function Avatar({ name, size = 40, tone = "ink" }: { name: string; size?: number; tone?: "ink" | "primary" }) {
  return (
    <View
      style={[
        styles.avatar,
        { borderRadius: size * 0.32, height: size, width: size },
        tone === "primary" ? { backgroundColor: colors.primary } : null
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.36) }]}>{getInitials(name)}</Text>
    </View>
  );
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatReference(value: string | null | undefined, length = 8) {
  return value ? value.slice(0, length).toUpperCase() : "UNKNOWN";
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatar,
    justifyContent: "center"
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  badgeDot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  badgeText: {
    ...typography.label,
    textTransform: "capitalize"
  },
  button: {
    alignItems: "center",
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonAuto: {
    alignSelf: "flex-start"
  },
  buttonFull: {
    alignSelf: "stretch"
  },
  buttonSmall: {
    borderRadius: 10,
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  },
  buttonTextSmall: {
    fontSize: 13,
    lineHeight: 17
  },
  consoleCaption: {
    color: colors.inkMuted,
    fontSize: 13.5,
    lineHeight: 19
  },
  consoleCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  consoleGlow: {
    backgroundColor: "rgba(91, 118, 255, 0.10)",
    borderRadius: 999,
    boxShadow: "0 0 80px 60px rgba(91, 118, 255, 0.10)",
    height: 180,
    position: "absolute",
    right: -90,
    top: -110,
    width: 180
  },
  consoleHeader: {
    backgroundColor: colors.ink,
    overflow: "hidden",
    paddingBottom: 18 + spacing.sheetOverlap,
    paddingHorizontal: spacing.page
  },
  consoleInner: {
    alignSelf: "center",
    gap: 18,
    maxWidth: CONTENT_MAX_WIDTH,
    width: "100%"
  },
  consoleRight: {
    flexDirection: "row",
    gap: 8
  },
  consoleTitle: {
    color: colors.inkText,
    ...typography.display
  },
  consoleTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  disabled: {
    opacity: 0.5
  },
  emptyBody: {
    color: colors.muted,
    textAlign: "center",
    ...typography.body
  },
  emptyIcon: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    marginBottom: 6,
    width: 52
  },
  emptyState: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: spacing.radius,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 24,
    paddingVertical: 28
  },
  emptyTitle: {
    color: colors.text,
    textAlign: "center",
    ...typography.headline
  },
  eyebrow: {
    color: colors.inkMuted,
    ...typography.eyebrow
  },
  eyebrowDot: {
    backgroundColor: colors.mint,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  field: {
    gap: 7
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.inkRaised,
    borderColor: colors.inkBorder,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  headerIconBadge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: colors.ink,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: -5,
    top: -5
  },
  headerIconBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700"
  },
  headerIconPressed: {
    backgroundColor: colors.inkBorder
  },
  inlineMeta: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingTop: 11
  },
  inlineMetaLabel: {
    color: colors.muted,
    fontSize: 13
  },
  inlineMetaValue: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: "600",
    textAlign: "right",
    textTransform: "capitalize"
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  iconTile: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center"
  },
  listRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12
  },
  listRowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  listRowDivider: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  listRowMeta: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 1
  },
  listRowPressed: {
    opacity: 0.6
  },
  listRowSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  listRowTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: "600",
    lineHeight: 19
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    textTransform: "none"
  },
  notice: {
    alignItems: "flex-start",
    borderRadius: spacing.controlRadius,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11
  },
  noticeText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    lineHeight: 19
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }]
  },
  readoutCell: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  readoutCellDivider: {
    borderLeftColor: colors.inkBorder,
    borderLeftWidth: StyleSheet.hairlineWidth
  },
  readoutLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 14
  },
  readoutStrip: {
    backgroundColor: "rgba(28, 33, 48, 0.85)",
    borderColor: colors.inkBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row"
  },
  readoutValue: {
    color: colors.inkText,
    fontSize: 19,
    lineHeight: 24,
    ...typography.readout
  },
  screen: {
    backgroundColor: "transparent",
    flex: 1
  },
  screenInner: {
    alignSelf: "center",
    gap: spacing.gap,
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: spacing.page,
    width: "100%"
  },
  screenListHeader: {
    alignSelf: "center",
    gap: spacing.gap,
    maxWidth: CONTENT_MAX_WIDTH,
    paddingBottom: spacing.gap,
    paddingHorizontal: spacing.page,
    width: "100%"
  },
  screenListItem: {
    alignSelf: "center",
    maxWidth: CONTENT_MAX_WIDTH,
    paddingBottom: 10,
    paddingHorizontal: spacing.page,
    width: "100%"
  },
  screenListViewport: {
    flexGrow: 1
  },
  screenViewport: {
    flexGrow: 1
  },
  search: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 13
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 10
  },
  sectionAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  sectionActionText: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: "600"
  },
  sectionCaption: {
    color: colors.muted,
    ...typography.caption
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: 10
  },
  sectionHeaderCount: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12
  },
  sectionHeaderLeft: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8
  },
  sectionHeaderText: {
    color: colors.text,
    ...typography.title
  },
  sectionTitle: {
    gap: 3
  },
  sectionTitleText: {
    color: colors.text,
    ...typography.title
  },
  segment: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8
  },
  segmentCount: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  segmentCountSelected: {
    color: colors.primary
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...shadows.soft
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13.5,
    fontWeight: "500"
  },
  segmentTextSelected: {
    color: colors.text,
    fontWeight: "600"
  },
  segmentTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    flexDirection: "row",
    gap: 2,
    padding: 3
  },
  sheetOverlap: {
    marginTop: -spacing.sheetOverlap
  },
  statusBarScrim: {
    backgroundColor: colors.ink,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  skeletonCard: {
    paddingVertical: 18
  },
  skeletonLine: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    height: 11,
    width: "100%"
  },
  skeletonLineShort: {
    width: "55%"
  },
  skeletonLineStrong: {
    height: 15,
    width: "72%"
  }
});
