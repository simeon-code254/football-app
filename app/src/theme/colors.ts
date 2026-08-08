// Design tokens extracted from `Matobev v4.dc.html` (the primary/most-current
// design mockup). Values are pixel-matched to that file's inline styles —
// do not hand-invent new colors, add them here first.

export const colors = {
  // Brand — primary blue gradient used on every CTA/active state
  primary: '#1A6DFF',
  primaryDark: '#0050D0',

  // Accent gold — used on splash/onboarding, ratings, highlights
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

  // Status (from the original product brief; not yet used in the mockup)
  success: '#22C55E',
  error: '#EF4444',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  primaryButton: [colors.primary, colors.primaryDark] as const,
  gold: [colors.gold, colors.goldDark] as const,
};
