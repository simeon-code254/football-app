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
  // The floor. Nothing in the app should be smaller than this.
  //
  // Added because fifteen places had already bypassed the scale to reach a
  // caption size it did not define -- eleven at 10 and four at 9. A scale
  // people routinely step outside is missing a step, so this names the one
  // they were reaching for instead of leaving it as scattered magic numbers.
  //
  // The 9s are gone: that is below every platform floor (iOS HIG says 11pt,
  // Material's caption is 12sp). 10 still sits under iOS's guidance and is
  // used only for true captions -- attribute keys under a number, badge
  // labels, the provisional line -- never for anything a user has to read at
  // length. These are not capped with maxFontSizeMultiplier, so they do grow
  // with the OS text-size setting for anyone who needs that.
  caption: 10,
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
