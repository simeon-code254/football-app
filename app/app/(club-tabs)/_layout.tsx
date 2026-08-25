import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamilyDisplay, fontSize, useThemeColors } from '../../src/theme';
import { Logo } from '../../src/components/Logo';

// The club's bottom nav, from canvas screens 27/50: Home | Trials | Team |
// Messages | Profile.
//
// It differs from the scout's in one meaningful way -- Team replaces Players.
// A club does not search the player base itself; the scouts on its roster do
// (canvas 53 is a seat list, not a search screen). Giving a club a Players tab
// would suggest a capability the seat model deliberately routes through people.
export default function ClubTabsLayout() {
  const colors = useThemeColors();
  const styles = {
    tabBar: {
      backgroundColor: colors.surface,
      borderTopColor: colors.track,
      height: 60,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabLabel: {
      // Canvas 10's nav labels are the .mono kicker: Barlow Condensed,
      // uppercase, letterspaced. Sentence-case medium was the one thing making
      // the bar read as a stock tab bar rather than this design's.
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
          // Canvas 21/50 put the Matobev mark here rather than a house, and the
          // brand deck's usage map says the same: navy mark at 16px in the tab
          // bar. The player tab bar (canvas 10) genuinely does draw a house --
          // the two navs differ on purpose.
          tabBarIcon: ({ size }) => <Logo variant="navy" size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{ title: 'Trials', tabBarIcon: ({ color, size }) => <Feather name="clipboard" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'Team', tabBarIcon: ({ color, size }) => <Feather name="users" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <Feather name="message-circle" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
