import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, Image, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, radius, typography} from '../theme/theme';

const SPECIALS = [
  {id: '1', name: 'Grand North Indian Thali', price: 249, rating: 4.8, tag: 'Pure Veg', slot: 'Lunch Slot'},
  {id: '2', name: 'Hyderabadi Biryani Feast', price: 299, rating: 4.7, tag: 'Non-Veg', slot: 'Lunch Slot'},
];

const KITCHENS = [
  {id: 'biryani-project', name: 'The Biryani Project', cuisine: 'Biryani, North Indian, Mughlai', rating: 4.6, distance: '1.2 km', delivery: 'Free Delivery', slot: 'Next slot: 1:30 PM'},
  {id: 'healthy-bowls', name: 'Healthy Bowls Co.', cuisine: 'Salads, Healthy, Continental', rating: 4.2, distance: '2.5 km', delivery: '₹40 Delivery', slot: 'Next slot: 2:00 PM'},
];

const FILTERS = ['All', 'Biryani', 'Thalis', 'Healthy'];

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: spacing.xl}}>
      {/* Location bar */}
      <View style={styles.locationBar}>
        <View>
          <Text style={styles.locationLabel}>Delivering to</Text>
          <Text style={styles.locationValue}>Indiranagar, Bangalore  ⌄</Text>
        </View>
        <TouchableOpacity style={styles.avatar} />
      </View>

      {/* Promo banner */}
      <View style={styles.promo}>
        <View>
          <Text style={styles.promoTitle}>Book breakfast tonight</Text>
          <Text style={styles.promoSubtitle}>Skip the morning rush, order now.</Text>
        </View>
        <TouchableOpacity style={styles.promoButton}>
          <Text style={styles.promoButtonText}>Book</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Today's Special</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: spacing.md}}>
        {SPECIALS.map(item => (
          <View key={item.id} style={styles.specialCard}>
            <View style={styles.specialImage}>
              <Text style={styles.ratingBadge}>★ {item.rating}</Text>
            </View>
            <View style={{padding: spacing.sm}}>
              <Text style={typography.bodyBold} numberOfLines={1}>{item.name}</Text>
              <Text style={{color: colors.textSecondary, fontSize: 12}}>{item.tag}</Text>
              <Text style={{color: colors.primary, fontWeight: '700'}}>₹{item.price}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>🔥 120 people booked lunch today</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity key={f} style={[styles.filterPill, i === 1 && styles.filterPillActive]}>
            <Text style={[styles.filterText, i === 1 && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Nearby Kitchens</Text>
      {KITCHENS.map(k => (
        <TouchableOpacity
          key={k.id}
          style={styles.kitchenCard}
          onPress={() => navigation.navigate('Menu', {shopId: k.id, shopName: k.name})}>
          <View style={styles.kitchenImage}>
            <Text style={styles.ratingBadge}>★ {k.rating}</Text>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{k.slot}</Text>
            </View>
          </View>
          <View style={{padding: spacing.sm}}>
            <Text style={typography.h3}>{k.name}</Text>
            <Text style={{color: colors.textSecondary, marginVertical: 2}}>{k.cuisine}</Text>
            <Text style={{color: colors.textMuted, fontSize: 12}}>{k.distance}   •   {k.delivery}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.md},
  locationBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  locationLabel: {fontSize: 12, color: colors.textMuted},
  locationValue: {...typography.bodyBold, color: colors.primary},
  avatar: {width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted},
  promo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.accentGreen, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg,
  },
  promoTitle: {color: colors.onPrimary, fontWeight: '800', fontSize: 16},
  promoSubtitle: {color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2},
  promoButton: {backgroundColor: colors.onPrimary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  promoButtonText: {color: colors.accentGreen, fontWeight: '700'},
  sectionTitle: {...typography.h3, marginBottom: spacing.sm},
  specialCard: {width: 200, backgroundColor: colors.surface, borderRadius: radius.md, marginRight: spacing.sm, overflow: 'hidden'},
  specialImage: {height: 110, backgroundColor: colors.surfaceMuted, justifyContent: 'flex-start', padding: spacing.xs},
  ratingBadge: {backgroundColor: colors.surface, alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm},
  socialProof: {alignSelf: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md},
  socialProofText: {fontSize: 12, color: colors.textSecondary},
  filterRow: {marginBottom: spacing.md},
  filterPill: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginRight: spacing.sm},
  filterPillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  filterText: {color: colors.textSecondary, fontWeight: '600'},
  filterTextActive: {color: colors.onPrimary},
  kitchenCard: {backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden'},
  kitchenImage: {height: 130, backgroundColor: colors.surfaceMuted, padding: spacing.xs},
  slotBadge: {position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4},
  slotBadgeText: {color: colors.onPrimary, fontSize: 11, fontWeight: '700'},
});
