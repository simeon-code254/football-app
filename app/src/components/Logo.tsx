import { StyleProp } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

type Props = {
  /** 'color' = full gradient mark (light backgrounds). 'white' = flat white
   * silhouette (dark/photo backgrounds, same mask used for the Android
   * monochrome adaptive icon). */
  variant?: 'color' | 'white' | 'navy';
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const SOURCES = {
  // Gold on transparent -- the canvas mark. The white variant is its own
  // file rather than the Android monochrome icon: that asset is padded to
  // Android's 66% adaptive safe zone, so reusing it here rendered the mark
  // noticeably smaller than the colour variant beside it.
  color: require('../../assets/logofree.png'),
  white: require('../../assets/logo-white.png'),
  navy: require('../../assets/logo-navy.png'),
};

// The Matobev brand mark (uploaded logo, transparent background) — use this
// instead of a generic icon anywhere the app needs to show its own identity
// (splash, auth headers, nav branding).
export function Logo({ variant = 'color', size = 48, style }: Props) {
  return <Image
      accessibilityElementsHidden
      importantForAccessibility="no" source={SOURCES[variant]} style={[{ width: size, height: size }, style]} contentFit="contain" />;
}
