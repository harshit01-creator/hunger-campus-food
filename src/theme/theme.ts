// Central design tokens pulled directly from the reference UI screenshots.
// Keep every screen importing from here — no hardcoded hex values in screens.

export const colors = {
  primary: '#B3261E',      // deep red — buttons, active tab, accents
  primaryDark: '#8C1D17',
  onPrimary: '#FFFFFF',

  background: '#FBF3EF',   // warm cream app background
  surface: '#FFFFFF',
  surfaceMuted: '#F1E9E4',

  accentGreen: '#1E7A3D',  // veg dot / success states
  accentAmber: '#F5A623',  // slot / rating badges

  textPrimary: '#1C1C1C',
  textSecondary: '#6B6B6B',
  textMuted: '#9A9A9A',
  border: '#EAE1DB',

  heroGradientStart: '#3A2E2A',
  heroGradientEnd: '#C97B4A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '800' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

export const brand = {
  name: 'Hunger',
  tagline: 'Scheduled meals you can count on.',
  logo: require('../assets/logo.png'),
};
