import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import {
  fontFamily,
  fontSize,
  radii,
  spacing,
  elevation,
  useIsDark,
} from "../theme";

// The player's rating, as a card in the visual language these users already
// speak fluently.
//
// The previous version was a blue panel with the number in the corner --
// competent, but it could have belonged to any app. This borrows the
// grammar of a football card instead: rating top-left at display size,
// position beneath it, country to the right, the name set in caps across a
// rule, and the attribute pairs along the bottom.
//
// It follows the theme. The first version was dark in BOTH themes, on the
// reasoning that "a football card is a dark object with metallic edges".
// That was wrong twice over. The iconic gold card is a *warm, light*
// metallic, so darkness was never what made it a card -- the gold edge, the
// display-size rating, the caps name across rules and the attribute pairs
// carry that language on any ground. And a single dark object in a light
// app reads as an ad or a rendering bug, not as a hero.
//
// The dark version was also actively broken against this app's own
// elevation rule (see theme/elevation.ts: depth in the dark is a LIGHTER
// surface). Its bottom gradient stop sat at luminance 0.0061 against an app
// background of 0.0079 -- the hero element was sinking into the page
// instead of lifting off it. The dark palette below is pinned to the
// 'floating' level so it genuinely rises.
//
// Both palettes are contrast-checked against their own darkest/lightest
// gradient stop, not against a convenient midpoint.
//
// Deliberately NOT tiered gold/silver/bronze. That is the obvious next step
// from FIFA, and it would be wrong here: the engine currently produces low
// provisional numbers for everyone, so tiering would hand most young
// players a "bronze" verdict on work the analysis cannot yet judge
// properly. One treatment for everyone until the ratings are worth ranking.

// Emoji flags were the first instinct here and were wrong: regional
// indicator pairs do not render at all on Windows Chrome and are patchy on
// older Android, so a Kenyan player saw the letters "KE" where a flag
// should be. A typeset country code is legible on every platform and reads
// as a deliberate card element rather than a failed glyph.

export type RatingAttribute = {
  key: string;
  displayName: string;
  value: number | null;
};

export function PlayerRatingCard({
  name,
  rating,
  position,
  countryCode,
  attributes,
  assessedCount,
  totalCount,
  onPressReport,
}: {
  name: string;
  rating: number | null;
  position?: string | null;
  countryCode?: string | null;
  attributes: RatingAttribute[];
  assessedCount: number;
  totalCount: number;
  onPressReport: () => void;
}) {
  const isDark = useIsDark();
  const c = isDark ? PALETTE.dark : PALETTE.light;
  const styles = isDark ? DARK_STYLES : LIGHT_STYLES;
  const rated = attributes.filter((a) => a.value != null).slice(0, 4);
  const provisional = assessedCount > 0 && assessedCount < totalCount;

  return (
    <LinearGradient
      colors={c.ground}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.card, elevation("floating", isDark)]}
    >
      {/* The metallic edge is what separates a card from a rectangle. */}
      <LinearGradient
        colors={c.edge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.edge}
      />

      <View style={styles.topRow}>
        <View>
          <Text style={styles.rating}>
            {rating != null ? Math.round(rating) : "–"}
          </Text>
          {!!position && <Text style={styles.position}>{position}</Text>}
        </View>

        <View style={styles.topRight}>
          {!!countryCode && (
            <View style={styles.countryChip}>
              <Text style={styles.countryText}>
                {countryCode.toUpperCase()}
              </Text>
            </View>
          )}
          <Pressable
            onPress={onPressReport}
            style={styles.reportBtn}
            accessibilityRole="button"
            accessibilityLabel="View full rating report"
          >
            <Text style={styles.reportText}>Report</Text>
            <Feather name="arrow-up-right" size={13} color={c.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.rule} />
      <Text style={styles.name} numberOfLines={1}>
        {name.toUpperCase()}
      </Text>
      <View style={styles.rule} />

      {rated.length > 0 ? (
        <View style={styles.attrRow}>
          {rated.map((a) => (
            <View key={a.key} style={styles.attr}>
              <Text style={styles.attrValue}>{a.value}</Text>
              <Text style={styles.attrKey}>
                {a.displayName.slice(0, 3).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.pending}>
          Upload a highlight to get your first rating
        </Text>
      )}

      {provisional && (
        // Kept even in a card that is meant to feel aspirational. A number
        // a scout later finds hollow costs more than the swagger gains.
        <Text style={styles.provisional}>
          Provisional · {assessedCount} of {totalCount} attributes rated
        </Text>
      )}
    </LinearGradient>
  );
}

// Contrast measured against the worst-case gradient stop of each palette:
// light gold 4.66:1, light ink 14.33:1, light muted 4.60:1; dark gold
// 10.89:1, dark name 15.37:1, dark muted 6.75:1. All pass AA.
const PALETTE = {
  light: {
    ground: ["#FFFBF0", "#EFE3CB"] as const, // warm card stock
    edge: ["#B8860B", "rgba(184,134,11,0.15)"] as const,
    accent: "#8A5A00", // deep gold -- #FFD54F is 1.23:1 on this ground
    ink: "#1C1408",
    muted: "rgba(0,0,0,0.62)",
    hairline: "rgba(0,0,0,0.14)",
    chipBorder: "rgba(138,90,0,0.45)",
  },
  dark: {
    ground: ["#2A3A5C", "#1B2537"] as const, // pinned to elevation 'floating'
    edge: ["#FFD54F", "rgba(255,213,79,0.15)"] as const,
    accent: "#FFD54F",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.62)",
    hairline: "rgba(255,255,255,0.12)",
    chipBorder: "rgba(255,213,79,0.4)",
  },
} as const;

