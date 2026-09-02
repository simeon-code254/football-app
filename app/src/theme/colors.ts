// Design tokens from the Matobev canvas (Claude Design project
// "Mobile app design scope", file Matobev.dc.html).
//
// The canvas defines one palette:
//   --navy #1d2d3d  --navy2 #416180  --gold #1B66C4  --goldDp #1c3d66
//   --steel #1B66C4 --paper #f2f2f3  --ink #1d1f20   --muted #7a7a7d
//   --success #1E8449 --danger #C0392B --premium #2c455d --div #d4d4d7
//
// -- THIS PALETTE REPLACED A NAVY/GOLD ONE, AND TWO RULES INVERTED WITH IT --
//
// The canvas was re-skinned onto the "Industry" design system in _ds/: every
// token above is a value from its ramps (--navy is Industry's accent-900,
// --paper its bg, --div its neutral-300, and so on). The token NAMES were
// kept, so `--gold` now holds a blue. Read the names as roles, not hues:
//
//   1. GOLD-ON-LIGHT REVERSED. The old #FFC53D measured 1.58:1 on white and
//      could never touch a light surface. #1B66C4 is the opposite: 5.01:1 on
//      paper and 5.61:1 on white, but only 2.50:1 on navy. The accent is now
//      a LIGHT-ground colour, and anything that needs to sit on the navy hero
//      must use accentOnNavy instead. Every place that used to reach for
//      goldDark to survive a light background can now use gold directly.
//
//   2. GOLD AND STEEL COLLAPSED. The canvas gives --gold and --steel the same
//      #1B66C4, so the old "gold means achievement and nothing else" split no
//      longer exists in the source. The names are kept because 144 call sites
//      use them and the distinction may return; they simply resolve to the
//      same family now.
//
// Two further things worth knowing before editing this file.
//
// 3. The canvas has NO dark mode -- it is paper-light throughout, and uses
//    navy only as a ground for hero moments (splash, welcome, rating reveal,
//    premium, full-screen alerts). The dark palette below is DERIVED from the
//    same hues rather than designed, because the app ships a Theme setting
//    users can already change and removing it would be a visible regression.
//    Every dark pairing was contrast-checked; see the numbers inline.
//
// 4. Three canvas values fail WCAG AA on this palette's own grounds and are
//    darkened here. Each is noted at the token with its measured ratio.
//    Nothing else deviates from the canvas.

