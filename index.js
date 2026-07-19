import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// Must be registered here, outside the React tree, to reliably wake the
// app for background/killed-state push notifications (Part 3 of spec).
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] background message:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
