import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather'; // swap for your icon set of choice

import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import BookingsScreen from '../screens/BookingsScreen';
import {colors} from '../theme/theme';

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  Menu: {shopId: string; shopName: string};
  Cart: undefined;
  OrderTracking: {orderId: string};
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {backgroundColor: colors.surface, borderTopColor: colors.border},
        tabBarIcon: ({color, size}) => {
          const map: Record<string, string> = {
            Home: 'home',
            Search: 'search',
            Bookings: 'calendar',
            Profile: 'user',
          };
          return <Icon name={map[route.name]} color={color} size={size} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  // TODO: replace with real auth-state check (Firebase Auth onAuthStateChanged)
  const isAuthenticated = false;

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isAuthenticated && <Stack.Screen name="Welcome" component={WelcomeScreen} />}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );
}
