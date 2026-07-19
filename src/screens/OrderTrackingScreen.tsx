import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, Switch, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {colors, spacing, radius, typography} from '../theme/theme';
import {subscribeToOrder, OrderDoc} from '../services/orders';

const STEPS = ['Order Confirmed', 'Being Prepared', 'Food Ready', 'Completed'] as const;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {orderId = '4829A'} = route.params ?? {};
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    // Real-time Firestore listener — this is the "no polling" requirement
    // from the master prompt: any status change on this doc pushes to the
    // UI within milliseconds, no manual refresh.
    const unsubscribe = subscribeToOrder(orderId, setOrder);
    return unsubscribe;
  }, [orderId]);

  const currentStepIndex = STEPS.indexOf((order?.status as any) ?? 'Being Prepared');

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId}</Text>
        <Text style={styles.headerIcon}>?</Text>
      </View>

      <View style={{padding: spacing.md}}>
        <View style={styles.heroImage}>
          <Text style={styles.heroTitle}>{order?.itemName ?? 'Classic North Indian Thali'}</Text>
          <Text style={styles.heroSubtitle}>For {order?.slot ?? '1:30 PM'} Delivery Slot</Text>
        </View>

        <View style={styles.prepBanner}>
          <Text style={{fontSize: 22}}>⏱</Text>
          <View style={{flex: 1, marginLeft: spacing.sm}}>
            <Text style={styles.prepTitle}>Your meal will be prepared in 45 mins</Text>
            <Text style={styles.prepSubtitle}>Preparation begins strictly at 1:00 PM for peak freshness.</Text>
          </View>
        </View>

        <View style={styles.notifyRow}>
          <Text style={typography.bodyBold}>🔔  Notify me when preparation starts</Text>
          <Switch value={notify} onValueChange={setNotify} trackColor={{true: colors.primary}} />
        </View>

        <View style={styles.trackCard}>
          <Text style={typography.h3}>Track Order</Text>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepIndicatorCol}>
                <View
                  style={[
                    styles.stepDot,
                    i <= currentStepIndex && styles.stepDotDone,
                    i === currentStepIndex && styles.stepDotCurrent,
                  ]}
                />
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={{flex: 1, paddingBottom: spacing.md}}>
                <Text style={[typography.bodyBold, i === currentStepIndex && {color: colors.primary}]}>{step}</Text>
                <Text style={{color: colors.textMuted, fontSize: 12}}>
                  {i === 0 && "We've received your pre-booking for the 1:30 PM slot."}
                  {i === 1 && 'Starts at 1:00 PM'}
                  {i === 2 && 'Usually around 1:15 PM'}
                  {i === 3 && 'Enjoy your meal!'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface},
  headerIcon: {fontSize: 18, color: colors.primary},
  headerTitle: {...typography.h3},
  heroImage: {height: 180, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, justifyContent: 'flex-end', padding: spacing.md},
  heroTitle: {color: colors.textPrimary, fontWeight: '800', fontSize: 20},
  heroSubtitle: {color: colors.textSecondary, fontSize: 12},
  prepBanner: {flexDirection: 'row', backgroundColor: '#FDE4E1', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, alignItems: 'center'},
  prepTitle: {fontWeight: '800', color: colors.textPrimary},
  prepSubtitle: {color: colors.textSecondary, fontSize: 12, marginTop: 2},
  notifyRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md},
  trackCard: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md},
  stepRow: {flexDirection: 'row', marginTop: spacing.sm},
  stepIndicatorCol: {alignItems: 'center', width: 24},
  stepDot: {width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface},
  stepDotDone: {borderColor: colors.primary, backgroundColor: colors.primary},
  stepDotCurrent: {borderColor: colors.primary, backgroundColor: colors.surface},
  stepLine: {width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2},
});
