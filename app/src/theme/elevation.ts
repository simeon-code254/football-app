import { Platform, type ViewStyle } from 'react-native';

// Elevation language.
//
// Every card in this app was a flat surface with a 1px border, so nothing
// read as lifted, tappable, or more important than anything beside it. That
// flatness is most of why the UI feels unfinished: hierarchy was being
// carried entirely by size and colour, with no depth axis at all.
//
// Shadows are close to invisible on a dark background, so dark mode conveys
// the same hierarchy a different way -- a progressively lighter surface,
// which is how depth actually reads in the dark. Same API either way, so
// screens never branch on theme.
//
// Three levels only. More than that and the hierarchy stops meaning
// anything:
//   raised  - a card sitting on the page (quick actions, list cards)
//   floating - something that should feel detachable (the hero rating card)
//   overlay - modals and sheets
export type ElevationLevel = 'raised' | 'floating' | 'overlay';

const LIGHT: Record<ElevationLevel, ViewStyle> = {
  raised: Platform.select({
    ios: { shadowColor: '#2A2418', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 2 },
    default: { boxShadow: '0 2px 8px rgba(42,36,24,0.06)' } as ViewStyle,
  })!,
  floating: Platform.select({
    ios: { shadowColor: '#2A2418', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 8 },
    default: { boxShadow: '0 8px 20px rgba(42,36,24,0.14)' } as ViewStyle,
  })!,
  overlay: Platform.select({
    ios: { shadowColor: '#2A2418', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 16 },
    default: { boxShadow: '0 12px 28px rgba(42,36,24,0.22)' } as ViewStyle,
  })!,
};

// In dark mode a drop shadow lands on an already-dark ground and does
// nothing. Lifting the surface itself is what reads as elevation, so each
// level steps the background lighter and adds a hairline to catch the edge.
const DARK: Record<ElevationLevel, ViewStyle> = {
  raised: { backgroundColor: '#1A2130', borderWidth: 1, borderColor: '#2A3340' },
  floating: { backgroundColor: '#20293A', borderWidth: 1, borderColor: '#334052' },
  overlay: { backgroundColor: '#283346', borderWidth: 1, borderColor: '#3D4B60' },
};

export function elevation(level: ElevationLevel, isDark: boolean): ViewStyle {
  return isDark ? DARK[level] : LIGHT[level];
}
