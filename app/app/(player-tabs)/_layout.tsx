import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
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
      borderTopColor: '#EDE8D9',
      borderTopWidth: 1,
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

  const TabIcon = ({ focused, children }: { focused: boolean; children: React.ReactNode }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {children}
      {focused && (
        <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold }} />
      )}
    </View>
  );

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
          tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Logo tint={color} size={size - 2} /></TabIcon>,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{ title: 'Reels', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Feather name="film" color={color} size={size} /></TabIcon> }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <UploadTabButton />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Search', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Feather name="search" color={color} size={size} /></TabIcon> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size, focused }) => <TabIcon focused={focused}><Feather name="user" color={color} size={size} /></TabIcon> }}
      />
    </Tabs>
  );
}
