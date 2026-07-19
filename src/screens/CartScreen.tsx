import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, radius, typography} from '../theme/theme';
import {getInstalledUpiApps, UpiApp} from '../services/upi';
import {createOrder} from '../services/orders';

const LINE_ITEMS = [
  {id: 'l1', name: 'Signature Paneer Butter Masala Meal', desc: 'Includes 2 Parathas, Rice, Dal', price: 280, qty: 1},
  {id: 'l2', name: 'Homestyle Chicken Curry Combo', desc: 'With Steamed Rice & Salad', price: 320, qty: 1},
];

const ITEM_TOTAL = LINE_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
const DELIVERY_FEE = 40;
const TAXES = 32.5;
const GRAND_TOTAL = ITEM_TOTAL + DELIVERY_FEE + TAXES;

type PaymentMethod = 'upi' | 'card' | 'netbanking';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiApps, setUpiApps] = useState<UpiApp[]>([]);

  useEffect(() => {
    getInstalledUpiApps().then(setUpiApps);
  }, []);

  const confirmBooking = async () => {
    const order = await createOrder({
      shopId: 'spice-route-kitchen',
      items: LINE_ITEMS,
      grandTotal: GRAND_TOTAL,
      paymentMethod: method,
    });
    navigation.navigate('OrderTracking', {orderId: order.orderId});
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <Text style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.md, paddingBottom: 140}}>
        <View style={styles.card}>
          <Text style={typography.h3}>The Spice Route Kitchen</Text>
          <Text style={{color: colors.textSecondary}}>📍 HSR Layout, Sector 2</Text>
          <View style={styles.slotBanner}>
            <Text style={styles.slotBannerText}>⏱ Delivery Slot: Today, 1:30 PM</Text>
            <Text style={styles.changeLink}>CHANGE</Text>
          </View>
          {LINE_ITEMS.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{flex: 1}}>
                <Text style={typography.bodyBold}>{item.name}</Text>
                <Text style={{color: colors.textSecondary, fontSize: 12}}>{item.desc}</Text>
                <Text style={{color: colors.textPrimary, marginTop: 2}}>₹{item.price}</Text>
              </View>
              <View style={styles.qtyControl}>
                <Text style={styles.qtyBtn}>−</Text>
                <Text style={styles.qtyValue}>{item.qty}</Text>
                <Text style={styles.qtyBtn}>+</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={typography.bodyBold}>🏷  Apply Coupon</Text>
            <Text style={{color: colors.primary, fontWeight: '700'}}>APPLY</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>Bill Details</Text>
          <BillRow label="Item Total" value={ITEM_TOTAL} />
          <BillRow label="Delivery Fee" value={DELIVERY_FEE} />
          <BillRow label="Taxes & Charges" value={TAXES} />
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={GRAND_TOTAL} bold />
        </View>

        <View style={styles.card}>
          <Text style={typography.h3}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.paymentOption, method === 'upi' && styles.paymentOptionActive]}
            onPress={() => setMethod('upi')}>
            <View style={styles.radio}>{method === 'upi' && <View style={styles.radioDot} />}</View>
            <View>
              <Text style={typography.bodyBold}>UPI</Text>
              <View style={{flexDirection: 'row', gap: spacing.xs, marginTop: 4}}>
                {(upiApps.length ? upiApps : [{id: 'gpay', label: 'GPay'}, {id: 'phonepe', label: 'PhonePe'}, {id: 'paytm', label: 'Paytm'}]).map(app => (
                  <View key={app.id} style={styles.upiChip}><Text style={styles.upiChipText}>{app.label}</Text></View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, method === 'card' && styles.paymentOptionActive]}
            onPress={() => setMethod('card')}>
            <View style={styles.radio}>{method === 'card' && <View style={styles.radioDot} />}</View>
            <Text style={typography.bodyBold}>💳  Credit / Debit Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, method === 'netbanking' && styles.paymentOptionActive]}
            onPress={() => setMethod('netbanking')}>
            <View style={styles.radio}>{method === 'netbanking' && <View style={styles.radioDot} />}</View>
            <Text style={typography.bodyBold}>🏦  Netbanking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View>
          <Text style={{color: colors.textSecondary, fontSize: 12}}>Grand Total</Text>
          <Text style={{fontWeight: '800', fontSize: 18}}>₹{GRAND_TOTAL.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking}>
          <Text style={styles.confirmBtnText}>Confirm Pre-Booking  →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillRow({label, value, bold}: {label: string; value: number; bold?: boolean}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs}}>
      <Text style={bold ? typography.h3 : typography.body}>{label}</Text>
      <Text style={bold ? typography.h3 : typography.body}>₹{value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface},
  headerIcon: {fontSize: 20, color: colors.primary},
  headerTitle: {...typography.h3, color: colors.primary},
  card: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md},
  slotBanner: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FDE4E1', borderRadius: radius.sm, padding: spacing.sm, marginVertical: spacing.sm},
  slotBannerText: {color: colors.primaryDark, fontWeight: '600', fontSize: 13},
  changeLink: {color: colors.primary, fontWeight: '700', fontSize: 12},
  itemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm},
  qtyControl: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, gap: 10},
  qtyBtn: {color: colors.primary, fontWeight: '800'},
  qtyValue: {fontWeight: '700'},
  divider: {height: 1, backgroundColor: colors.border, marginVertical: spacing.sm},
  paymentOption: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm},
  paymentOptionActive: {borderColor: colors.primary, backgroundColor: '#FDF1EF'},
  radio: {width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  radioDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary},
  upiChip: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3},
  upiChipText: {fontSize: 11, fontWeight: '600', color: colors.textSecondary},
  stickyBar: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md},
  confirmBtn: {backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  confirmBtnText: {color: colors.onPrimary, fontWeight: '700'},
});
