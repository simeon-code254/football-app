// Barlow, per the Matobev canvas. It loads two families and uses them for
// different jobs:
//
//   Barlow            body, labels, everything read as prose
//   Barlow Condensed  the .h and .mono classes -- headings, the rating
//                     numeral, and uppercase letterspaced micro-labels
//
// The condensed face is the point. It sets large numbers and short caps
// labels far tighter than Barlow can, which is what gives the rating card
// and the section kickers their character. Using regular Barlow for those
// would technically "apply the design" and lose the thing that makes it
// look designed.
//
// Only the weights the canvas actually uses are loaded, because each one is
// a separate file fetched and parsed on every cold start -- and this app's
// users are on 1-2 GB devices over metered data.
export const fontFamily = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semiBold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  // Barlow ships no 800; the canvas reaches for Condensed at that weight
  // anyway, so extraBold maps there rather than to a face that does not exist.
  extraBold: 'BarlowCondensed_800ExtraBold',
} as const;

// Display faces -- use these deliberately, not as a default.
export const fontFamilyDisplay = {
  medium: 'BarlowCondensed_500Medium',
  semiBold: 'BarlowCondensed_600SemiBold',
  bold: 'BarlowCondensed_700Bold',
  extraBold: 'BarlowCondensed_800ExtraBold',
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

// The canvas's .mono kicker:
//   .mono { font-family:'Barlow Condensed'; letter-spacing:1.2px;
//           text-transform:uppercase }
//
// It labels sections and states all over the design -- "GOOD EVENING",
// "THIS WEEK", "PENDING REVIEW" -- always small, always caps, always in the
// condensed face. Named here rather than left to each screen because the
// tracking is what makes it read as a kicker rather than as shouting, and a
// value repeated by hand across dozens of screens drifts.
//
// Not a component: it is three properties, and every site needs to compose it
// with its own colour and size anyway.
export const kicker = {
  fontFamily: fontFamilyDisplay.semiBold,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
} as const;
