// Design tokens from the Matobev canvas (Claude Design project
// "Mobile app design scope", file Matobev.dc.html).
//
// The canvas defines one palette:
//   --navy #0A1B33  --navy2 #123A6B  --gold #FFC53D  --goldDp #8A5A00
//   --steel #5980A6 --paper #F4F2EC  --ink #1D1F20   --muted #6C7789
//   --success #1E8449 --danger #C0392B --premium #B98A2E
//
// Two things about that are worth knowing before editing this file.
//
// 1. The canvas has NO dark mode -- it is paper-light throughout, and uses
//    navy only as an accent for hero moments (splash, welcome, rating reveal,
//    premium, full-screen alerts). The dark palette below is DERIVED from the
//    same hues rather than designed, because the app ships a Theme setting
//    users can already change and removing it would be a visible regression.
//    Every dark pairing was contrast-checked; see the numbers inline.
//
// 2. Two canvas values fail WCAG AA once they sit on the warm paper
//    background rather than a white card, so they are darkened here. Both are
//    noted at the token. Nothing else deviates from the canvas.

export const lightColors = {
  // Brand. navy2 carries every action; navy is the ground for hero surfaces.
  // 11.39:1 on white, and the same on a white-text button fill.
  primary: '#123A6B',
  primaryDark: '#0A1B33',

  // Gold means achievement and nothing else -- the rating, a rank, a
  // milestone. Never a button. #FFC53D is 10.93:1 on navy but 1.58:1 on
  // white, so anything gold on a light surface must use goldDark.
  gold: '#FFC53D',
  goldDark: '#8A5A00', // 5.93:1 on white

  // Surfaces. The canvas ground is warm paper, not cool grey -- this is the
  // single biggest visual change from the previous palette.
  background: '#F4F2EC', // --paper
  surface: '#FFFFFF',
  surfaceMuted: '#EDEAE1', // paper, one step down: chips, tracks, recessed rows
  inputBackground: '#FAF9F5',

  // The canvas's two most-used colours that its own :root block never declares
  // -- #7FB0F0 appears 45 times and #EDE8D9 39 times across the 87 screens.
  // Named here because 84 undeclared literals is how a palette drifts, and
  // because both already existed in this codebase as hardcoded hex.
  //
  // accentOnNavy is the light blue that labels things ON navy grounds -- the
  // "GOOD EVENING" kicker, section counts, the scout badge glyph. It is a dark-
  // ground colour only: 2.28:1 on white, so it must never label paper. On the
  // navy hero it measures 6.31:1.
  accentOnNavy: '#7FB0F0',
  // The warm rail behind a progress bar or rating arc, and the hairline under a
  // tab bar. One step warmer and darker than surfaceMuted so a track reads as
  // recessed even when it sits on a white card.
  track: '#EDE8D9',

  // Borders. Warm to match paper; a cool grey border on this ground reads
  // as a rendering artefact.
  border: '#E7E2D3', // the canvas .card border
  borderDashed: '#D8D1BE',
  divider: '#EFEBE0',

  // Text
  textPrimary: '#1D1F20', // --ink, 16.55:1 on white
  textLabel: '#2C3238',
  textBody: '#3A4048',
  // Canvas --muted is #6C7789, which measures 3.76:1 on surfaceMuted and
  // 4.04:1 on paper -- both under AA. Darkened to the nearest passing value:
  // 4.67:1 on surfaceMuted, 5.02:1 on paper, 5.62:1 on white.
  textMuted: '#5F6878',
  textPlaceholder: '#9AA3AF',
  textDisabled: '#A9B0BA',

  // Status. Canvas --success #1E8449 is 3.92:1 on surfaceMuted, so it is
  // darkened to #1B7943 (4.52:1 there, 5.44:1 on white). --danger passes
  // as drawn.
  success: '#1B7943',
  error: '#C0392B',

  // Tints, warmed to sit on paper rather than on cool grey.
  infoTint: '#E8EEF7',
  warningTint: '#FBF3DF',
  successTint: '#E7F2EA',
  dangerTint: '#F9E9E7',
  notificationDot: '#C0392B',

  skeleton: '#E4E0D5',
  skeletonHighlight: '#F1EEE6',

  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors: typeof lightColors = {
  // Derived, not designed -- see the file header. Primary lightens so it
  // stays legible on a dark ground (7.79:1 on surface); gold is unchanged
  // because it was authored for a dark ground already.
  primary: '#7FB0F0',
  primaryDark: '#5A8FD0',

  gold: '#FFC53D',
  goldDark: '#E0A62E',

  // The paper ground inverts to a warm-neutral near-black rather than the
  // old blue-black, so the two themes read as the same product.
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
  // surfaces are darker still (8.42:1 on surface), so it only gets safer.
  accentOnNavy: '#7FB0F0',
  // The warm paper rail inverts to a lifted one -- a track must read as
  // recessed against a dark card, which on dark means slightly lighter, not
  // darker. Sits between surface and border so a filled bar still separates.
  track: '#232B37',

  border: '#2A3340',
  borderDashed: '#3A4553',
  divider: '#222A36',

  textPrimary: '#F2F0EA', // warm white, matching the paper theme's ink
  textLabel: '#D6D9DE',
  textBody: '#C9CDD4',
  // Lightened from #8C97A6, which measured 4.29:1 on the 'overlay'
  // elevation level -- the highest dark surface, used by sheets and
  // modals. Caught by verify-theme.mjs rather than by eye.
  textMuted: '#909BA9', // 6.19:1 on surface, 4.51:1 on overlay
  textPlaceholder: '#68727F',
  textDisabled: '#525C68',

  success: '#4ADE80',
  error: '#F87171', // softer than light-mode's #C0392B -- less harsh on dark

  infoTint: '#16233D',
  warningTint: '#332B10',
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
