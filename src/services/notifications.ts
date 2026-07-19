// Firebase Cloud Messaging registration (replaces Expo Push entirely).
// Part 3 of the migration spec.

import {Platform, PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
// import auth from '@react-native-firebase/auth'; // uncomment once auth is wired

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

    // const uid = auth().currentUser?.uid;
    // if (uid) {
    //   await firestore().collection('users').doc(uid).set({fcmToken: token}, {merge: true});
    // }

    // Foreground message handler — background/killed-state handling lives
    // in index.js via messaging().setBackgroundMessageHandler(), which must
    // be registered outside the React component tree.
    messaging().onMessage(async remoteMessage => {
      console.log('[FCM] foreground message:', remoteMessage.notification);
    });

    messaging().onTokenRefresh(async newToken => {
      // const uid = auth().currentUser?.uid;
      // if (uid) await firestore().collection('users').doc(uid).update({fcmToken: newToken});
    });

    return token;
  } catch (err) {
    console.warn('[FCM] registration failed (expected until Firebase native config is added):', err);
    return null;
  }
}
