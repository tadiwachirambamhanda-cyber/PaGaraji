/**
 * Workshop — the brand theme for the app (replaced Market Bright, 2026-09-23).
 * Charcoal + safety orange + warm paper. Barlow for headings and body, Archivo
 * Black reserved for the wordmark only — one loud face, used once, not everywhere.
 *
 * Dark mode (added 2026-09-23, fill-vs-background contrast fixed same day):
 * `accent`/`primary`, `accentInk`/`tagInk` and `whatsapp` are deliberately
 * IDENTICAL in both palettes — vibrant/brand colors that read fine as a filled
 * background against paper OR charcoal, so there's nothing to invert. `header`
 * is NOT identical: it's a fill too (button/avatar/pill background, paired with
 * its own contrasting foreground, never text on the plain screen background),
 * but a dark charcoal fill needs to be LIGHTER than this theme's own near-black
 * background to still read as a distinct raised surface — using the exact same
 * value in both themes made every `header`-filled button/avatar/pill nearly
 * invisible in dark mode (only its white label text stayed visible, floating
 * with no boundary). Everything else (surfaces, text, borders, status colors)
 * flips normally. See `useColors()`.
 */

import { useSettings } from '@/store/settings';

export type ColorPalette = Record<
  | 'background'
  | 'card'
  | 'cardImage'
  | 'header'
  | 'accent'
  | 'accentInk'
  | 'primary'
  | 'ink'
  | 'muted'
  | 'placeholder'
  | 'navMuted'
  | 'border'
  | 'line'
  | 'importInk'
  | 'tagInk'
  | 'success'
  | 'danger'
  | 'whatsapp',
  string
>;

const LightColors: ColorPalette = {
  background: '#F2ECDF',
  card: '#FFFFFF',
  cardImage: '#E9E0C9',
  // The dominant fill color: primary buttons, active states, avatar/pill backgrounds.
  // Charcoal, not a hue — Workshop reads as bold hardware, not a colorful marketplace.
  // Always paired with its own light/accent foreground, so it doesn't need a dark variant.
  header: '#211D18',
  // The one accent. Used for both `accent` (tags, the wordmark's "Pa") and
  // `primary` (CTA emphasis, unread badges) on purpose — a single strong color,
  // not several competing ones. Vibrant enough to read on both a light paper and
  // a dark charcoal background, so it doesn't need a dark variant either.
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
};

const DarkColors: ColorPalette = {
  background: '#17140F',
  card: '#241F18',
  cardImage: '#2C2620',
  // NOT the same value as light mode, on purpose: `header` fills buttons/avatars/
  // pills that need to read as a distinct raised surface. In light mode a dark
  // charcoal fill pops against the light paper background; the identical value
  // against this theme's near-black background would have almost no contrast,
  // making the button's shape disappear (only its white text stays visible,
  // floating with no boundary) — the exact "invisible button" bug this fixes.
  header: '#3D362C',
  accent: '#FF6A00',
  accentInk: '#211D18',
  primary: '#FF6A00',
  // Paper, inverted: the same warm off-white the light theme uses as its background.
  ink: '#F2ECDF',
  muted: '#B3A890',
  placeholder: '#6B6255',
  navMuted: '#7A705F',
  border: '#3A3327',
  line: '#4A4133',
  importInk: '#E0A15C',
  tagInk: '#211D18',
  success: '#5FA86C',
  danger: '#E0685A',
  whatsapp: '#25D366',
};

// A static fallback for anything read outside a component (rare) — always light.
// Every screen/component should use `useColors()` instead so it actually reacts
// to the theme setting.
export const Colors = LightColors;

/** The live color palette for the current theme setting — reactive, re-renders on toggle. */
export function useColors(): ColorPalette {
  const { themeMode } = useSettings();
  return themeMode === 'dark' ? DarkColors : LightColors;
}

export const Fonts = {
  // Reserved for the wordmark alone — see components/logo.tsx.
  display: 'ArchivoBlack_400Regular',
  // Headings/emphasis: Space Grotesk (2026-09-23, replaced Barlow here) — same
  // clean, utilitarian bones as Barlow but with a bit more technical character,
  // a step toward the wordmark's Archivo Black without going that loud
  // everywhere. Tops out at 700 (no 800 weight exists), so `headingSemiBold`
  // and `headingBold` share the same weight — differentiated by size/context
  // instead, same as before.
  headingMedium: 'SpaceGrotesk_600SemiBold',
  headingSemiBold: 'SpaceGrotesk_700Bold',
  headingBold: 'SpaceGrotesk_700Bold',
  // Body text stays Barlow — reads well at small sizes, and keeps one font
  // doing headings/emphasis and a different one carrying paragraph-length text,
  // rather than one face for everything.
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
// instead of looking like a generic default shadow. Same in both themes — a
// black-tinted shadow reads fine on a dark surface too, just less visible,
// which is the correct behavior (elevation matters less once the backdrop
// itself is already dark).
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
