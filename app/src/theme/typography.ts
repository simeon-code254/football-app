// v4.dc.html loads only Poppins (300–900) — no Inter, despite the written
// brief mentioning both. Matching the primary mockup file, not the brief.
// Only the weights actually used anywhere in the app are loaded at boot
// (Poppins_300Light/900Black were being fetched+parsed on every cold start
// for zero real usages -- pure startup cost, dropped rather than kept
// "just in case").
export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  bodySm: 13,
  body: 14,
  bodyLg: 15,
  title: 17,
  heading: 18,
  headingLg: 22,
  display: 24,
  displayLg: 26,
  hero: 28,
  splash: 34,
} as const;
