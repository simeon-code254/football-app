import { Modal, Pressable, StyleSheet, View, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';

// Full-screen playback for one video.
//
// This existed inline on the player's own profile and nowhere else, which meant
// a scout opening a player's profile could see thumbnails with a play icon
// drawn on them and tap nothing -- the thumbnails were plain Views. Watching a
// player's footage is the entire point of a scouting app, and it was the one
// thing a scout could not do from a player's profile.
//
// Shared rather than copied so the two screens cannot drift, and so playback
// behaviour (autoplay, native controls, contentFit) is decided once.

function Playback({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => p.play());
  // contentFit="contain" rather than "cover": highlight clips are often shot
  // in portrait on a phone, and cropping the frame can cut out the player the
  // scout is trying to watch.
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}

export function VideoPlayerModal({
  url,
  title,
  onClose,
}: {
  /** Signed URL. Null closes the modal. */
  url: string | null;
  /** Shown over the video so a scout knows which clip they opened. */
  title?: string | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Modal visible={!!url} animationType="fade" onRequestClose={onClose}>
      <View accessibilityViewIsModal style={styles.root}>
        {url && <Playback url={url} />}

        {!!title && (
          <View style={styles.titleBar} pointerEvents="none">
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close video"
          hitSlop={12}
        >
          <Feather name="x" size={20} color={colors.white} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  // Fixed dark chrome rather than theme colours: this sits over video, where
  // the background is black regardless of what theme the app is in.
  close: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 66,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.bodySm,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
    paddingVertical: spacing.xs,
  },
});
