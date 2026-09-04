import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { useGlow } from '../lib/motion';
import { radii, useThemeColors } from '../theme';

// The canvas's centre tab button (screen 10): a raised navy tile with a gold
// plus, lifted above the bar and carrying a slow gold glow.
//
// The tab was a plain `plus-square` outline like the other four. Uploading is
// the one action the whole product depends on, and the canvas is right to
// stop presenting it as the third of five equal siblings.
//
// THE GLOW IS NOT A SHADOW HERE.
//
// The canvas pulses a gold box-shadow, `0 0 0` to `0 0 20px`. React Native can
// animate iOS shadow properties, but Android's only shadow is `elevation`,
// which cannot take a colour -- so an animated gold shadow would simply not
// exist on the majority platform for this app. It is drawn instead as a gold
// halo view behind the tile, fading and expanding on the canvas's timing.
//
// The glow stops entirely under reduce-motion (see lib/motion), which matters
// more here than elsewhere: this one is always on screen.
export function UploadTabButton() {
  const colors = useThemeColors();
  const glow = useGlow();

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.halo, { backgroundColor: colors.gold }, glow]}
        pointerEvents="none"
      />
      <View style={[styles.tile, { backgroundColor: colors.primaryDark }]}>
        {/* Gold on navy is 10.93:1. The tab bar's active/inactive tint is
            deliberately not taken as a prop: the tile carries its own ground,
            so the bar's tint could only ever reduce contrast here. It still
            drives the label underneath, which is where the selected state
            actually needs to read. */}
        <Feather name="plus" size={22} color={colors.gold} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    // Canvas 10 lifts the tile out of the bar (margin-top:-20). Without this
    // it sat flush and read as a fifth equal icon.
    marginTop: -18,
  },
  halo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // A ring of the bar's own ground, so the lifted tile reads as sitting on
    // top of the bar rather than punched through it.
    borderWidth: 3,
    borderColor: 'transparent',
  },
});
