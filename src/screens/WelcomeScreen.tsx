import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, radius, typography, brand} from '../theme/theme';

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');

  return (
    <View style={styles.container}>
      {/* Hero banner */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.logoRow}>
            <Image source={brand.logo} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoText}>{brand.name}</Text>
          </View>
          <TouchableOpacity style={styles.langPill}>
            <Text style={styles.langPillText}>文A  EN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Welcome to {brand.name}</Text>
        <Text style={styles.subtitle}>{brand.tagline}</Text>

        <View style={styles.phoneRow}>
          <Text style={styles.countryCode}>+91</Text>
          <View style={styles.divider} />
          <TextInput
            style={styles.phoneInput}
            placeholder="Enter mobile number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={styles.otpButton}
          onPress={() => navigation.replace('MainTabs')}>
          <Text style={styles.otpButtonText}>Get OTP  →</Text>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR SET LOCATION</Text>
          <View style={styles.orLine} />
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search your area or society..."
          placeholderTextColor={colors.textMuted}
          value={area}
          onChangeText={setArea}
        />

        <TouchableOpacity style={styles.locationRow}>
          <Text style={styles.locationText}>◎  Use current location</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Service</Text> &{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.heroGradientStart},
  hero: {height: '38%', backgroundColor: colors.heroGradientEnd, padding: spacing.lg},
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  logoImg: {width: 32, height: 32},
  logoText: {...typography.h1, color: colors.onPrimary},
  langPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  langPillText: {color: colors.onPrimary, fontSize: 13, fontWeight: '600'},
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    marginTop: -28,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {...typography.h1, textAlign: 'center', color: colors.textPrimary},
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  countryCode: {...typography.bodyBold, color: colors.textPrimary},
  divider: {width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: spacing.sm},
  phoneInput: {flex: 1, ...typography.body, color: colors.textPrimary},
  otpButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  otpButtonText: {...typography.bodyBold, color: colors.onPrimary, fontSize: 16},
  orRow: {flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg},
  orLine: {flex: 1, height: 1, backgroundColor: colors.border},
  orText: {...typography.caption, color: colors.textMuted, marginHorizontal: spacing.sm},
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  locationRow: {alignItems: 'center', marginTop: spacing.lg},
  locationText: {...typography.bodyBold, color: colors.primary},
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  linkText: {color: colors.primary, textDecorationLine: 'underline'},
});
