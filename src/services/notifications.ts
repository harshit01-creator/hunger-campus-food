// Firebase Cloud Messaging registration (replaces Expo Push entirely).
// Part 3 of the migration spec.

import {Platform, PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from './orders';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      // Android 13+ requires runtime POST_NOTIFICATIONS permission.
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const token = await messaging().getToken();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email) {
        await supabase
          .from('user_accounts')
          .update({ pushToken: token })
          .eq('email', email);
        console.log('[FCM] Token saved to Supabase user_accounts for:', email);
      }
    } catch (dbErr: any) {
      console.warn('[FCM] Failed to save token to database:', dbErr.message);
    }

    // Foreground message handler — background/killed-state handling lives
    // in index.js via messaging().setBackgroundMessageHandler(), which must
    // be registered outside the React component tree.
    messaging().onMessage(async remoteMessage => {
      console.log('[FCM] foreground message:', remoteMessage.notification);
    });

    messaging().onTokenRefresh(async newToken => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        if (email) {
          await supabase
            .from('user_accounts')
            .update({ pushToken: newToken })
            .eq('email', email);
        }
      } catch (e: any) {
        console.warn('[FCM] Failed to update refreshed pushToken:', e.message);
      }
    });

    return token;
  } catch (err) {
    console.warn('[FCM] registration failed (expected until Firebase native config is added):', err);
    return null;
  }
}
