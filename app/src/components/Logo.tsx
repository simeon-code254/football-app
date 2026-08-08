import { Image, StyleProp, ImageStyle } from 'react-native';

type Props = {
  /** 'color' = full gradient mark (light backgrounds). 'white' = flat white
   * silhouette (dark/photo backgrounds, same mask used for the Android
   * monochrome adaptive icon). */
  variant?: 'color' | 'white';
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const SOURCES = {
  color: require('../../assets/logofree.png'),
  white: require('../../assets/android-icon-monochrome.png'),
};

// The Matobev brand mark (uploaded logo, transparent background) — use this
// instead of a generic icon anywhere the app needs to show its own identity
// (splash, auth headers, nav branding).
export function Logo({ variant = 'color', size = 48, style }: Props) {
  return <Image source={SOURCES[variant]} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}
