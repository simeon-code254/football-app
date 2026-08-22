import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import {
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  kicker,
  radii,
  spacing,
  useThemeColors,
  useIsDark,
} from '../theme';
import type { RatingSnapshot } from '../repositories/communityRepository';

// Canvas screen 71: what the rating has done over the last few weeks.
//
// player_rating_snapshots has recorded this since 20260820120000 and nothing
// has ever displayed it. players.overall_rating is a single mutable column,
// so without this chart a player's own progress is invisible to them --
// which is awkward for an app whose entire ask is "keep improving".
//
// WHAT THIS DOES NOT DO
//
// It never draws a line across a week it has no rating for. A gap in the
// series is real information (no analysis ran), and bridging it would render
// a straight diagonal that looks exactly like steady week-on-week progress
// nobody actually made. Gaps break the line into separate segments instead.
//
// It also refuses to draw at all from a single point. One dot is not a
// history, and a chart drawn from one reading invites reading a trend into
// it. Below two points the component renders an honest "not enough history
// yet" instead.

const CHART_HEIGHT = 120;
const CHART_WIDTH = 320;
const PAD = 8;

export function RatingHistory({ snapshots }: { snapshots: RatingSnapshot[] }) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);

  const points = snapshots
    .map((s, i) => ({ i, value: s.overall_rating, week: s.week_start }))
    .filter((p): p is { i: number; value: number; week: string } => p.value != null);

  if (points.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Rating history</Text>
        <Text style={styles.empty}>
          {points.length === 0
            ? 'No history yet. Your rating is recorded once a week, starting the week after your first analysis.'
            : 'Only one week recorded so far. A second week is needed before there is a trend to show.'}
        </Text>
      </View>
    );
  }

  // Scaled to the data's own range rather than 0-99. Most players here move
  // within a few points, and against a full 0-99 axis a real 6-point gain
  // renders as a flat line -- which tells them their work did nothing.
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero; a 1-point span keeps it centred.
  const span = max - min || 1;

  const x = (i: number) =>
    PAD + (i / Math.max(snapshots.length - 1, 1)) * (CHART_WIDTH - PAD * 2);
  const y = (v: number) =>
    CHART_HEIGHT - PAD - ((v - min) / span) * (CHART_HEIGHT - PAD * 2);

  // Split into runs of consecutive weeks so a gap breaks the line.
  const segments: { i: number; value: number }[][] = [];
  for (const p of points) {
    const last = segments[segments.length - 1];
    if (last && last[last.length - 1].i === p.i - 1) last.push(p);
    else segments.push([p]);
  }

  const first = points[0].value;
  const latest = points[points.length - 1].value;
  const change = latest - first;
  const lineColor = isDark ? colors.gold : colors.goldDark;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Rating history</Text>
        <Text
          style={[
            styles.change,
            change > 0 ? styles.changeUp : change < 0 ? styles.changeDown : null,
          ]}
        >
          {change > 0 ? '+' : ''}
          {Math.round(change * 10) / 10} over {points.length} weeks
        </Text>
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rating history: ${points
          .map((p) => `${p.week}, ${Math.round(p.value)}`)
          .join('; ')}`}
      >
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <Line
            x1={PAD}
            y1={CHART_HEIGHT - PAD}
            x2={CHART_WIDTH - PAD}
            y2={CHART_HEIGHT - PAD}
            stroke={colors.divider}
            strokeWidth={1}
          />
          {segments.map((seg, si) =>
            seg.length > 1 ? (
              <Polyline
                key={si}
                points={seg.map((p) => `${x(p.i)},${y(p.value)}`).join(' ')}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null
          )}
          {points.map((p) => (
            <Circle
              key={p.i}
              cx={x(p.i)}
              cy={y(p.value)}
              r={p.i === points[points.length - 1].i ? 5 : 3}
              fill={lineColor}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axis}>{Math.round(min)}</Text>
        <Text style={styles.axis}>{Math.round(max)}</Text>
      </View>
      {/* The axis is the data's own range, not 0-99. Said out loud, because a
          chart that silently rescales is a chart that can be misread. */}
      <Text style={styles.note}>Scaled to your range, not the full 0–99 scale.</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    label: { ...kicker, fontSize: fontSize.caption, color: colors.textMuted },
    change: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted },
    changeUp: { color: colors.success },
    changeDown: { color: colors.error },
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    axis: { fontFamily: fontFamilyDisplay.semiBold, fontSize: fontSize.caption, color: colors.textMuted },
    note: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    empty: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: 19,
      color: colors.textMuted,
    },
  });
}
