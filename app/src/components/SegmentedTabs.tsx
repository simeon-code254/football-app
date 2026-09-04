import { View, Text, Pressable, ScrollView } from 'react-native';
import { fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../theme';

// The filter row the canvas puts at the top of every list screen -- "ALL /
// SHORTLIST / PASSED" on club applicants, "ALL / TRIALS / TRANSFERS" on the
// news feed, "ALL / CONTACTED / NEW" on the scout shortlist.
//
// The selected tab is the filled navy pill from the canvas; the rest are bare.
//
// -- WHY IT SCROLLS --
//
// The canvas lays these out at a fixed 266px and they always fit. On a real
// device with a large OS text size they do not, and a filter the user cannot
// reach is worse than one they have to scroll to -- so the row scrolls
// horizontally rather than wrapping or truncating. With few short tabs it
// looks identical to the canvas.
export type SegmentedTab<T extends string> = { key: T; label: string; count?: number | null };

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4 }}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              borderRadius: 4,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              backgroundColor: active ? colors.primaryDark : colors.surfaceMuted,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyDisplay.extraBold,
                fontSize: fontSize.xs,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: active ? colors.gold : colors.textMuted,
              }}
              maxFontSizeMultiplier={1.4}
            >
              {tab.label}
              {/*
                A count of 0 is meaningful here ("no applicants yet") and must
                still render, so this checks for null rather than falsiness.
              */}
              {tab.count != null ? ` · ${tab.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
