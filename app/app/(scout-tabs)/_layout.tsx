import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamilyDisplay, fontSize, useThemeColors } from '../../src/theme';
import { Logo } from '../../src/components/Logo';

// Scout gets a different tab set from Player — Players/Trials/Messages
// instead of Reels/Upload/Discover — per the Scout Dashboard spec's bottom
// nav (Home | Players | Trials | Messages | Profile).
export default function ScoutTabsLayout() {
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
          // Canvas 21/50 put the Matobev mark here rather than a house, and the
          // brand deck's usage map says the same: the mark at 16px in the tab
          // bar. It takes the navigator's tint, so it dims and lights with its
          // siblings and stays legible on both themes' tab bars.
          tabBarIcon: ({ color, size }) => <Logo tint={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{ title: 'Players', tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="trials"
        options={{ title: 'Trials', tabBarIcon: ({ color, size }) => <Feather name="clipboard" color={color} size={size} /> }}
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
