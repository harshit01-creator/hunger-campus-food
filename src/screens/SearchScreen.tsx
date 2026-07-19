import React from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {colors, spacing, radius, typography} from '../theme/theme';

export default function SearchScreen() {
  return (
    <View style={{flex: 1, backgroundColor: colors.background, padding: spacing.md}}>
      <Text style={typography.h2}>Search</Text>
      <TextInput
        style={styles.input}
        placeholder="Search kitchens, dishes, cuisines..."
        placeholderTextColor={colors.textMuted}
      />
      <Text style={{color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center'}}>
        Start typing to find a kitchen or dish.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    color: colors.textPrimary,
  },
});
