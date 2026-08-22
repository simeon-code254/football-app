import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import {
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../theme';

// The shape every dead-end screen in the design canvas shares: something
// centred to look at, a short title, one line explaining what happened, and
// exactly one thing to do about it.
//
// Screens 35-41 and 45 -- session expired, 404, no connection, server error,
// empty search, empty messages, generic success, maintenance -- are all this
// same layout with different content. They are one component rather than
// eight, because eight copies is how the eighth one ends up saying
// "Something went wrong" with no button on it.
//
// The canvas gives 404 a 64px numeral in #EDE8D9 -- paper, one step down, on
// paper. That is a deliberate near-invisibility: it is a watermark behind the
// real message, not a headline. It is reproduced here as `glyph`, and it is
// the only text in the app allowed to sit below AA, because it is decorative
// and every word it could convey is also in the title underneath. Anything
// that carries meaning goes in `title` or `body`.
export function StatusScreen({
  icon,
  glyph,
  tone = 'neutral',
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  /** A Feather icon, drawn large. Ignored when `glyph` is set. */
  icon?: React.ComponentProps<typeof Feather>['name'];
  /** A short string drawn as an oversized watermark, e.g. "404". */
  glyph?: string;
  /** Tints the icon. `danger` for failures, `success` for confirmations. */
  tone?: 'neutral' | 'danger' | 'success';
  title: string;
  body?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const iconColor =
    tone === 'danger' ? colors.error : tone === 'success' ? colors.success : colors.textMuted;

  return (
    <View style={styles.root}>
      {glyph ? (
        // Hidden from screen readers: it is a watermark, and the title
        // below already says everything it says.
        <Text style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no">
          {glyph}
        </Text>
      ) : icon ? (
        <Feather name={icon} size={52} color={iconColor} style={styles.icon} />
      ) : null}

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {!!body && <Text style={styles.body}>{body}</Text>}

      {!!primaryLabel && !!onPrimary && (
        <PrimaryButton label={primaryLabel} onPress={onPrimary} style={styles.action} height={48} />
      )}
      {!!secondaryLabel && !!onSecondary && (
        <SecondaryButton label={secondaryLabel} onPress={onSecondary} style={styles.action} />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.huge,
      backgroundColor: colors.background,
    },
    glyph: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: 96,
      lineHeight: 100,
      color: colors.surfaceMuted,
    },
    icon: { marginBottom: spacing.md },
    title: {
      fontFamily: fontFamilyDisplay.bold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      maxWidth: 320,
    },
    action: { marginTop: spacing.lg, alignSelf: 'stretch', maxWidth: 320 },
  });
}
