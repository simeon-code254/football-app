import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamilyDisplay, fontSize, useThemeColors } from '../../src/theme';
import { UploadTabButton } from '../../src/components/UploadTabButton';
import { Logo } from '../../src/components/Logo';

// The tab bar from the design canvas: Home | Reels | Upload | Discover |
// Profile, with Upload raised into a navy tile rather than sitting flat as
// the third of five equal icons.
//
// The bar is 4px taller than before to give that tile room to sit above the
// line without being clipped.
export default function TabsLayout() {
  const colors = useThemeColors();
  const styles = {
    tabBar: {
      backgroundColor: colors.surface,
      borderTopColor: colors.track,
      height: 64,
      paddingBottom: 8,
      paddingTop: 6,
      // The raised tile is lifted out of the bar and must not be clipped by it.
      overflow: 'visible',
    },
    tabLabel: {
      // Canvas 10's nav labels are the .mono kicker: Barlow Condensed,
      // uppercase, letterspaced, 7px in a 266px frame. Sentence-case medium
      // was the one thing making the bar read as a stock tab bar rather than
      // this design's.
      fontFamily: fontFamilyDisplay.semiBold,
      fontSize: fontSize.caption,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: 2,
    },
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          // The Matobev mark, per the brand deck's usage map: "Tab bar (Home
          // icon) - logo-mask.png - Navy #1d2d3d - 16x16px". Canvas 10 draws a
          // house glyph, but the deck is explicit and it is the same mark the
          // scout and club bars already carry -- one Home icon across all three
          // roles rather than a house for one and the mark for the others. The
          // deck names navy, but that is the light-theme ground only, so the
          // mark takes the navigator's tint instead of a fixed colour.
          tabBarIcon: ({ color, size }) => <Logo tint={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{ title: 'Reels', tabBarIcon: ({ color, size }) => <Feather name="film" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          // Canvas 10 draws no label under the raised tile -- the other four
          // are labelled, this one is not. With a label the 44px tile and the
          // caption fought for the same 64px of bar and both were clipped.
          tabBarLabel: () => null,
          tabBarIcon: () => <UploadTabButton />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
