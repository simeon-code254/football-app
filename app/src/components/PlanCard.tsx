import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../theme';
import { Kicker } from './Kicker';

// The pricing card from canvas screens 83 (scout tiers) and 84 (club plans).
//
//   plain tier   navy panel, white name, gold price
//   selected     gold border + "MOST PICKED" / "YOUR PLAN" tag above it
//   feature list ticks in gold
//
// Both screens sit on navy, so the card is a lift out of that ground rather
// than a card on paper -- which is why it does not reuse `Card`.
export function PlanCard({
  name,
  price,
  period,
  blurb,
  features,
  tag,
  highlighted = false,
  onPress,
  style,
}: {
  name: string;
  /** Rendered as given, e.g. "$49" or "Talk to us". */
  price: string;
  /** e.g. "/yr" or "/mo". Omitted for a non-numeric price. */
  period?: string;
  blurb?: string;
  features?: string[];
  /** The label above the card: "MOST PICKED", "YOUR PLAN". */
  tag?: string;
  highlighted?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  const body = (
    <View
      style={[
        {
          backgroundColor: highlighted ? 'rgba(255,197,61,0.10)' : 'rgba(255,255,255,0.06)',
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: highlighted ? colors.gold : 'rgba(255,255,255,0.12)',
          padding: spacing.lg,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fontFamilyDisplay.extraBold,
            fontSize: fontSize.title,
            color: colors.white,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontFamily: fontFamilyDisplay.extraBold,
            fontSize: fontSize.headingLg,
            color: colors.gold,
          }}
        >
          {price}
        </Text>
        {!!period && (
          <Text
            style={{
              fontFamily: fontFamily.regular,
              fontSize: fontSize.sm,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {period}
          </Text>
        )}
      </View>

      {!!blurb && (
        <Text
          style={{
            fontFamily: fontFamily.regular,
            fontSize: fontSize.sm,
            lineHeight: fontSize.sm * 1.45,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 4,
          }}
        >
          {blurb}
        </Text>
      )}

      {!!features?.length && (
        <View style={{ gap: 6, marginTop: spacing.md }}>
          {features.map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <Feather name="check" size={13} color={colors.gold} style={{ marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: fontFamily.regular,
                  fontSize: fontSize.sm,
                  color: colors.white,
                }}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View>
      {!!tag && (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.gold,
            borderTopLeftRadius: radii.sm,
            borderTopRightRadius: radii.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: 3,
            marginBottom: -2,
          }}
        >
          <Kicker size={fontSize.caption} tone="inherit" style={{ color: colors.primaryDark }}>
            {tag}
          </Kicker>
        </View>
      )}
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${price}${period ?? ''}`}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

/**
 * A line in a checkout total, from canvas screen 82.
 *
 * Money is passed as an already-formatted string rather than a number, because
 * this component must never be the thing that decides how a currency is
 * rendered -- the canvas shows USD, the primary payment method is M-Pesa, and
 * getting KES/USD formatting wrong in a total is the kind of bug that ends in
 * a chargeback.
 */
export function MoneyRow({
  label,
  amount,
  emphasis = false,
}: {
  label: string;
  amount: string;
  emphasis?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: spacing.sm,
      }}
    >
      <Text
        style={{
          fontFamily: emphasis ? fontFamily.bold : fontFamily.regular,
          fontSize: emphasis ? fontSize.bodyLg : fontSize.bodySm,
          color: emphasis ? colors.textPrimary : colors.textMuted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fontFamilyDisplay.extraBold,
          fontSize: emphasis ? fontSize.headingLg : fontSize.bodyLg,
          color: emphasis ? colors.goldDark : colors.textPrimary,
        }}
      >
        {amount}
      </Text>
    </View>
  );
}
