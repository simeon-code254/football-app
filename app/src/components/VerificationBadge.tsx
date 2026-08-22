import { View } from 'react-native';
import Svg, { Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';

// The hexagonal verification mark from the design canvas (.mv / .mv-in).
//
// The canvas draws it as two nested CSS clip-path hexagons: an outer one
// filled with a metallic gradient, and an inner one inset 1.5px filled with a
// dark tint of the same hue, carrying a role icon. React Native has no
// clip-path, so it is drawn here in SVG instead -- same polygon, same
// gradients, same 38x42 proportion.
//
// The inner hexagon is the outer polygon scaled about its centre rather than a
// true geometric inset. At the sizes this badge is ever drawn (16-48px) the
// difference is well under a pixel, and a real inset would need per-edge
// offset maths for no visible gain.
//
// -- WHAT IS ACTUALLY BACKED BY DATA --
//
// The canvas specifies three variants: club (gold), scout (blue), player
// (green). Only ONE of them currently means anything.
//
// scouts.verification_status is real: it is
// `check (verification_status in ('pending','verified','rejected'))`, it can
// only be moved by an admin (a trigger raises if a scout touches their own),
// and is_verified_scout() gates the RLS policies that expose player data. A
// scout badge is a claim the database can stand behind.
//
// There is no players.verified and no clubs table at all. So the player and
// club variants exist here because the component should be whole, but nothing
// renders them yet, and nothing should until there is a column behind them --
// a green "verified" hexagon on every player profile would be decoration
// presented as a check we never performed.
export type VerificationRole = 'club' | 'scout' | 'player';

// Outer polygon, matching the canvas clip-path percentages on a 100x100 box.
const HEX = '50,0 93,25 93,75 50,100 7,75 7,25';

// 1.5px inset on the canvas's 38px-wide badge.
const INNER_SCALE = 1 - 3 / 38;

const ROLES = {
  club: {
    gradient: ['#FFD873', '#FFC53D', '#C79216'] as const,
    fill: '#3C2A08',
    icon: 'home',
    iconColor: '#FFC53D',
    label: 'Verified club',
  },
  scout: {
    gradient: ['#8FBFEA', '#4F94D4', '#1D4E7A'] as const,
    fill: '#12233D',
    icon: 'search',
    iconColor: '#7FB0F0',
    label: 'Verified scout',
  },
  player: {
    gradient: ['#7FD8A4', '#1E8449', '#125F34'] as const,
    fill: '#0E3B22',
    icon: 'user',
    iconColor: '#FFC53D',
    label: 'Verified player',
  },
} as const;

export function VerificationBadge({
  role,
  size = 38,
  label,
}: {
  role: VerificationRole;
  /** Width in px; height follows the canvas 38:42 proportion. */
  size?: number;
  /** Overrides the spoken label, e.g. to name the verifying body. */
  label?: string;
}) {
  const r = ROLES[role];
  const height = size * (42 / 38);
  const iconSize = Math.round(size * (16 / 38));

  return (
    <View
      style={{ width: size, height, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? r.label}
    >
      <Svg width={size} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {/* 150deg in CSS runs top-left to bottom-right, leaning right. */}
          <LinearGradient id={`mv-${role}`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={r.gradient[0]} />
            <Stop offset="0.45" stopColor={r.gradient[1]} />
            <Stop offset="1" stopColor={r.gradient[2]} />
          </LinearGradient>
        </Defs>
        <Polygon points={HEX} fill={`url(#mv-${role})`} />
        <Polygon
          points={HEX}
          fill={r.fill}
          transform={`translate(${50 * (1 - INNER_SCALE)} ${50 * (1 - INNER_SCALE)}) scale(${INNER_SCALE})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Feather name={r.icon} size={iconSize} color={r.iconColor} />
      </View>
    </View>
  );
}
