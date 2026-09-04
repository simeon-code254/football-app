import { View, Text, Modal, StyleSheet, ImageBackground } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../theme';
import { Kicker } from './Kicker';
import { Button, LinkButton } from './Button';
import { Logo } from './Logo';

// Canvas screens 56 FULL-SCREEN TRIAL ALERT and 58 FULL-SCREEN NEWS ALERT.
//
//   56  TRIAL NEAR YOU · [NF] NAIROBI FC · 14 SEP · 9 DAYS
//       "U19 Open Trial is looking for right-backs"
//       "You match the position and age range. Free entry, guardian consent
//        already on file."
//       [Read more]  Close
//
//   58  MATOBEV NEWS · [SCOUTING]
//       "Three Kenyan teenagers signed from Matobev clips this month"
//       21 AUG · 3 MIN READ
//       [Read more]  Close
//
// One component: they are the same interruption with different content, and
// two copies would drift.
//
// -- WHY A FULL SCREEN, AND WHY DISMISSIBLE --
//
// The canvas reserves this for two things a player would want interrupting
// them: a trial they actually match, and news about people like them. Anything
// less than that is a notification, not a takeover. `Close` is always present
// and always the same size as it looks -- an interstitial you cannot leave is
// how an app teaches people to force-quit it.
export function FullScreenAlert({
  visible,
  kicker,
  tag,
  title,
  body,
  meta,
  imageUri,
  primaryLabel = 'Read more',
  onPrimary,
  onClose,
}: {
  visible: boolean;
  /** The small caps line above everything: "TRIAL NEAR YOU", "MATOBEV NEWS". */
  kicker: string;
  /** Optional gold chip, e.g. the news section or a countdown. */
  tag?: string;
  title: string;
  body?: string;
  /** Small caps line under the title, e.g. "21 AUG · 3 MIN READ". */
  meta?: string;
  imageUri?: string | null;
  primaryLabel?: string;
  onPrimary?: () => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {!!imageUri && (
          <View style={styles.hero}>
            <ImageBackground
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(29,45,61,0.25)', 'transparent', '#1d2d3d']}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="alertGlow" cx="50%" cy="15%" r="60%">
              <Stop offset="0" stopColor="#b5d9fd" stopOpacity={0.14} />
              <Stop offset="1" stopColor="#b5d9fd" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#alertGlow)" />
        </Svg>

        <View style={styles.body}>
          <View style={styles.kickerRow}>
            <Logo variant="gold" size={16} />
            <Kicker size={fontSize.caption} tone="inherit" style={{ color: colors.gold }}>
              {kicker}
            </Kicker>
          </View>

          {!!tag && (
            <View style={styles.tag}>
              <Kicker size={fontSize.caption} tone="inherit" style={{ color: colors.primaryDark }}>
                {tag}
              </Kicker>
            </View>
          )}

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>

          {!!meta && <Kicker style={styles.meta}>{meta}</Kicker>}
          {!!body && <Text style={styles.copy}>{body}</Text>}

          <View style={{ flex: 1 }} />

          <Button label={primaryLabel} variant="gold" onPress={onPrimary ?? onClose} />
          <LinkButton label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    hero: { height: cx(180) },
    body: { flex: 1, paddingHorizontal: cx(22), paddingTop: cx(28), paddingBottom: cx(20) },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.gold,
      borderRadius: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginTop: spacing.md,
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.hero,
      lineHeight: fontSize.hero * 1.12,
      color: colors.white,
      marginTop: spacing.md,
    },
    meta: { color: colors.accentOnNavy, marginTop: spacing.sm },
    copy: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.55,
      color: 'rgba(255,255,255,0.65)',
      marginTop: spacing.md,
    },
    radius: { borderRadius: radii.lg },
  });
}
