import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {colors, spacing, radius, typography, brand} from '../theme/theme';

export default function ProfileScreen() {
  return (
    <ScrollView style={{flex: 1, backgroundColor: colors.background}} contentContainerStyle={{padding: spacing.md}}>
      <View style={styles.header}>
        <Text style={{fontSize: 18}}>📍</Text>
        <Text style={styles.headerTitle}>{brand.name}</Text>
        <Text style={{fontSize: 16}}>文A</Text>
      </View>

      <View style={styles.card}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={styles.avatar} />
          <View style={{marginLeft: spacing.md}}>
            <Text style={typography.h3}>Aisha Sharma</Text>
            <Text style={{color: colors.textSecondary}}>+91 98765 43210</Text>
            <Text style={styles.editLink}>✎  Edit Profile</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={typography.h3}>🗓  Upcoming Bookings</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>
        <View style={styles.bookingRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>OCT</Text>
            <Text style={styles.dateDay}>24</Text>
          </View>
          <View style={{flex: 1, marginLeft: spacing.sm}}>
            <Text style={typography.bodyBold}>Homestyle Thali</Text>
            <Text style={{color: colors.textSecondary, fontSize: 12}}>Mama's Kitchen • Lunch Slot</Text>
            <View style={styles.timeChip}><Text style={styles.timeChipText}>12:30 PM - 1:00 PM</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={typography.h3}>↺  Order History</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>
        <View style={styles.bookingRow}>
          <View style={styles.thumb} />
          <View style={{flex: 1, marginLeft: spacing.sm}}>
            <Text style={typography.bodyBold}>Rajma Chawal Bowl</Text>
            <Text style={{color: colors.textSecondary, fontSize: 12}}>Oct 21 • ₹150</Text>
          </View>
          <Text style={{fontSize: 18, color: colors.primary}}>↺</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.card, styles.gridCard]}>
          <Text style={{fontSize: 20}}>📍</Text>
          <Text style={typography.bodyBold}>Saved Addresses</Text>
          <Text style={{color: colors.textSecondary, fontSize: 12}}>Home, Work</Text>
        </View>
        <View style={[styles.card, styles.gridCard]}>
          <Text style={{fontSize: 20}}>♥</Text>
          <Text style={typography.bodyBold}>Favorite Kitchens</Text>
          <Text style={{color: colors.textSecondary, fontSize: 12}}>3 Kitchens saved</Text>
        </View>
      </View>

      <View style={styles.referCard}>
        <View>
          <Text style={styles.referTitle}>Refer a Friend</Text>
          <Text style={styles.referSubtitle}>Get a free meal on their first booking!</Text>
        </View>
        <View style={styles.referArrow}><Text>→</Text></View>
      </View>

      {['💳  Payment Methods', '⚙  App Settings', '?  Help & Support'].map(label => (
        <TouchableOpacity key={label} style={styles.menuRow}>
          <Text style={typography.bodyBold}>{label}</Text>
          <Text style={{color: colors.textMuted}}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.menuRow}>
        <Text style={[typography.bodyBold, {color: colors.primary}]}>⇥  Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  headerTitle: {...typography.h2, color: colors.primary},
  card: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md},
  avatar: {width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surfaceMuted},
  editLink: {color: colors.primary, fontWeight: '700', marginTop: 4},
  cardHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm},
  viewAll: {color: colors.primary, fontWeight: '600', fontSize: 13},
  bookingRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: spacing.sm},
  dateBox: {backgroundColor: colors.surface, borderRadius: radius.sm, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4},
  dateMonth: {fontSize: 10, color: colors.textMuted, fontWeight: '700'},
  dateDay: {fontSize: 18, fontWeight: '800', color: colors.primary},
  timeChip: {backgroundColor: '#FCE9C6', alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 6, marginTop: 4},
  timeChipText: {fontSize: 11, color: '#7A5200', fontWeight: '700'},
  thumb: {width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted},
  gridRow: {flexDirection: 'row', gap: spacing.md},
  gridCard: {flex: 1, alignItems: 'center', gap: 4},
  referCard: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.md},
  referTitle: {color: colors.onPrimary, fontWeight: '800', fontSize: 16},
  referSubtitle: {color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2},
  referArrow: {backgroundColor: colors.onPrimary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  menuRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm},
});
