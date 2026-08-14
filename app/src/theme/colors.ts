// Design tokens extracted from `Matobev v4.dc.html` (the primary/most-current
// design mockup). Values are pixel-matched to that file's inline styles —
// do not hand-invent new colors, add them here first.
//
// Two parallel palettes (light/dark) instead of one -- see useThemeColors()
// in ./useTheme.ts for the reactive hook every screen should read from.
// `colors` below stays as a light-mode-equivalent alias so any screen not
// yet migrated to the hook keeps compiling and rendering (just without
// reacting to the theme toggle) rather than breaking mid-rollout.

export const lightColors = {
  // Brand — primary blue gradient used on every CTA/active state. Deliberately
  // identical between light/dark: already vivid enough against a dark surface.
  primary: '#1A6DFF',
  primaryDark: '#0050D0',

  // Accent gold — used on splash/onboarding, ratings, highlights. Same reasoning.
  gold: '#FFD54F',
  goldDark: '#FFAB00',

  // Surfaces
  background: '#E8ECF0', // app shell background (behind the device/card)
  surface: '#FFFFFF', // screen/card background
  surfaceMuted: '#F4F6F9', // secondary buttons, chips, app background under tabs
  inputBackground: '#FAFBFC',

  // Borders / dividers
  border: '#E2E6EC',
  borderDashed: '#D1D5DB',
  divider: '#E8EBF0',

  // Text
  textPrimary: '#111111',
  textLabel: '#444444',
  textBody: '#555555',
  textMuted: '#7A8494',
  textPlaceholder: '#B0B8C4',
  textDisabled: '#9CA3AF',

  // Status
  success: '#22C55E',
  error: '#EF4444',

  // Tint backgrounds -- promoted from ~104 inline hex/rgba literals repeated
  // ad hoc across screens (icon-chip backgrounds, banners) so they can have
  // real dark-mode equivalents instead of staying light-colored forever.
  infoTint: '#EBF2FF',
  warningTint: '#FFF8E1',
  successTint: '#F0FDF4',
  dangerTint: '#FEF2F2',
  notificationDot: '#FF4444',

  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors: typeof lightColors = {
  primary: '#1A6DFF',
  primaryDark: '#0050D0',

  gold: '#FFD54F',
  goldDark: '#FFAB00',

  // Reuses the splash screen's existing dark navy for brand consistency
  // rather than inventing an unrelated dark gray.
  background: '#0A1628',
  surface: '#131B2E',
  surfaceMuted: '#182036',
  inputBackground: '#101827',

  border: '#2A3346',
  borderDashed: '#3A4358',
  divider: '#232C3F',

  textPrimary: '#F5F7FA',
  textLabel: '#C7CDD9',
  textBody: '#B8C0CE',
  textMuted: '#8892A3',
  textPlaceholder: '#5C6478',
  textDisabled: '#4B5468',

  success: '#22C55E',
  error: '#F87171', // slightly softer than light-mode's #EF4444 -- less harsh on a dark surface

  infoTint: '#16233D',
  warningTint: '#332B10',
  successTint: '#0F2818',
  dangerTint: '#3A1414',
  notificationDot: '#FF5252',

  white: '#FFFFFF',
  black: '#000000',
};

export type ThemeColors = typeof lightColors;

export const gradients = {
  primaryButton: [lightColors.primary, lightColors.primaryDark] as const,
  gold: [lightColors.gold, lightColors.goldDark] as const,
};
