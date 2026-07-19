import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import {registerForPushNotificationsAsync} from './src/services/notifications';
import {colors} from './src/theme/theme';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // FCM token registration + Firestore write happens here once native
    // Firebase config files (google-services.json / GoogleService-Info.plist)
    // are dropped into android/ and ios/. Safe no-op until then.
    registerForPushNotificationsAsync().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.heroGradientStart} />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
