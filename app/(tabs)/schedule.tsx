import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: '#0d0d18', borderTopColor: '#1a1a2e' },
      tabBarActiveTintColor: '#ffc84a',
      tabBarInactiveTintColor: '#555',
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Tabs>
  );
}