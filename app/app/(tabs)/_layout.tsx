import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize } from '../../src/theme';

// Matches Matobev v4.dc.html's MAIN APP tab bar: Home | Reels | Upload |
// Discover | Profile.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="reels"
        options={{ title: 'Reels', tabBarIcon: ({ color, size }) => <Feather name="film" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="upload"
        options={{ title: 'Upload', tabBarIcon: ({ color, size }) => <Feather name="plus-square" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = {
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
  },
} as const;
