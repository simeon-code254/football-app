import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { fontSize, kicker, useThemeColors } from '../theme';

// The canvas's .mono label:
//
//   .mono { font-family:'Barlow Condensed'; letter-spacing:1.2px;
//           text-transform:uppercase }
//
// It is the single most repeated text style in the design -- "GOOD EVENING",
// "THIS WEEK", "OVERALL · RIGHT-BACK", "PENDING REVIEW", every stat caption and
// every section header. The `kicker` token already names the three properties;
// this wraps them with the colour and size defaults so the common case is one
// element rather than a spread plus three overrides at ~200 call sites.
//
// The canvas draws these between 7px and 8.5px, which scales to 9.5-11.5 -- so
// `caption` (10) is the default and `xs` (11) the step up. It deliberately does
// NOT go below caption: 10 is already under iOS's 11pt guidance and is only
// defensible because these are true captions, never running text.
export function Kicker({
  children,
  size = fontSize.caption,
  tone = 'muted',
  style,
  ...rest
}: TextProps & {
  size?: number;
  /**
   * 'muted' for captions on paper, 'onNavy' for captions on the navy hero
   * surfaces, 'primary' to make it carry weight, 'inherit' to colour it at the
   * call site.
   */
  tone?: 'muted' | 'onNavy' | 'primary' | 'inherit';
  style?: StyleProp<TextStyle>;
}) {
  const colors = useThemeColors();

  const color =
    tone === 'muted'
      ? colors.textMuted
      : tone === 'onNavy'
        ? colors.accentOnNavy
        : tone === 'primary'
          ? colors.textPrimary
          : undefined;

  return (
    <Text style={[kicker, { fontSize: size }, color ? { color } : null, style]} {...rest}>
      {children}
    </Text>
  );
}
