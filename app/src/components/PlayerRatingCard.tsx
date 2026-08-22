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

// Confidence is marked, never hidden.
//
// The engine earns a confidence per attribute (ai-service confidence.py) and
// the database has always stored it -- player_attribute_scores.confidence is
// `not null check (confidence in ('High','Medium','Low'))`. Until now every
// layer above the database threw it away, so the card printed a bare number
// on what is visually a trophy.
//
// That matters because these values are on the 0-99 scale (the DB CHECK says
// so) -- the same scale a player already reads fluently from FIFA, where 99
// is world class. A "1" for pace in that grammar says a teenager cannot run.
// What it usually means is that the analysis could not see them move, which
// is a statement about our footage and our detector, not about the player.
//
// So a low-confidence value is shown at full honesty but visibly qualified:
// the number stays, rendered in the muted tone with a marker, and the card
// says plainly what the marker means. Nothing is suppressed -- a scout still
// sees every number the engine produced -- but nobody is told they are a 1
// out of 99 as though we were sure.
export type AttributeConfidence = "High" | "Medium" | "Low";

export type RatingAttribute = {
  key: string;
  displayName: string;
  value: number | null;
  confidence?: AttributeConfidence | null;
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

  // The overall is a flat average over whatever has been scored
  // (recalc_player_overall), so a single Low-confidence attribute drags the
  // headline number down just as hard as a confident one. If any contributing
  // attribute is Low, the headline inherits the qualification -- otherwise
  // the card would qualify "1 PAC" while presenting the 16 it produced as
  // settled fact.
  const anyLow = attributes.some(
    (a) => a.value != null && a.confidence === "Low",
  );

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
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>
              {rating != null ? Math.round(rating) : "–"}
            </Text>
            {anyLow && (
              // Spoken as part of the rating rather than left as a bare
              // glyph a screen reader would read as punctuation or skip.
              <Text
                style={styles.ratingMark}
                accessibilityLabel="based partly on low-confidence analysis"
              >
                ·
              </Text>
            )}
          </View>
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
          {rated.map((a) => {
            const low = a.confidence === "Low";
            return (
              <View
                key={a.key}
                style={styles.attr}
                // One label for the pair, so a screen reader says
                // "Pace 1, low confidence" instead of reading a loose
                // number and an abbreviation it cannot expand.
                accessible
                accessibilityLabel={`${a.displayName} ${a.value}${low ? ", low confidence" : ""}`}
              >
                <View style={styles.attrValueRow}>
                  <Text style={[styles.attrValue, low && styles.attrValueLow]}>
                    {a.value}
                  </Text>
                  {low && <Text style={styles.attrMark}>·</Text>}
                </View>
                <Text style={styles.attrKey}>
                  {a.displayName.slice(0, 3).toUpperCase()}
                </Text>
              </View>
            );
          })}
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

      {anyLow && (
        // The marker is meaningless without this, and the wording matters:
        // it says the footage was hard to read, not that the player scored
        // badly. Those are genuinely different claims and only one of them
        // is something we actually know.
        <Text style={styles.legend}>
          · Marked values were hard to measure in your footage — clearer video
          improves them
        </Text>
      )}
    </LinearGradient>
  );
}

// Contrast measured against the worst-case gradient stop of each palette:
// light gold 4.66:1, light ink 14.33:1, light muted 4.60:1; dark gold
// 10.89:1, dark name 15.37:1, dark muted 6.75:1. All pass AA.
// Retargeted to the Matobev canvas palette: navy ground, gold #FFC53D.
//
// NOTE: the canvas replaces this component's whole treatment. Its player home
// draws the rating as a white card carrying a circular gold progress ring,
// overlapping a navy header, rather than as a football card. That rebuild is
// screen work and is deliberately not done here -- this pass only retires the
// old cream/#FFD54F palette so the card does not clash with everything around
// it in the meantime.
//
// The card is navy in BOTH themes now. Gold is 10.93:1 on navy and 1.58:1 on
// white, so a light-ground version cannot carry the accent at all.
const PALETTE = {
  light: {
    ground: ["#123A6B", "#0A1B33"] as const,
    edge: ["#FFC53D", "rgba(255,197,61,0.15)"] as const,
    accent: "#FFC53D",
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.66)",
    hairline: "rgba(255,255,255,0.14)",
    chipBorder: "rgba(255,197,61,0.42)",
  },
  dark: {
    ground: ["#20293A", "#141A24"] as const, // pinned to elevation 'floating'
    edge: ["#FFC53D", "rgba(255,197,61,0.15)"] as const,
    accent: "#FFC53D",
    ink: "#F2F0EA",
    muted: "rgba(242,240,234,0.66)",
    hairline: "rgba(255,255,255,0.12)",
    chipBorder: "rgba(255,197,61,0.4)",
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
    // A fixed four-column grid rather than a flow. space-between pushed two
    // values to opposite edges of the card; a plain gap bunched them against
    // the left with dead space beside them. Fixed 25% columns mean an
    // attribute sits in the same place whether the engine has rated two of
    // them or all four, which is what makes it read as a card face instead
    // of a paragraph of numbers.
    attrRow: {
      flexDirection: "row",
      marginTop: spacing.md,
      paddingLeft: spacing.xs,
    },
    attr: { alignItems: "flex-start", width: "25%" },
    ratingRow: { flexDirection: "row", alignItems: "flex-start" },
    ratingMark: {
      fontFamily: fontFamily.extraBold,
      fontSize: 30,
      lineHeight: 34,
      color: c.muted,
      marginLeft: 3,
    },
    attrValueRow: { flexDirection: "row", alignItems: "flex-start" },
    // The number is never removed, only de-emphasised to the muted tone --
    // which is contrast-checked to AA in both palettes, so "qualified" never
    // means "hard to read".
    attrValueLow: { color: c.muted },
    attrMark: {
      fontFamily: fontFamily.extraBold,
      fontSize: fontSize.bodySm,
      color: c.muted,
      marginLeft: 1,
    },
    legend: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.caption,
      color: c.muted,
      textAlign: "center",
      marginTop: spacing.xs,
      lineHeight: 14,
      paddingHorizontal: spacing.sm,
    },
    attrValue: {
      fontFamily: fontFamily.extraBold,
      fontSize: fontSize.headingLg,
      color: c.ink,
    },
    attrKey: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.caption,
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
      fontSize: fontSize.caption,
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
