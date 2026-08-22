import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, useThemeColors } from '../../src/theme';
import { UploadTabButton } from '../../src/components/UploadTabButton';

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
      borderTopColor: colors.border,
      height: 64,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
    },
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
        name="reels"
        options={{ title: 'Reels', tabBarIcon: ({ color, size }) => <Feather name="film" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: () => <UploadTabButton />,
        }}
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
