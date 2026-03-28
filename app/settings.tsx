/**
 * settings.tsx
 * ─────────────────────────────────────────────────────────────
 * Updated from stub → "Nudge Frequency" now navigates to the
 * real nudgeFrequencyScreen. All other rows remain stubs
 * (ready to wire up later).
 *
 * SETUP REQUIRED:
 *   1. Add nudgeFrequency to your Expo Router file structure:
 *      app/nudgeFrequency.tsx  ← place nudgeFrequencyScreen.tsx here
 *   2. Declare the route in your root app/_layout.tsx stack:
 *      <Stack.Screen name="nudgeFrequency" options={{ headerShown: false }} />
 * ─────────────────────────────────────────────────────────────
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

// Items with a real destination get a `route` key.
// Items still stubbed have no `route` — tapping them is a no-op for now.
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
      { label: 'Nudge Frequency', route: '/nudgeFrequency' }, // ✅ WIRED
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

  function handleRowPress(route?: string) {
    if (route) router.push(route as any);
    // Stubbed rows do nothing — add their routes above when ready
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
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
                  <Text
                    style={[
                      styles.settingsRowText,
                      !item.route && styles.settingsRowTextMuted,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.settingsRowArrow,
                      !item.route && styles.settingsRowArrowMuted,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

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

    settingsRowArrowMuted:{ opacity: 0.35 }, 
    version: {
      textAlign: 'center',
      fontSize: 12,
      color: THEME.textMuted,
      marginTop: 32,
      marginBottom: 20,
    },
  

  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.1)',
  },
  settingsRowText:      { fontSize: 15, color: THEME.text, fontWeight: '500' },
  settingsRowTextMuted: { color: THEME.textMuted },                  
  settingsRowArrow:     { fontSize: 20, color: THEME.textMuted },
                            
});

