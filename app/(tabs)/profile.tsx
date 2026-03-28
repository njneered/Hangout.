import HangoutHeader from '@/components/HangoutHeader';
import { FRIENDS } from '@/constants/mockData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const THEME = {
  bg: '#0f0a1f',
  card: 'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',
  gold: '#facc15',
  purple: '#8b5cf6',
  purpleLight: '#c4b5fd',
  purpleMuted: '#a78bfa',
  purpleDim: 'rgba(139,92,246,0.15)',
  green: '#10b981',
  text: '#e8e4f3',
  textMuted: '#a78bfa',
};

// ── Shared helpers (also used by index.tsx) ───────────────────────────────────
export function avatarColor(str: string) {
  const palette = [THEME.purple, THEME.gold, THEME.green, '#ef4444', '#3b82f6', '#f97316', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function getInitials(name: string) {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  const col = avatarColor(name);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: col + '33', borderWidth: 1.5, borderColor: col + '77',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: col, fontSize: size * 0.36, fontWeight: '800' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ── Mock recent hangouts (TODO backend: replace with Supabase events query) ───
const RECENT_HANGOUTS = [
  { emoji: '🎮', name: 'Game Night',   with: ['Sandy', 'Josh', 'Brittany'], when: '2 weeks ago' },
  { emoji: '🍕', name: 'Pizza Friday', with: ['Josh', 'Lorenzo'],           when: '1 month ago' },
  { emoji: '🎬', name: 'Movie Night',  with: ['Brittany'],                  when: '6 weeks ago' },
];

interface UserProfile { username: string; email: string; }

// ── Friends Modal ─────────────────────────────────────────────────────────────
function FriendsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [query, setQuery]             = useState('');
  const [searchResult, setSearchResult] = useState<string | null | undefined>(undefined);
  const [searching, setSearching]     = useState(false);
  const [addedFriends, setAddedFriends] = useState<string[]>([]);

  // TODO (backend): replace this stub with a real Supabase query:
  // supabase.from('users').select('username').eq('username', query).single()
  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    await new Promise(r => setTimeout(r, 700));
    // Stub: returns a fake user only when query starts with "@"
    setSearchResult(query.startsWith('@') ? query.replace('@', '') : null);
    setSearching(false);
  }

  function handleAdd(username: string) {
    // TODO (backend): insert row into friends table for current user + found user
    setAddedFriends(prev => [...prev, username]);
    Alert.alert('Friend request sent!', `Request sent to @${username}`);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ms.container}>
        {/* Header */}
        <View style={ms.header}>
          <Text style={ms.title}>Friends</Text>
          <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
            <Text style={ms.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={ms.searchSection}>
          <Text style={ms.sectionLabel}>ADD A FRIEND</Text>
          <View style={ms.searchRow}>
            <View style={ms.searchInputWrap}>
              <Text style={ms.atSign}>@</Text>
              <TextInput
                style={ms.searchInput}
                placeholder="search by username"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={query}
                onChangeText={t => { setQuery(t); setSearchResult(undefined); }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity style={ms.searchBtn} onPress={handleSearch} disabled={searching}>
              {searching
                ? <ActivityIndicator size="small" color="#1a1333" />
                : <Text style={ms.searchBtnText}>Search</Text>
              }
            </TouchableOpacity>
          </View>

          {searchResult !== undefined && (
            <View style={ms.resultWrap}>
              {searchResult ? (
                <View style={ms.resultRow}>
                  <AvatarCircle name={searchResult} size={38} />
                  <Text style={ms.resultName}>@{searchResult}</Text>
                  <TouchableOpacity
                    style={[ms.addBtn, addedFriends.includes(searchResult) && ms.addBtnSent]}
                    onPress={() => handleAdd(searchResult!)}
                    disabled={addedFriends.includes(searchResult)}
                  >
                    <Text style={ms.addBtnText}>{addedFriends.includes(searchResult) ? 'Sent ✓' : '+ Add'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={ms.noResult}>No user found for "@{query}"</Text>
              )}
            </View>
          )}
        </View>

        {/* Friends list */}
        <Text style={ms.friendsLabel}>YOUR FRIENDS</Text>
        <FlatList
          data={FRIENDS}
          keyExtractor={f => f.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item: f }) => (
            <View style={ms.friendRow}>
              <AvatarCircle name={f.name} size={44} />
              <View style={ms.friendInfo}>
                <Text style={ms.friendName}>{f.name}</Text>
                <Text style={ms.friendSub}>{f.activity}</Text>
              </View>
              <View style={[ms.badge, f.overdue ? ms.badgeRed : ms.badgeGold]}>
                <Text style={ms.badgeNum}>{f.lastHangout}</Text>
                <Text style={ms.badgeLbl}>days</Text>
              </View>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  container:  { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)',
  },
  title:        { fontSize: 22, fontWeight: '800', color: THEME.text },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 18, color: THEME.textMuted },

  searchSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.1)' },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 10 },
  searchRow:     { flexDirection: 'row', gap: 8 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  atSign:        { fontSize: 14, color: THEME.textMuted, fontWeight: '700', marginRight: 4 },
  searchInput:   { flex: 1, fontSize: 14, color: THEME.text },
  searchBtn: {
    backgroundColor: THEME.gold, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center',
  },
  searchBtnText: { color: '#1a1333', fontWeight: '800', fontSize: 13 },

  resultWrap:  { marginTop: 12 },
  resultRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultName:  { flex: 1, fontSize: 14, fontWeight: '600', color: THEME.text },
  addBtn: {
    backgroundColor: THEME.purpleDim, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  addBtnSent:    { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.35)' },
  addBtnText:    { fontSize: 13, fontWeight: '700', color: THEME.purpleLight },
  noResult:      { fontSize: 13, color: THEME.textMuted, fontStyle: 'italic', marginTop: 4 },

  friendsLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    color: THEME.purpleMuted, marginHorizontal: 20, marginTop: 20, marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.card, borderRadius: 14,
    borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 12, marginBottom: 8,
  },
  friendInfo:  { flex: 1 },
  friendName:  { fontSize: 14, fontWeight: '600', color: THEME.text },
  friendSub:   { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  badge:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48, borderWidth: 1 },
  badgeGold:   { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.25)' },
  badgeRed:    { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  badgeNum:    { fontSize: 15, fontWeight: '800', color: THEME.text },
  badgeLbl:    { fontSize: 9, color: THEME.textMuted, marginTop: 1, fontWeight: '600' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [friendsVisible, setFriendsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users').select('username, email').eq('id', user.id).single();
      if (!error && data && active) {
        setProfile({ username: data.username ?? '', email: data.email ?? user.email ?? '' });
        setDraftUsername(data.username ?? '');
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  async function handleSave() {
    if (!user || !profile) return;
    if (!draftUsername.trim()) { Alert.alert('Username required', 'Username cannot be empty.'); return; }
    setSaving(true);
    const { error } = await supabase.from('users').update({ username: draftUsername.trim() }).eq('id', user.id);
    setSaving(false);
    if (error) { Alert.alert('Save failed', error.message); return; }
    setProfile(prev => prev ? { ...prev, username: draftUsername.trim() } : prev);
    setEditMode(false);
  }

  const displayName = profile?.username || user?.email || '?';
  const avatarCol   = avatarColor(displayName);
  const initials    = getInitials(displayName);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={THEME.gold} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <HangoutHeader />
      <FriendsModal visible={friendsVisible} onClose={() => setFriendsVisible(false)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={[s.glowRing, { shadowColor: avatarCol }]} />
          <View style={[s.avatar, { backgroundColor: avatarCol + '33', borderColor: avatarCol + '88' }]}>
            <Text style={[s.avatarText, { color: avatarCol }]}>{initials}</Text>
          </View>

          {editMode ? (
            <View style={s.editGroup}>
              {/* Account card visible only in edit mode */}
              <View style={s.accountCard}>
                <View style={s.infoRow}>
                  <Text style={s.infoKey}>Email</Text>
                  <Text style={s.infoVal} numberOfLines={1}>{profile?.email || user?.email || '—'}</Text>
                </View>
                <View style={[s.infoRow, s.infoRowBorder]}>
                  <Text style={s.infoKey}>Username</Text>
                  <View style={s.usernameField}>
                    <Text style={s.atSign}>@</Text>
                    <TextInput
                      style={s.usernameInput}
                      value={draftUsername}
                      onChangeText={setDraftUsername}
                      placeholder="username"
                      placeholderTextColor={THEME.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setDraftUsername(profile?.username ?? ''); setEditMode(false); }}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#1a1333" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.nameGroup}>
              <Text style={s.displayName}>@{profile?.username || '—'}</Text>
              <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
                <Text style={s.editBtnText}>✏️  Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Stats (Friends tappable) ── */}
        <View style={s.statsRow}>
          <TouchableOpacity style={s.statBlock} onPress={() => setFriendsVisible(true)} activeOpacity={0.7}>
            <Text style={s.statNum}>{FRIENDS.length}</Text>
            <Text style={[s.statLabel, { color: THEME.purpleLight }]}>Friends ›</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            {/* TODO (backend): replace with real events count from Supabase */}
            <Text style={s.statNum}>7</Text>
            <Text style={s.statLabel}>Hangouts</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statNum}>{Math.max(...FRIENDS.map(f => f.lastHangout))}</Text>
            <Text style={s.statLabel}>Days since</Text>
          </View>
        </View>

        {/* ── Recent hangouts ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>RECENT HANGOUTS</Text>
          {RECENT_HANGOUTS.map((h, i) => (
            <View key={i} style={s.hangoutCard}>
              <Text style={s.hangoutEmoji}>{h.emoji}</Text>
              <View style={s.hangoutInfo}>
                <Text style={s.hangoutName}>{h.name}</Text>
                <View style={s.avatarRow}>
                  {h.with.map(name => <AvatarCircle key={name} name={name} size={20} />)}
                  <Text style={s.hangoutWith}>{h.with.join(', ')}</Text>
                </View>
              </View>
              <Text style={s.hangoutWhen}>{h.when}</Text>
            </View>
          ))}
          {/* TODO (backend): replace RECENT_HANGOUTS with Supabase events query */}
          <Text style={s.comingSoon}>Full history coming soon</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' },
  container:        { flex: 1, backgroundColor: THEME.bg },
  scroll:           { flex: 1 },
  scrollContent:    { paddingBottom: 60 },

  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24 },
  glowRing: {
    position: 'absolute', top: 22, width: 100, height: 100, borderRadius: 50,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 28, elevation: 0,
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  nameGroup:   { alignItems: 'center', gap: 6 },
  displayName: { fontSize: 26, fontWeight: '800', color: THEME.text, letterSpacing: -0.5 },
  editBtn: {
    marginTop: 2, backgroundColor: THEME.purpleDim, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: THEME.purpleLight },

  editGroup: { alignItems: 'center', width: '100%', gap: 12 },
  accountCard: {
    width: '100%', backgroundColor: THEME.card,
    borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,0.1)' },
  infoKey:       { fontSize: 13, color: THEME.textMuted, fontWeight: '500' },
  infoVal:       { fontSize: 13, color: THEME.text, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  usernameField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  atSign:        { fontSize: 13, color: THEME.textMuted, fontWeight: '700', marginRight: 3 },
  usernameInput: { fontSize: 13, color: THEME.text, fontWeight: '500', minWidth: 80 },

  editActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, backgroundColor: THEME.purpleDim, borderRadius: 12, paddingVertical: 11,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  cancelBtnText: { color: THEME.purpleLight, fontWeight: '600', fontSize: 14 },
  saveBtn:       { flex: 1, backgroundColor: THEME.gold, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  saveBtnText:   { color: '#1a1333', fontWeight: '800', fontSize: 14 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 24,
    backgroundColor: THEME.card, borderRadius: 16,
    borderWidth: 1, borderColor: THEME.cardBorder, paddingVertical: 16,
  },
  statBlock:   { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 24, fontWeight: '800', color: THEME.gold },
  statLabel:   { fontSize: 11, color: THEME.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: 'rgba(139,92,246,0.2)' },

  section:      { marginHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 10 },

  hangoutCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.card, borderRadius: 14,
    borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 14, marginBottom: 8, gap: 12,
  },
  hangoutEmoji: { fontSize: 26 },
  hangoutInfo:  { flex: 1, gap: 5 },
  hangoutName:  { fontSize: 14, fontWeight: '600', color: THEME.text },
  avatarRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hangoutWith:  { fontSize: 11, color: THEME.textMuted },
  hangoutWhen:  { fontSize: 11, color: THEME.purpleMuted, fontWeight: '500' },

  comingSoon: { textAlign: 'center', fontSize: 12, color: THEME.textMuted, marginTop: 8, fontStyle: 'italic' },
});
