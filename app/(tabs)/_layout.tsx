import { useAuth } from '@/providers/AuthProvider';
import { Redirect, Tabs } from 'expo-router';

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="event" options={{ title: 'Event' }} />
    </Tabs>
  );
}