import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';
import { Logo } from './Logo';

// The tinted callout the canvas uses to say something the user needs to know
// but did not ask about -- the under-18 consent rule, "never pay to attend",
// "always free for players", "minors are invisible to unverified accounts".
//
//   background:#FFF4D8; border-radius:10px; padding:10px
//   <logoN 14-16px>  <text 10px var(--goldDp) line-height:1.4>
//
// The Matobev mark rather than a warning triangle is deliberate in the canvas:
// these are the app speaking about its own rules, not an error. The mark says
// "this is us"; a triangle would say "you did something wrong".
//
// -- CONTRAST --
//
// The warm variant is goldDark (#8A5A00) on warningTint, which is 5.6:1. The
// bright gold would be 1.6:1 on that ground and is never used here. This is the
// same gold-on-light rule the whole palette turns on.
export type NoticeTone = 'warning' | 'success' | 'danger' | 'info';

export function NoticeBox({
  children,
  tone = 'warning',
  icon = 'mark',
  style,
}: {
  children: React.ReactNode;
  tone?: NoticeTone;
  /** 'mark' is the canvas default; an icon name overrides it. */
  icon?: 'mark' | React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  const palette = {
    warning: { bg: colors.warningTint, fg: colors.warning },
    success: { bg: colors.successTint, fg: colors.success },
    danger: { bg: colors.dangerTint, fg: colors.error },
    info: { bg: colors.infoTint, fg: colors.primary },
  }[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'flex-start',
          backgroundColor: palette.bg,
          borderRadius: radii.sm,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {icon === 'mark' ? (
        <Logo variant="navy" size={16} style={{ marginTop: 1 }} />
      ) : (
        <Feather name={icon} size={16} color={palette.fg} style={{ marginTop: 1 }} />
      )}
      <Text
        style={{
          flex: 1,
          fontFamily: fontFamily.regular,
          fontSize: fontSize.sm,
          lineHeight: fontSize.sm * 1.4,
          color: palette.fg,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * The step meter above a multi-step form -- "STEP 1 OF 3" over a gold bar that
 * grows to the current fraction.
 *
 * The canvas animates the bar with `barGrow`, but this one is deliberately not
 * animated: the bar re-renders on every step change, and re-running a grow
 * animation from zero each time reads as the form restarting rather than
 * advancing. Growth between steps is what matters, and React Native will not
 * tween a width change on its own, so the honest thing is a static fill.
 */
export function ProgressSteps({
  step,
  total,
  style,
}: {
  step: number;
  total: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const fraction = Math.max(0, Math.min(1, step / total));

  return (
    <View
      style={style}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      <Text
        style={{
          fontFamily: fontFamily.semiBold,
          fontSize: fontSize.caption,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.textMuted,
        }}
      >
        Step {step} of {total}
      </Text>
      <View
        style={{
          height: 4,
          backgroundColor: colors.track,
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: spacing.md,
        }}
      >
        <View style={{ height: '100%', width: `${fraction * 100}%`, backgroundColor: colors.gold }} />
      </View>
    </View>
  );
}
