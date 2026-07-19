import React from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, radius, typography} from '../theme/theme';

const MOCK_BOOKINGS = [
  {orderId: '4829A', name: 'Classic North Indian Thali', slot: '1:30 PM', status: 'Being Prepared'},
];

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={{flex: 1, backgroundColor: colors.background, padding: spacing.md}}>
      <Text style={typography.h2}>Your Bookings</Text>
      <FlatList
        data={MOCK_BOOKINGS}
        keyExtractor={item => item.orderId}
        contentContainerStyle={{marginTop: spacing.md}}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderTracking', {orderId: item.orderId})}>
            <Text style={typography.bodyBold}>{item.name}</Text>
            <Text style={{color: colors.textSecondary, fontSize: 12}}>Slot: {item.slot}</Text>
            <Text style={{color: colors.primary, fontWeight: '700', marginTop: 4}}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md},
});