export const lightColors = {
  // Brand. navy2 carries every action; navy is the ground for hero surfaces.
  // White text measures 6.47:1 on navy2 and 14.05:1 on navy.
  primary: '#416180',
  primaryDark: '#1d2d3d',

  // The accent. Unlike the gold it replaced, this is safe on light ground --
  // 5.01:1 on paper, 5.61:1 on white, 4.54:1 on surfaceMuted -- and unsafe on
  // navy (2.50:1). Use accentOnNavy for dark grounds.
  gold: '#1B66C4',
  goldDark: '#1c3d66', // 9.83:1 on paper; the heavier weight, not a rescue

  // Surfaces. The ground is now a neutral grey rather than the warm paper the
  // previous palette used -- the single biggest visual change in this re-skin.
  background: '#f2f2f3', // --paper
  surface: '#FFFFFF',
  surfaceMuted: '#e7e7ea', // one step down: chips, tracks, recessed rows
  inputBackground: '#f5f5f8',

  // The canvas's most-used colours that its :root block never declares --
  // #b5d9fd appears 34 times and #eef6ff 33 across the 87 screens. Named here
  // because undeclared literals are how a palette drifts.
  //
  // accentOnNavy labels things ON navy grounds -- the "GOOD EVENING" kicker,
  // section counts, the scout badge glyph. It measures 9.57:1 on navy and is a
  // dark-ground colour only.
  accentOnNavy: '#b5d9fd',
  // The rail behind a progress bar or rating arc, and the hairline under a tab
  // bar. One step below surfaceMuted so a track reads as recessed even on a
  // white card. The old warm #EDE8D9 rail does not survive the re-skin: it
  // reads yellow against a neutral ground.
  track: '#d4d4d7', // --div

  // Borders.
  border: '#d4d4d7', // --div, the canvas .card border
  borderDashed: '#b7b7ba',
  divider: '#e7e7ea',

  // Text
  textPrimary: '#1d1f20', // --ink, 14.79:1 on paper
  textLabel: '#2b2b2d',
  textBody: '#424244',
  // Canvas --muted is #7a7a7d, which measures 3.82:1 on paper and 3.47:1 on
  // surfaceMuted -- both under AA. Stepped to the ramp's next stop rather than
  // to an invented hex: 5.87:1 on paper, 5.32:1 on surfaceMuted, 6.56:1 white.
  textMuted: '#5d5d60',
  textPlaceholder: '#98989b',
  textDisabled: '#b7b7ba',

  // Status. Both canvas values fail on this ground -- --success #1E8449 is
  // 3.82:1 on surfaceMuted and --danger #C0392B is 4.41:1 -- so both are
  // darkened to the nearest passing value. They passed on the old warm paper;
  // the neutral ground is lighter, which is what pushed them under.
  success: '#186B3C', // 5.85:1 paper, 5.31:1 surfaceMuted
  error: '#AD3325', // 5.73:1 paper, 5.19:1 surfaceMuted

  // Tints, taken from the canvas's own literals.
  infoTint: '#eef6ff',
  // No amber survives this palette, but a warning tinted blue is
  // indistinguishable from an info notice, so the warm pair is kept on
  // purpose. These two are the only colours here with no canvas source.
  //
  // `warning` exists because the notice boxes previously drew their warning
  // text in goldDark, which was a warm brown and belonged on this tint. After
  // the re-skin goldDark is a dark blue, and blue lettering on amber reads as
  // a rendering fault rather than a warning -- so the role gets its own token
  // instead of borrowing one whose meaning moved.
  warningTint: '#FBF3DF',
  warning: '#8A5A00', // 5.36:1 on warningTint, 5.93:1 on white
  successTint: '#e8f3ec',
  dangerTint: '#fdede9',
  notificationDot: '#AD3325',

  skeleton: '#e7e7ea',
  skeletonHighlight: '#f5f5f8',

  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors: typeof lightColors = {
  // Derived, not designed -- see the file header. The accent lightens so it
  // stays legible on a dark ground: #1B66C4 is 2.50:1 on navy and unusable
  // here, so the dark theme climbs the same ramp instead.
  primary: '#b5d9fd', // 11.89:1 on surface
  primaryDark: '#749dc4',

  // Because the canvas collapsed --gold and --steel into one blue, gold and
  // primary resolve to the same family on dark. Kept as separate tokens so the
  // split can return without touching 144 call sites.
  gold: '#b5d9fd',
  goldDark: '#94bce3', // 8.78:1 on surface

  // The paper ground inverts to a near-black.
  //
  // Strictly ascending by measured luminance, which is the rule the whole
  // elevation system depends on and which this codebase has silently broken
  // twice: background 0.0047 < surfaceMuted 0.0078 < surface 0.0101 <
  // raised 0.0152 < floating 0.0220 < overlay 0.0326. Verified by
  // scripts/verify-theme.mjs, which fails the build if the order inverts.
  background: '#0A0F17',
  surface: '#141A24',
  surfaceMuted: '#10161F',
  inputBackground: '#161D28',

  // Unchanged from light: it was authored to sit on navy, and the dark theme's
  // surfaces are darker still, so it only gets safer.
  accentOnNavy: '#b5d9fd',
  // A track must read as recessed against a dark card, which on dark means
  // slightly lighter, not darker. Sits between surface and border so a filled
  // bar still separates from its rail.
  track: '#232B37',

  border: '#2A3340',
  borderDashed: '#3A4553',
  divider: '#222A36',

  textPrimary: '#f5f5f8', // 16.04:1 on surface
  textLabel: '#e7e7ea',
  textBody: '#d4d4d7',
  // Half a step above the neutral ramp's 500. The ramp value itself (#98989b)
  // measures 4.42:1 on the highest dark surface ('overlay', used by sheets and
  // modals) -- caught by verify-theme.mjs, not by eye, which is the third time
  // that gate has paid for itself on this token.
  textMuted: '#9d9da0', // 6.45:1 on surface, 4.70:1 on overlay
  textPlaceholder: '#7a7a7d',
  textDisabled: '#5d5d60',

  success: '#4ADE80',
  error: '#F87171', // softer than the light theme's -- less harsh on dark

  infoTint: '#16233D',
  warningTint: '#332B10',
  warning: '#E0A62E', // 6.47:1 on the dark warning tint
  successTint: '#0F2818',
  dangerTint: '#3A1414',
  notificationDot: '#F87171',

  skeleton: '#1E2632',
  skeletonHighlight: '#28323F',

  white: '#FFFFFF',
  black: '#000000',
};

export type ThemeColors = typeof lightColors;

export const gradients = {
  primaryButton: [lightColors.primary, lightColors.primaryDark] as const,
  gold: [lightColors.gold, lightColors.goldDark] as const,
};
