/**
 * NOTE: Replace CURRENT_USER_ID with your real auth call once
 * auth is set up. For now it will show "No groups yet" until
 * a real user ID is provided.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

// ── SWAP THIS for your real auth call when ready ─────────────
// e.g. const { data: { user } } = await supabase.auth.getUser();
const CURRENT_USER_ID = 'YOUR_AUTH_USER_ID';
// ─────────────────────────────────────────────────────────────

const THEME = {
  bg: '#0f0a1f',
  card: 'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',
  gold: '#facc15',
  purpleLight: '#c4b5fd',
  purpleMuted: '#a78bfa',
  purpleDim: 'rgba(139,92,246,0.15)',
  purpleActive: 'rgba(139,92,246,0.35)',
  text: '#e8e4f3',
  textMuted: '#a78bfa',
};

const FREQUENCY_OPTIONS = [
  { label: 'Every 3 days',  value: 3  },
  { label: 'Every week',    value: 7  },
  { label: 'Every 2 weeks', value: 14 },
  { label: 'Every month',   value: 30 },
  { label: 'Never',         value: 0  },
];

type Group = { id: string; name: string };
type FrequencyMap = Record<string, number>;

export default function NudgeFrequencyScreen() {
  const router = useRouter();
  const [groups, setGroups]           = useState<Group[]>([]);
  const [frequencies, setFrequencies] = useState<FrequencyMap>({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // 1. Get group IDs this user belongs to
        const { data: memberRows, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', CURRENT_USER_ID);

        if (memberError) throw memberError;

        const groupIds = (memberRows ?? []).map((r: any) => r.group_id);

        if (groupIds.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        // 2. Fetch group names
        const { data: groupRows, error: groupError } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);

        if (groupError) throw groupError;

        const loadedGroups: Group[] = (groupRows ?? []).map((r: any) => ({
          id:   r.id,
          name: r.name,
        }));

        setGroups(loadedGroups);

        // 3. Fetch saved nudge preferences
        const { data: prefRows, error: prefError } = await supabase
          .from('user_nudge_preferences')
          .select('group_id, frequency_days')
          .eq('user_id', CURRENT_USER_ID)
          .in('group_id', groupIds);

        if (prefError) throw prefError;

        // Default all groups to 7 days, then overwrite with saved prefs
        const map: FrequencyMap = {};
        loadedGroups.forEach(g => { map[g.id] = 7; });
        (prefRows ?? []).forEach((r: any) => {
          map[r.group_id] = r.frequency_days;
        });

        setFrequencies(map);
      } catch (err: any) {
        Alert.alert('Error loading groups', err.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const rows = groups.map(g => ({
        user_id:        CURRENT_USER_ID,
        group_id:       g.id,
        frequency_days: frequencies[g.id] ?? 7,
        updated_at:     new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('user_nudge_preferences')
        .upsert(rows, { onConflict: 'user_id,group_id' });

      if (error) throw error;

      Alert.alert('Saved!', 'Your nudge preferences have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error saving', err.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function setFrequency(groupId: string, days: number) {
    setFrequencies(prev => ({ ...prev, [groupId]: days }));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nudge Frequency</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={THEME.purpleLight} size="large" />
          <Text style={styles.loadingText}>Loading your groups…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a group first, then come back to set nudge frequencies.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.explainerCard}>
            <Text style={styles.explainerText}>
              🔔 Choose how often Hangout reminds you to plan something with each group.
            </Text>
          </View>

          {groups.map(group => (
            <View key={group.id} style={styles.groupCard}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupSubtitle}>Remind me…</Text>

              <View style={styles.optionsRow}>
                {FREQUENCY_OPTIONS.map(opt => {
                  const isSelected = (frequencies[group.id] ?? 7) === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                      onPress={() => setFrequency(group.id, opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionChipText,
                        isSelected && styles.optionChipTextSelected,
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.selectionSummary}>
                {frequencies[group.id] === 0
                  ? '🔕 Nudges off for this group'
                  : `⏰ Nudge every ${frequencies[group.id]} day${frequencies[group.id] === 1 ? '' : 's'}`}
              </Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#0f0a1f" size="small" />
              : <Text style={styles.saveBtnText}>Save Preferences</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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

  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText:   { color: THEME.textMuted, marginTop: 12, fontSize: 14 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', lineHeight: 20 },

  explainerCard: {
    margin: 20, marginBottom: 8,
    backgroundColor: THEME.purpleDim,
    borderRadius: 12, borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 14,
  },
  explainerText: { fontSize: 13, color: THEME.purpleLight, lineHeight: 19 },

  groupCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 16, borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 16,
  },
  groupName:     { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 2 },
  groupSubtitle: { fontSize: 12, color: THEME.textMuted, marginBottom: 12 },

  optionsRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:             { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: THEME.cardBorder, backgroundColor: 'rgba(255,255,255,0.04)' },
  optionChipSelected:     { backgroundColor: THEME.purpleActive, borderColor: THEME.purpleMuted },
  optionChipText:         { fontSize: 13, color: THEME.textMuted, fontWeight: '500' },
  optionChipTextSelected: { color: THEME.purpleLight, fontWeight: '700' },

  selectionSummary: { marginTop: 12, fontSize: 12, color: THEME.purpleMuted, fontStyle: 'italic' },

  saveBtn:         { marginHorizontal: 20, marginTop: 28, backgroundColor: THEME.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontSize: 15, fontWeight: '800', color: '#0f0a1f' },
});
