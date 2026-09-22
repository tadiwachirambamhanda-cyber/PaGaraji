/**
 * Market Bright — the brand theme for the app.
 * Deep teal + sunflower yellow + vivid orange, Baloo 2 headings / Manrope body.
 */

export const Colors = {
  background: '#F7F1E3',
  card: '#FFFFFF',
  cardImage: '#FDEBD3',
  header: '#0E7C7B',
  accent: '#F5B700',
  accentInk: '#1A1A1A',
  primary: '#E8571F',
  ink: '#1A1A1A',
  muted: '#5B6664',
  // Lighter than `muted` so an empty field never reads as if it were filled in.
  placeholder: '#8E938C',
  navMuted: '#B9AE9A',
  border: '#E6DCC6',
  // Outline of an unselected choice: visible, but quieter than the ink of a selected one.
  line: '#CBC2AB',
  // Origin ink for imports — the brand orange is too light to read as text on cream.
  importInk: '#B3560F',
  tagInk: '#3A2A00',
  success: '#0E7C7B',
  danger: '#C0392B',
  whatsapp: '#25D366',
} as const;

export const Fonts = {
  headingMedium: 'Baloo2_500Medium',
  headingSemiBold: 'Baloo2_600SemiBold',
  headingBold: 'Baloo2_700Bold',
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodyBold: 'Manrope_700Bold',
} as const;

// Six sizes, nothing in between. Pair with Baloo for titles, Manrope for text.
export const Type = {
  caption: 11,
  small: 13,
  body: 15,
  title: 18,
  heading: 24,
  display: 30,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  sm: 8,
  chip: 14,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

// Tinted with the brand ink rather than pure black, so elevation stays warm
// instead of looking like a generic default shadow.
export const Shadows = {
  sm: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  // Bottom sheets sit flush with the screen edge, so the shadow lifts
  // upward instead of down.
  sheet: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;
