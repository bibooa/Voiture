import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/components/GlassTabBar';

/** Bottom tab navigator using the custom floating glass tab bar. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="find" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
