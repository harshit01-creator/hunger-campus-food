import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {colors, spacing, radius, typography} from '../theme/theme';

const CATEGORIES = ['Recommended', 'Biryani', 'Starters', 'Beverages'];

const ITEMS = [
  {id: 'i1', name: 'Chicken Dum Biryani', price: 249, desc: 'Slow-cooked aromatic basmati rice layered with...', bestseller: true, veg: false},
  {id: 'i2', name: 'Mutton Keema Biryani', price: 329, desc: 'Rich, flavorful minced mutton cooked with fragrant...', bestseller: false, veg: false},
];

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {shopName = 'The Biryani Project'} = route.params ?? {};
  const [qty, setQty] = useState<Record<string, number>>({i2: 1});
  const [activeCat, setActiveCat] = useState('Recommended');

  const cartCount = Object.values(qty).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(qty).reduce((sum, [id, q]) => {
    const item = ITEMS.find(i => i.id === id);
    return sum + (item ? item.price * q : 0);
  }, 0);

  const inc = (id: string) => setQty(q => ({...q, [id]: (q[id] ?? 0) + 1}));
  const dec = (id: string) => setQty(q => ({...q, [id]: Math.max(0, (q[id] ?? 0) - 1)}));

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.headerIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerIcon}>⌕</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.md, paddingBottom: 120}}>
        <Text style={typography.h1}>{shopName}</Text>
        <Text style={{color: colors.textSecondary, marginTop: 4}}>★ 4.6 (1.2k Ratings)</Text>

        <View style={styles.slotBanner}>
          <Text style={styles.slotBannerText}>📣 Next Delivery Slot: 1:00 PM</Text>
          <Text style={styles.changeLink}>Change</Text>
        </View>

        <View style={styles.vegRow}>
          <Text style={typography.bodyBold}>Veg Only</Text>
          <Switch value={false} trackColor={{true: colors.accentGreen}} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical: spacing.md}}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.catPill, c === activeCat && styles.catPillActive]} onPress={() => setActiveCat(c)}>
              <Text style={[styles.catText, c === activeCat && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={typography.h3}>Recommended</Text>
        {ITEMS.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemImage}>
              <View style={[styles.vegDot, {borderColor: item.veg ? colors.accentGreen : colors.primary}]}>
                <View style={[styles.vegDotInner, {backgroundColor: item.veg ? colors.accentGreen : colors.primary}]} />
              </View>
              {qty[item.id] ? (
                <View style={styles.qtyControl}>
                  <TouchableOpacity onPress={() => dec(item.id)}><Text style={styles.qtyBtn}>−</Text></TouchableOpacity>
                  <Text style={styles.qtyValue}>{qty[item.id]}</Text>
                  <TouchableOpacity onPress={() => inc(item.id)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => inc(item.id)}>
                  <Text style={styles.addBtnText}>ADD</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{flex: 1, paddingLeft: spacing.md}}>
              {item.bestseller && (
                <Text style={styles.bestsellerTag}>BESTSELLER</Text>
              )}
              <Text style={typography.bodyBold}>{item.name}</Text>
              <Text style={{color: colors.primary, fontWeight: '700', marginVertical: 2}}>₹{item.price}</Text>
              <Text style={{color: colors.textSecondary, fontSize: 12}} numberOfLines={2}>{item.desc}</Text>
              <Text style={{color: colors.primary, fontSize: 12, marginTop: 4}}>Customizable</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.stickyBar}>
          <View>
            <Text style={{color: colors.onPrimary, fontSize: 12}}>{cartCount} Item{cartCount > 1 ? 's' : ''} Added</Text>
            <Text style={{color: colors.onPrimary, fontWeight: '800', fontSize: 18}}>₹{cartTotal}</Text>
          </View>
          <TouchableOpacity style={styles.selectSlotBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.selectSlotText}>Select Slot  →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface},
  headerIcon: {fontSize: 20, color: colors.primary},
  headerTitle: {...typography.h3, color: colors.primary},
  slotBanner: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FDE4E1', borderColor: colors.primary, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md},
  slotBannerText: {color: colors.primaryDark, fontWeight: '600', fontSize: 13},
  changeLink: {color: colors.primary, textDecorationLine: 'underline', fontSize: 13},
  vegRow: {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md},
  catPill: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginRight: spacing.sm},
  catPillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  catText: {color: colors.textSecondary, fontWeight: '600'},
  catTextActive: {color: colors.onPrimary},
  itemCard: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md},
  itemImage: {width: 100, height: 100, backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 4, justifyContent: 'space-between'},
  vegDot: {width: 14, height: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  vegDotInner: {width: 7, height: 7, borderRadius: 4},
  addBtn: {backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, borderRadius: radius.sm, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4},
  addBtnText: {color: colors.primary, fontWeight: '800', fontSize: 12},
  qtyControl: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2},
  qtyBtn: {color: colors.primary, fontWeight: '800', fontSize: 14, paddingHorizontal: 4},
  qtyValue: {fontWeight: '700'},
  bestsellerTag: {backgroundColor: colors.accentAmber, alignSelf: 'flex-start', color: '#5B3B00', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, borderRadius: 4, marginBottom: 4},
  stickyBar: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.primaryDark, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md},
  selectSlotBtn: {backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  selectSlotText: {color: colors.onPrimary, fontWeight: '700'},
});