type Palette = (typeof PALETTE)["light" | "dark"];

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      overflow: "hidden",
    },
    edge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    rating: {
      fontFamily: fontFamily.extraBold,
      fontSize: 52,
      lineHeight: 54,
      color: c.accent,
      letterSpacing: -2.5,
    },
    position: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.body,
      color: c.ink,
      letterSpacing: 2,
      marginTop: 2,
    },
    topRight: { alignItems: "flex-end", gap: spacing.md },
    countryChip: {
      borderWidth: 1,
      borderColor: c.chipBorder,
      borderRadius: radii.sm,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    countryText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.accent,
      letterSpacing: 1.5,
    },
    reportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: c.chipBorder,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    reportText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.accent,
    },
    rule: {
      height: 1,
      backgroundColor: c.hairline,
      marginVertical: spacing.sm,
    },
    name: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.bodyLg,
      color: c.ink,
      letterSpacing: 2.5,
      textAlign: "center",
    },
    // Left-aligned with a fixed gap: space-between pushed two values to
    // opposite edges of the card, which looked like a layout error rather
    // than a design.
    attrRow: {
      flexDirection: "row",
      gap: spacing.huge,
      marginTop: spacing.md,
      paddingLeft: spacing.xs,
    },
    attr: { alignItems: "flex-start" },
    attrValue: {
      fontFamily: fontFamily.extraBold,
      fontSize: fontSize.headingLg,
      color: c.ink,
    },
    attrKey: {
      fontFamily: fontFamily.semiBold,
      fontSize: 10,
      color: c.muted,
      letterSpacing: 1.2,
      marginTop: 2,
    },
    pending: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: c.muted,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    provisional: {
      fontFamily: fontFamily.medium,
      fontSize: 10,
      color: c.muted,
      textAlign: "center",
      marginTop: spacing.md,
      letterSpacing: 0.4,
    },
  });
}

// Both palettes are known at module load -- the card branches on a boolean,
// not on runtime theme colours -- so the sheets are built once here rather
// than re-running StyleSheet.create on every render.
const LIGHT_STYLES = makeStyles(PALETTE.light);
const DARK_STYLES = makeStyles(PALETTE.dark);
