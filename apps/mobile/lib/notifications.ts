import Constants from "expo-constants";
import { Platform } from "react-native";
import { upsertPushToken } from "@/lib/labtrack-api";

type NotificationsApi = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsApi | null> | null = null;

function canUseRemotePushInCurrentRuntime() {
  return !(Platform.OS === "android" && Constants.appOwnership === "expo");
}

async function getNotifications() {
  if (!canUseRemotePushInCurrentRuntime()) {
    return null;
  }

  notificationsPromise ??= import("expo-notifications")
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true
        })
      });

      return Notifications;
    })
    .catch(() => null);

  return notificationsPromise;
}

export async function registerForPushNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("labtrack", {
      name: "LABTRACK updates",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission = existingPermission.granted
    ? existingPermission
    : await Notifications.requestPermissionsAsync();

  if (!finalPermission.granted) {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId || projectId === "replace-with-eas-project-id") {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await upsertPushToken(token);
  return token;
}
