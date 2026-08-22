import { StyleProp } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

// The Matobev brand mark. Use this instead of a generic icon anywhere the app
// shows its own identity (splash, auth headers, nav branding).
//
// The design canvas defines exactly two tints in use, and the choice between
// them is not stylistic -- it is a contrast requirement:
//
//   gold  #FFC53D  on navy grounds     10.93:1
//   navy  #0A1B33  on paper or white   11.39:1 / 16.1:1
//
// The wrong way round is unusable, not merely off-brand: gold on white
// measures 1.58:1, which is a mark you cannot see. That is exactly what the
// welcome screen shipped before this, so the rule is stated here rather than
// left to each call site to remember.
//
// There is no white variant. The canvas declares .logoG (gold), .logoN (navy)
// and .logoP (premium #B98A2E, declared but never used); a white tint was an
// invention of this codebase and the only screen using it -- the splash --
// wanted gold, which is what the canvas actually draws there.
type Props = {
  /** 'gold' for navy grounds, 'navy' for paper and white ones. */
  variant?: 'gold' | 'navy';
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

export function Logo({ variant = 'gold', size = 48, style }: Props) {
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no"
      source={SOURCES[variant]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
