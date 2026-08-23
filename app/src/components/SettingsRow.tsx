import { View, Text, Pressable, Switch, StyleProp, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../theme';
import { Kicker } from './Kicker';

// The settings row from canvas 63-67. One shape, three behaviours:
//
//   navigation  title, optional value, chevron
//   toggle      title, subtitle, switch
//   danger      title in the danger colour, for destructive actions
//
// The canvas puts a small caps subtitle under most titles ("Ratings, clips,
// messages" under Download my data, "Email me on a new device" under Login
// alerts). That line is doing real work on a settings screen -- it is what
// stops someone tapping Delete account to find out what it does -- so it is a
// first-class prop rather than an afterthought.
export function SettingsRow({
  title,
  subtitle,
  value,
  icon,
  tone = 'default',
  badge,
  onPress,
  toggle,
  onToggle,
  last = false,
}: {
  title: string;
  subtitle?: string;
  /** Right-aligned current value, e.g. "English", "Player". */
  value?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  tone?: 'default' | 'danger';
  /** A small tag on the right, e.g. VERIFIED or READ THIS. */
  badge?: { label: string; tone: 'success' | 'warning' | 'danger' };
  onPress?: () => void;
  /** Present makes this a switch row rather than a navigation row. */
  toggle?: boolean;
  onToggle?: (next: boolean) => void;
  last?: boolean;
}) {
  const colors = useThemeColors();
  const danger = tone === 'danger';
  const isToggle = toggle !== undefined;

  const badgeTone = badge
    ? {
        success: { bg: colors.successTint, fg: colors.success },
        warning: { bg: colors.warningTint, fg: colors.goldDark },
        danger: { bg: colors.dangerTint, fg: colors.error },
      }[badge.tone]
    : null;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        // A settings row is a touch target before it is a line of text.
        minHeight: 56,
      }}
    >
      {!!icon && (
        <Feather name={icon} size={17} color={danger ? colors.error : colors.textBody} style={{ width: 22 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fontFamily.semiBold,
            fontSize: fontSize.body,
            color: danger ? colors.error : colors.textPrimary,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Kicker size={fontSize.caption} style={{ marginTop: 2 }}>
            {subtitle}
          </Kicker>
        )}
      </View>

      {!!value && (
        <Text style={{ fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted }}>
          {value}
        </Text>
      )}

      {!!badge && badgeTone && (
        <View
          style={{
            backgroundColor: badgeTone.bg,
            borderRadius: 6,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
          }}
        >
          <Kicker size={fontSize.caption} tone="inherit" style={{ color: badgeTone.fg }}>
            {badge.label}
          </Kicker>
        </View>
      )}

      {isToggle ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor={colors.white}
        />
      ) : (
        onPress && <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
      )}
    </View>
  );

  if (!onPress || isToggle) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityValue={value ? { text: value } : undefined}
    >
      {body}
    </Pressable>
  );
}

/** A bordered card wrapping a run of rows, with the canvas's kicker above it. */
export function SettingsGroup({
  label,
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  return (
    <View style={style}>
      {!!label && <Kicker style={{ marginBottom: spacing.sm }}>{label}</Kicker>}
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.lg,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}
