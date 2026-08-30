export const colors = {
  ink: '#0B1114',
  surface: '#121A1D',
  line: '#29373B',
  paper: '#F4EFE6',
  muted: '#A6B0AC',
  acid: '#D7F45B',
  flash: '#FF7A4D',
  focus: '#F4EFE6',
} as const;

export const spacing = {
  hairline: 1,
  micro: 6,
  compact: 10,
  control: 14,
  inset: 16,
  screen: 24,
  section: 32,
  hero: 48,
} as const;

export const radii = {
  card: 0,
  control: 6,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 48,
    lineHeight: 49,
    fontWeight: '800' as const,
    letterSpacing: -1.8,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -1.1,
  },
  body: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  utility: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800' as const,
    letterSpacing: 1.8,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
} as const;

export const navigation = {
  tabBarPaddingTop: 8,
  activeIndicatorHeight: 2,
} as const;

export type TabGlyphName = 'home' | 'camera' | 'chat' | 'archive';
