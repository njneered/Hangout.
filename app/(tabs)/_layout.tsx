import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0f0a1f', borderTopColor: 'rgba(139,92,246,0.2)' },
        tabBarActiveTintColor: '#facc15',
        tabBarInactiveTintColor: '#a78bfa',   
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Tabs>
  );
}