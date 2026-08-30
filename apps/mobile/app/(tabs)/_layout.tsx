import Tabs from 'expo-router/js-tabs';

import { TabGlyph } from '../../components/TabGlyph';
import { colors, navigation, typography } from '../../components/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.ink },
        tabBarActiveTintColor: colors.acid,
        tabBarAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: {
          paddingTop: navigation.tabBarPaddingTop,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          ...typography.utility,
          fontSize: 10,
          letterSpacing: 1.2,
          lineHeight: 13,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Home tab',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} name="home" />
          ),
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          tabBarAccessibilityLabel: 'Camera tab',
          tabBarButtonTestID: 'tab-camera',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} name="camera" />
          ),
          title: 'Camera',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarAccessibilityLabel: 'Chat tab',
          tabBarButtonTestID: 'tab-chat',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} name="chat" />
          ),
          title: 'Chat',
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          tabBarAccessibilityLabel: 'Archive tab',
          tabBarButtonTestID: 'tab-archive',
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph color={color} focused={focused} name="archive" />
          ),
          title: 'Archive',
        }}
      />
    </Tabs>
  );
}
