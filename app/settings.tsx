/**
 * app/settings.tsx — with theme toggle wired in
 */
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/themeprovider';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

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
      { label: 'Appearance', isThemeToggle: true },   // ← theme toggle row
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
      { label: 'Calendar Sync', route: '/calendarSync' },
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
  const { theme, isDark, toggleTheme } = useTheme();

  if (loading) return null;

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) { Alert.alert('Logout failed', error.message); return; }
    router.replace('/(auth)/login' as any);
  }

  function handleRowPress(route?: string) {
    if (route) router.push(route as any);
  }

  // Dynamic styles based on current theme
  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {SETTINGS_SECTIONS.map(section => (
          <View key={section.label} style={s.section}>
            <Text style={s.sectionLabel}>{section.label}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  {item.isThemeToggle ? (
                    // ── Theme toggle row ──
                    <View style={[s.settingsRow, i < section.items.length - 1 && s.settingsRowBorder]}>
                      <View>
                        <Text style={s.settingsRowText}>Appearance</Text>
                        <Text style={s.settingsRowSub}>{isDark ? '🌙 Dark mode' : '☀️ Light mode'}</Text>
                      </View>
                      <Switch
                        value={!isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: theme.purpleDim, true: theme.goldDim }}
                        thumbColor={isDark ? theme.purpleLight : theme.gold}
                        ios_backgroundColor={theme.purpleDim}
                      />
                    </View>
                  ) : (
                    // ── Regular row ──
                    <TouchableOpacity
                      style={[s.settingsRow, i < section.items.length - 1 && s.settingsRowBorder]}
                      activeOpacity={(item as any).route ? 0.6 : 0.9}
                      onPress={() => handleRowPress((item as any).route)}
                    >
                      <Text style={[s.settingsRowText, !(item as any).route && s.settingsRowTextMuted]}>
                        {item.label}
                      </Text>
                      <Text style={[s.settingsRowArrow, !(item as any).route && s.settingsRowArrowMuted]}>›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={s.version}>
          Hangout v0.1.0 · Made by Stack Underflow: njneered · ok-Mook · ReyZix
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof import('@/providers/themeprovider').useTheme>['theme']) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: theme.bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingHorizontal: 20, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: theme.cardBorder,
    },
    headerTitle:  { fontSize: 17, fontWeight: '700', color: theme.text },
    backBtn:      { width: 60 },
    backBtnText:  { fontSize: 14, fontWeight: '600', color: theme.purpleLight },

    section:      { marginHorizontal: 20, marginTop: 24 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.textMuted, marginBottom: 8 },
    sectionCard: {
      backgroundColor: theme.card, borderRadius: 14,
      borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden',
    },
    settingsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    settingsRowBorder:     { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    settingsRowText:       { fontSize: 15, color: theme.text, fontWeight: '500' },
    settingsRowTextMuted:  { color: theme.textMuted },
    settingsRowSub:        { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    settingsRowArrow:      { fontSize: 20, color: theme.textMuted },
    settingsRowArrowMuted: { opacity: 0.35 },

    logoutBtn: {
      marginHorizontal: 20, marginTop: 28,
      backgroundColor: theme.redDim, borderWidth: 1,
      borderColor: `${theme.red}44`, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center',
    },
    logoutText: { color: theme.red, fontWeight: '700', fontSize: 15 },

    version: {
      textAlign: 'center', fontSize: 12,
      color: theme.textMuted, marginTop: 32, marginBottom: 20,
    },
  });
}