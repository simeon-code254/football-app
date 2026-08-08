// v4.dc.html loads only Poppins (300–900) — no Inter, despite the written
// brief mentioning both. Matching the primary mockup file, not the brief.
export const fontFamily = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
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
