import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEME = {
  bg: '#0f0a1f',
  card: 'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',
  gold: '#facc15',
  purpleLight: '#c4b5fd',
  purpleMuted: '#a78bfa',
  purpleDim: 'rgba(139,92,246,0.15)',
  text: '#e8e4f3',
  textMuted: '#a78bfa',
  red: '#ef4444',
};

const SETTINGS_SECTIONS = [
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Edit Profile' },
      { label: 'Change Username' },
      { label: 'Notifications' },
      { label: 'Privacy' },
    ],
  },
  {
    label: 'APP',
    items: [
      { label: 'Appearance' },
      { label: 'Default View' },
      { label: 'Nudge Frequency', route: '/nudgeFrequency' },
      { label: 'Language' },
    ],
  },
  {
    label: 'INTEGRATIONS',
    items: [
      { label: 'Connect Spotify' },
      { label: 'Connect Apple Music' },
      { label: 'Calendar Sync' },
      { label: 'Contacts Access' },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { label: 'Help & FAQ' },
      { label: 'Send Feedback' },
      { label: 'Report a Bug' },
      { label: 'About Hangout' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  if (loading) return null;

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }
    // Use push instead of replace to avoid the type error with auth routes
    router.push('/nudgeFrequency' as any);
    // Actually navigate to login — cast to any to bypass strict route typing
    router.replace('/(auth)/login' as any);
  }

  function handleRowPress(route?: string) {
    if (route) router.push(route as any);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SETTINGS_SECTIONS.map(section => (
          <View key={section.label} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingsRow,
                    i < section.items.length - 1 && styles.settingsRowBorder,
                  ]}
                  activeOpacity={item.route ? 0.6 : 0.9}
                  onPress={() => handleRowPress(item.route)}
                >
                  <Text style={[
                    styles.settingsRowText,
                    !item.route && styles.settingsRowTextMuted,
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={[
                    styles.settingsRowArrow,
                    !item.route && styles.settingsRowArrowMuted,
                  ]}>
                    ›
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>
          Hangout v0.1.0 · Made by Stack Underflow: njneered · ok-Mook · ReyZix
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.12)',
  },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: THEME.text },
  backBtn:      { width: 60 },
  backBtnText:  { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },

  section:      { marginHorizontal: 20, marginTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: THEME.textMuted, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.1)',
  },
  settingsRowText:      { fontSize: 15, color: THEME.text, fontWeight: '500' },
  settingsRowTextMuted: { color: THEME.textMuted },
  settingsRowArrow:     { fontSize: 20, color: THEME.textMuted },
  settingsRowArrowMuted:{ opacity: 0.35 },

  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: THEME.red,
    fontWeight: '700',
    fontSize: 15,
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 32,
    marginBottom: 20,
  },
});
