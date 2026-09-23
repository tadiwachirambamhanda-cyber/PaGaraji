/**
 * Workshop — the brand theme for the app (replaced Market Bright, 2026-09-23).
 * Charcoal + safety orange + warm paper. Barlow for headings and body, Archivo
 * Black reserved for the wordmark only — one loud face, used once, not everywhere.
 */

export const Colors = {
  background: '#F2ECDF',
  card: '#FFFFFF',
  cardImage: '#E9E0C9',
  // The dominant UI color: primary buttons, active states, links. Charcoal, not a
  // hue — Workshop reads as bold hardware, not a colorful marketplace.
  header: '#211D18',
  // The one accent. Used for both `accent` (tags, the wordmark's "Pa") and
  // `primary` (CTA emphasis, unread badges) on purpose — a single strong color,
  // not several competing ones.
  accent: '#FF6A00',
  accentInk: '#211D18',
  primary: '#FF6A00',
  ink: '#211D18',
  muted: '#6B6255',
  // Lighter than `muted` so an empty field never reads as if it were filled in.
  placeholder: '#A89C89',
  navMuted: '#9C9280',
  border: '#DED2B8',
  // Outline of an unselected choice: visible, but quieter than the ink of a selected one.
  line: '#C9BB98',
  // Origin ink for imports — needs more contrast than the accent alone gives on cream.
  importInk: '#8C4B14',
  tagInk: '#211D18',
  // A muted workshop green — "in stock" label energy, not a generic system green.
  success: '#3E7D4A',
  danger: '#B23A2E',
  whatsapp: '#25D366',
} as const;

export const Fonts = {
  // Reserved for the wordmark alone — see components/logo.tsx.
  display: 'ArchivoBlack_400Regular',
  headingMedium: 'Barlow_600SemiBold',
  headingSemiBold: 'Barlow_700Bold',
  headingBold: 'Barlow_800ExtraBold',
  bodyRegular: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
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

// Sharper than Market Bright's squircles — toolbox-label corners, not pebbles.
export const Radii = {
  sm: 4,
  chip: 8,
  md: 10,
  lg: 14,
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
