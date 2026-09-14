import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, type AppIconName } from "@/components/icons";
import { colors, shadows, spacing } from "@/constants/theme";

const TAB_ICONS: Record<string, AppIconName> = {
  index: "home",
  borrow: "borrow",
  scan: "scan",
  notifications: "notifications",
  profile: "profile"
};

type TabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ConsoleDock {...(props as TabBarProps)} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="borrow" options={{ title: "Borrow" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

/** Ink dock with a raised scan key — the primary action of the app. */
function ConsoleDock({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        {
          bottom: Math.max(insets.bottom, 8) + spacing.tabBarInset,
          paddingHorizontal: spacing.tabBarHorizontal
        }
      ]}
    >
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;
          const isScan = route.name === "scan";
          const iconName = TAB_ICONS[route.name] ?? "home";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              hitSlop={6}
              key={route.key}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              onPress={onPress}
              style={({ pressed }) => [styles.tabItem, pressed ? styles.tabPressed : null]}
            >
              {isScan ? (
                <View style={[styles.scanKey, focused ? styles.scanKeyActive : null]}>
                  <View style={styles.scanKeyCornerTL} />
                  <View style={styles.scanKeyCornerBR} />
                  <AppIcon color="#FFFFFF" focused name="scan" size={24} />
                </View>
              ) : (
                <>
                  <View style={[styles.indicator, focused ? styles.indicatorActive : null]} />
                  <AppIcon color={focused ? colors.inkText : colors.inkMuted} focused={focused} name={iconName} size={21} />
                  <Text numberOfLines={1} style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>
                    {label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.ink,
    borderColor: colors.inkBorder,
    borderRadius: spacing.navRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 64,
    maxWidth: 480,
    paddingHorizontal: 6,
    width: "100%",
    ...shadows.floating,
    ...Platform.select({ ios: { borderCurve: "continuous" } })
  },
  dockWrap: {
    left: 0,
    position: "absolute",
    right: 0
  },
  indicator: {
    borderRadius: 2,
    height: 3,
    marginBottom: 4,
    width: 14
  },
  indicatorActive: {
    backgroundColor: colors.inkAccent
  },
  scanKey: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.ink,
    borderRadius: 22,
    borderWidth: 4,
    height: 62,
    justifyContent: "center",
    marginTop: -26,
    width: 62,
    ...shadows.accent
  },
  scanKeyActive: {
    backgroundColor: "#4C6CF0"
  },
  scanKeyCornerBR: {
    borderBottomWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    borderRightWidth: 2,
    bottom: 9,
    height: 8,
    position: "absolute",
    right: 9,
    width: 8
  },
  scanKeyCornerTL: {
    borderColor: "rgba(255,255,255,0.55)",
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 8,
    left: 9,
    position: "absolute",
    top: 9,
    width: 8
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    minWidth: 0,
    paddingBottom: 4
  },
  tabLabel: {
    color: colors.inkMuted,
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 3
  },
  tabLabelActive: {
    color: colors.inkText,
    fontWeight: "600"
  },
  tabPressed: {
    opacity: 0.7
  }
});
