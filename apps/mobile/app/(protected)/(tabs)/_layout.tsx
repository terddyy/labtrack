import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, type ColorValue } from "react-native";
import { colors } from "@/constants/theme";

type TabIconName = "home" | "borrow" | "scan" | "notifications" | "profile";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.surface,
        headerTitleAlign: "center",
        headerTitleStyle: { color: colors.surface, fontSize: 17, fontWeight: "900" },
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.iconMuted,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "Dashboard",
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="home" />
        }}
      />
      <Tabs.Screen
        name="borrow"
        options={{
          headerTitle: "Borrow Items",
          title: "Borrow",
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="borrow" />
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          headerShown: false,
          title: "Scan",
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="scan" />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          headerTitle: "Notifications",
          title: "Alerts",
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="notifications" />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: "Profile",
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="profile" />
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, focused, name }: { color: ColorValue; focused: boolean; name: TabIconName }) {
  const isScan = name === "scan";

  return (
    <View style={[styles.iconShell, isScan ? styles.scanShell : null, focused ? styles.iconShellActive : null]}>
      {name === "home" ? <HomeGlyph color={color} /> : null}
      {name === "borrow" ? <BorrowGlyph color={color} /> : null}
      {name === "scan" ? <ScanGlyph color={focused ? colors.surface : colors.primary} /> : null}
      {name === "notifications" ? <NotificationGlyph color={color} /> : null}
      {name === "profile" ? <ProfileGlyph color={color} /> : null}
    </View>
  );
}

function HomeGlyph({ color }: { color: ColorValue }) {
  return (
    <View style={styles.glyphCanvas}>
      <View style={[styles.homeRoof, { borderBottomColor: color }]} />
      <View style={[styles.homeBody, { borderColor: color }]} />
    </View>
  );
}

function BorrowGlyph({ color }: { color: ColorValue }) {
  return (
    <View style={styles.glyphCanvas}>
      <View style={[styles.borrowHandle, { borderColor: color }]} />
      <View style={[styles.borrowBody, { borderColor: color }]}>
        <View style={[styles.borrowLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ScanGlyph({ color }: { color: ColorValue }) {
  return (
    <View style={styles.scanCanvas}>
      <View style={[styles.scanCorner, styles.scanTopLeft, { borderColor: color }]} />
      <View style={[styles.scanCorner, styles.scanTopRight, { borderColor: color }]} />
      <View style={[styles.scanCorner, styles.scanBottomLeft, { borderColor: color }]} />
      <View style={[styles.scanCorner, styles.scanBottomRight, { borderColor: color }]} />
      <View style={[styles.scanDot, { backgroundColor: color }]} />
    </View>
  );
}

function NotificationGlyph({ color }: { color: ColorValue }) {
  return (
    <View style={styles.glyphCanvas}>
      <View style={[styles.bellBody, { borderColor: color }]} />
      <View style={[styles.bellBase, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
}

function ProfileGlyph({ color }: { color: ColorValue }) {
  return (
    <View style={styles.glyphCanvas}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bellBase: {
    borderRadius: 999,
    height: 3,
    marginTop: -1,
    width: 16
  },
  bellBody: {
    borderRadius: 8,
    borderWidth: 2,
    height: 15,
    width: 15
  },
  bellClapper: {
    borderRadius: 999,
    height: 4,
    marginTop: 1,
    width: 4
  },
  borrowBody: {
    alignItems: "center",
    borderRadius: 3,
    borderWidth: 2,
    height: 15,
    justifyContent: "center",
    width: 18
  },
  borrowHandle: {
    borderBottomWidth: 0,
    borderRadius: 5,
    borderWidth: 2,
    height: 6,
    marginBottom: -1,
    width: 10
  },
  borrowLine: {
    borderRadius: 999,
    height: 2,
    width: 8
  },
  glyphCanvas: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24
  },
  homeBody: {
    borderRadius: 2,
    borderTopWidth: 0,
    borderWidth: 2,
    height: 12,
    marginTop: -1,
    width: 15
  },
  homeRoof: {
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderLeftWidth: 9,
    borderRightColor: "transparent",
    borderRightWidth: 9,
    height: 0,
    width: 0
  },
  iconShell: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 42
  },
  iconShellActive: {
    opacity: 1
  },
  profileBody: {
    borderRadius: 8,
    borderWidth: 2,
    height: 9,
    marginTop: 1,
    width: 18
  },
  profileHead: {
    borderRadius: 999,
    borderWidth: 2,
    height: 10,
    width: 10
  },
  scanBottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    left: 0
  },
  scanBottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    right: 0
  },
  scanCanvas: {
    height: 25,
    position: "relative",
    width: 25
  },
  scanCorner: {
    borderRadius: 3,
    borderWidth: 3,
    height: 10,
    position: "absolute",
    width: 10
  },
  scanDot: {
    borderRadius: 999,
    height: 5,
    left: 10,
    position: "absolute",
    top: 10,
    width: 5
  },
  scanShell: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    height: 48,
    marginTop: -22,
    width: 48
  },
  scanTopLeft: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    left: 0,
    top: 0
  },
  scanTopRight: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    right: 0,
    top: 0
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: Platform.select({ android: 70, default: 82 }),
    paddingBottom: Platform.select({ android: 10, default: 20 }),
    paddingHorizontal: 8,
    paddingTop: 8
  },
  tabItem: {
    minWidth: 58
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  }
});
