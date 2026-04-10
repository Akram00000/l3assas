import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@/src/api/endpoints';

let notificationHandlerConfigured = false;

function isExpoGoRuntime() {
  const ownership = (Constants as unknown as { appOwnership?: string }).appOwnership;
  const executionEnvironment = (Constants as unknown as { executionEnvironment?: string }).executionEnvironment;
  return ownership === 'expo' || executionEnvironment === 'storeClient';
}

async function loadNotificationsModule() {
  if (isExpoGoRuntime()) {
    return null;
  }

  try {
    return await import('expo-notifications');
  } catch (error) {
    console.log('expo-notifications unavailable:', error);
    return null;
  }
}

function ensureNotificationHandler(Notifications: typeof import('expo-notifications')) {
  if (notificationHandlerConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

async function registerForPushToken() {
  if (Platform.OS === 'web') return null;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return null;
  }

  ensureNotificationHandler(Notifications);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenData.data;
}

export function useMobilePushRegistration() {
  useEffect(() => {
    let isMounted = true;

    const register = async () => {
      try {
        const token = await registerForPushToken();
        if (!isMounted || !token) return;

        await api.mobileNotifyRegister({
          token,
          platform: Platform.OS,
        });
      } catch (error) {
        console.log('Mobile push registration unavailable:', error);
      }
    };

    void register();

    return () => {
      isMounted = false;
    };
  }, []);
}
