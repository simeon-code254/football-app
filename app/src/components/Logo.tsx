import { ColorValue, StyleProp } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

// The Matobev brand mark. Use this instead of a generic icon anywhere the app
// shows its own identity (splash, auth headers, nav branding).
//
// The design canvas defines exactly two tints in use, and the choice between
// them is not stylistic -- it is a contrast requirement:
//
//   light  #b5d9fd  on navy grounds     9.57:1
//   navy   #1d2d3d  on paper or white   12.56:1 / 14.05:1
//
// The wrong way round is unusable, not merely off-brand: the light mark on
// white measures 1.47:1, which is a mark you cannot see. So the rule is stated
// here rather than left to each call site to remember.
//
// The variant is still named `gold` for the same reason the theme token is --
// the canvas kept its token names through the re-skin onto the Industry
// palette, and only the values changed. Nothing here is gold any more.
//
// There is no white variant. The canvas declares .logoG, .logoN and .logoP
// (premium, declared but never used); a white tint was an invention of this
// codebase and the only screen using it -- the splash -- wanted the light
// mark, which is what the canvas actually draws there.
//
// -- WHEN THE GROUND IS NOT KNOWN AT THE CALL SITE --
//
// A fixed variant only works where the surface behind the mark is fixed. The
// tab bar is not: it is paper in the light theme and near-navy in the dark
// one, so `variant="navy"` rendered an invisible mark for every dark-theme
// user, and never dimmed or lit with the rest of the bar. Pass `tint` there
// instead and hand it the tint the navigator already computes, so the mark
// tracks active/inactive and both themes the way every sibling icon does.
//
// This is the deck's own model rather than a workaround: the brand assets are
// one silhouette recoloured per surface, and expo-image's `tintColor` applies
// a colour "to every non-transparent pixel", which is the same alpha-only
// read that the canvas's CSS mask performs.
type Props = {
  /** 'gold' for navy grounds, 'navy' for paper and white ones. */
  variant?: 'gold' | 'navy';
  /**
   * Explicit colour for the mark. Overrides `variant`. Typed as `ColorValue`
   * so a navigator's `tabBarIcon` tint can be handed straight through.
   */
  tint?: ColorValue;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const SOURCES = {
  // Both are painted from the mask's alpha channel -- the canvas tints one
  // PNG with CSS -webkit-mask, which reads alpha only, so the source file's
  // own RGB still carries the old teal gradient and cannot be used directly.
  gold: require('../../assets/logofree.png'),
  navy: require('../../assets/logo-navy.png'),
};

export function Logo({ variant = 'gold', tint, size = 48, style }: Props) {
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no"
      // Either PNG carries the same silhouette in its alpha channel, so when a
      // tint is supplied the choice of source is immaterial -- every opaque
      // pixel is repainted.
      source={SOURCES[variant]}
      // expo-image types this as `string`, while React Native's ColorValue is
      // `string | OpaqueColorValue`. The opaque half only ever comes from
      // PlatformColor/DynamicColorIOS, neither of which this app uses, so
      // every value reaching here is already a colour string.
      tintColor={tint as string | undefined}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
