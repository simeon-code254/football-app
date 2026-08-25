import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../theme';
import { Kicker } from './Kicker';

// Canvas screen 46 PLAYER PATH · POSITION.
//
// The canvas draws a pitch, not a dropdown:
//
//                 ST
//         LW     CAM      RW
//         LM      CM      RM
//                CDM
//     LB    CB        CB    RB
//                 GK
//              TAP YOUR POSITION
//
// -- WHY THE SHAPE MATTERS --
//
// A 16-year-old knows where they play by standing there, not by finding
// "CDM" in an alphabetical list. The pitch also makes the relationship between
// positions legible -- that CDM sits behind CM, that a right-back is on the
// right -- which a picker destroys. This is the screen most likely to be filled
// in wrongly by a tired list, and it feeds the rating: attribute weighting is
// position-dependent (attribute_position_weights), so a wrong position produces
// a wrong overall for as long as it stands.
//
// Rows are laid out top (attack) to bottom (goal), matching how the canvas
// draws it and how a player watching their own team would see the pitch.
const ROWS: string[][] = [
  ['ST'],
  ['LW', 'CAM', 'RW'],
  ['LM', 'CM', 'RM'],
  ['CDM'],
  ['LB', 'CB', 'RB'],
  ['GK'],
];

/** What each position is actually rated on, from the canvas's "RATED ON" line. */
const RATED_ON: Record<string, string> = {
  GK: 'REF · HAN · POS',
  CB: 'DEF · PHY · POS',
  LB: 'PAC · DEF · PHY',
  RB: 'PAC · DEF · PHY',
  CDM: 'DEF · PAS · POS',
  CM: 'PAS · VIS · PHY',
  CAM: 'PAS · VIS · DRI',
  LM: 'PAC · PAS · DRI',
  RM: 'PAC · PAS · DRI',
  LW: 'PAC · DRI · SHO',
  RW: 'PAC · DRI · SHO',
  ST: 'SHO · PAC · PHY',
};

const FULL_NAME: Record<string, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre-back',
  LB: 'Left-back',
  RB: 'Right-back',
  CDM: 'Defensive midfield',
  CM: 'Centre midfield',
  CAM: 'Attacking midfield',
  LM: 'Left midfield',
  RM: 'Right midfield',
  LW: 'Left wing',
  RW: 'Right wing',
  ST: 'Striker',
};

export function PositionPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (position: string) => void;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View>
      <View style={styles.pitch}>
        {/* The halfway line, so the shape reads as a pitch rather than a grid. */}
        <View style={styles.halfway} pointerEvents="none" />
        {ROWS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((pos) => {
              const active = pos === value;
              return (
                <Pressable
                  key={pos}
                  onPress={() => onChange(pos)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={FULL_NAME[pos] ?? pos}
                  style={[styles.spot, active && styles.spotOn]}
                >
                  <Text style={[styles.spotText, active && styles.spotTextOn]}>{pos}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Kicker size={fontSize.caption} tone="onNavy" style={styles.hint}>
          Tap your position
        </Kicker>
      </View>

      <View style={styles.selected}>
        <View style={{ flex: 1 }}>
          <Kicker size={fontSize.caption}>Selected</Kicker>
          <Text style={styles.selectedName}>
            {value ? FULL_NAME[value] ?? value : 'Nothing yet'}
          </Text>
        </View>
        {!!value && (
          <View style={{ alignItems: 'flex-end' }}>
            <Kicker size={fontSize.caption}>Rated on</Kicker>
            <Text style={styles.ratedOn}>{RATED_ON[value] ?? '—'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    pitch: {
      backgroundColor: colors.primaryDark,
      borderRadius: radii.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      overflow: 'hidden',
    },
    halfway: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      backgroundColor: 'rgba(127,176,240,0.18)',
    },
    row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
    spot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    spotOn: { backgroundColor: colors.gold },
    spotText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.sm,
      color: colors.accentOnNavy,
    },
    spotTextOn: { color: colors.primaryDark },
    hint: { textAlign: 'center', marginTop: spacing.sm },
    selected: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    selectedName: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
      marginTop: 2,
    },
    ratedOn: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodySm,
      color: colors.goldDark,
      marginTop: 2,
    },
  });
}
