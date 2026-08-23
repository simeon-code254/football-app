import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, useThemeColors } from '../../src/theme';

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
      borderTopColor: colors.border,
      height: 60,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs },
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
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
