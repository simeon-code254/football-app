import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../../src/theme';
import { images } from '../../src/constants/images';

const VIDEO_THUMB = images.reelsClip;
const AVATAR = images.avatarMale;

const ACTIONS: { icon: React.ComponentProps<typeof Feather>['name']; count: string }[] = [
  { icon: 'heart', count: '2.4k' },
  { icon: 'message-circle', count: '186' },
  { icon: 'send', count: '54' },
  { icon: 'bookmark', count: '92' },
];

// Matches the mockup's REELS tab: full-bleed vertical clip, creator overlay,
// position/OVR badge, caption + hashtags, right-side action rail.
export default function Reels() {
  return (
    <View style={styles.root}>
      <Image source={{ uri: VIDEO_THUMB }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable style={styles.playOverlay}>
        <View style={styles.playCircle}>
          <Feather name="play" size={26} color={colors.white} />
        </View>
      </Pressable>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>CAM · 82 OVR</Text>
      </View>

      <View style={styles.actionRail}>
        {ACTIONS.map((a) => (
          <View key={a.icon} style={styles.actionItem}>
            <Feather name={a.icon} size={26} color={colors.white} />
            <Text style={styles.actionCount}>{a.count}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomInfo}>
        <View style={styles.creatorRow}>
          <Image source={{ uri: AVATAR }} style={styles.creatorAvatar} />
          <Text style={styles.creatorName}>marcus_johnson</Text>
        </View>
        <Text style={styles.caption}>Weekend hat-trick vs Academy FC 🔥</Text>
        <Text style={styles.hashtags}>#freekick #goals #matobev</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  playOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.white },
  actionRail: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 20 },
  actionItem: { alignItems: 'center', gap: 4 },
  actionCount: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.white },
  bottomInfo: { position: 'absolute', left: 16, right: 80, bottom: 40 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creatorAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.white },
  creatorName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.white, marginBottom: 4 },
  hashtags: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
});
