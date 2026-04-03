import { FriendsModal } from '@/components/FriendsModal';
import HangoutHeader from '@/components/HangoutHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/themeprovider';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function avatarColor(str: string) {
  const palette = ['#8b5cf6', '#facc15', '#10b981', '#ef4444', '#3b82f6', '#f97316', '#ec4899'];
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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + '33', borderWidth: 1.5, borderColor: col + '77', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: col, fontSize: size * 0.36, fontWeight: '800' }}>{getInitials(name)}</Text>
    </View>
  );
}

interface UserProfile { username: string; email: string; }

interface RecentHangout {
  id: string; emoji: string; name: string; date: string;
  startTime: Date; attendees: string[];
  daysSince: number; daysUntil: number; isFuture: boolean;
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [editMode, setEditMode]             = useState(false);
  const [draftUsername, setDraftUsername]   = useState('');
  const [friendsVisible, setFriendsVisible] = useState(false);
  const [friendCount, setFriendCount]       = useState<number>(0);
  const [hangoutCount, setHangoutCount]     = useState<number>(0);
  const [daysSince, setDaysSince]           = useState<number | null>(null);
  const [recentHangouts, setRecentHangouts] = useState<RecentHangout[]>([]);
  const [loadingHangouts, setLoadingHangouts] = useState(true);
  const [flippedCards, setFlippedCards]     = useState<Set<string>>(new Set());

  const s = makeStyles(theme);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('username, email').eq('id', user.id).single();
      if (!error && data && active) {
        setProfile({ username: data.username ?? '', email: data.email ?? user.email ?? '' });
        setDraftUsername(data.username ?? '');
      }
      const { count: fCount } = await supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted');
      if (active) setFriendCount(fCount ?? 0);
      const { count: hCount } = await supabase.from('event_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (active) setHangoutCount(hCount ?? 0);
      const { data: lastEvent } = await supabase.from('event_members').select('events(start_time)').eq('user_id', user.id).order('joined_at', { ascending: false }).limit(1).single();
      if (active && lastEvent) {
        const startTime = (lastEvent as any).events?.start_time;
        if (startTime) { const diff = Date.now() - new Date(startTime).getTime(); setDaysSince(Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))); }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => { if (!user) return; loadRecentHangouts(); }, [user]);

  async function loadRecentHangouts() {
    if (!user) return;
    setLoadingHangouts(true);
    try {
      const { data: memberRows, error: memberError } = await supabase.from('event_members').select('event_id, joined_at').eq('user_id', user.id).order('joined_at', { ascending: false }).limit(3);
      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) { setRecentHangouts([]); setLoadingHangouts(false); return; }
      const eventIds = memberRows.map((r: any) => r.event_id);
      const { data: events, error: evError } = await supabase.from('events').select('id, title, description, start_time').in('id', eventIds).order('start_time', { ascending: false });
      if (evError) throw evError;
      const hangouts: RecentHangout[] = await Promise.all(
        (events ?? []).map(async (ev: any) => {
          const { data: attendeeRows } = await supabase.from('event_members').select('users(username)').eq('event_id', ev.id).neq('user_id', user.id).limit(4);
          const attendees = (attendeeRows ?? []).map((r: any) => r.users?.username).filter(Boolean) as string[];
          const startTime = new Date(ev.start_time);
          const now = Date.now(); const eventTime = startTime.getTime();
          const isFuture = eventTime > now;
          const diffDays = Math.floor(Math.abs(now - eventTime) / (1000 * 60 * 60 * 24));
          return { id: ev.id, emoji: ev.description?.split(' ')[0] ?? '🎉', name: ev.title, date: startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), startTime, attendees, daysSince: isFuture ? 0 : diffDays, daysUntil: isFuture ? diffDays : 0, isFuture };
        })
      );
      setRecentHangouts(hangouts);
    } catch (err: any) { console.error('Error loading recent hangouts:', err.message); }
    finally { setLoadingHangouts(false); }
  }

  function toggleFlip(id: string) {
    setFlippedCards(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

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
  const avatarCol = avatarColor(displayName);
  const initials = getInitials(displayName);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HangoutHeader />
      <FriendsModal visible={friendsVisible} onClose={() => setFriendsVisible(false)} />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>
          <View style={[s.glowRing, { shadowColor: avatarCol }]} />
          <View style={[s.avatar, { backgroundColor: avatarCol + '33', borderColor: avatarCol + '88' }]}>
            <Text style={[s.avatarText, { color: avatarCol }]}>{initials}</Text>
          </View>
          {editMode ? (
            <View style={s.editGroup}>
              <View style={s.accountCard}>
                <View style={s.infoRow}>
                  <Text style={s.infoKey}>Email</Text>
                  <Text style={s.infoVal} numberOfLines={1}>{profile?.email || user?.email || '—'}</Text>
                </View>
                <View style={[s.infoRow, s.infoRowBorder]}>
                  <Text style={s.infoKey}>Username</Text>
                  <View style={s.usernameField}>
                    <Text style={s.atSign}>@</Text>
                    <TextInput style={s.usernameInput} value={draftUsername} onChangeText={setDraftUsername} placeholder="username" placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
                  </View>
                </View>
              </View>
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setDraftUsername(profile?.username ?? ''); setEditMode(false); }}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={isDark ? '#1a1333' : '#fff'} /> : <Text style={s.saveBtnText}>Save</Text>}
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

        <View style={s.statsRow}>
          <TouchableOpacity style={s.statBlock} onPress={() => setFriendsVisible(true)} activeOpacity={0.7}>
            <Text style={s.statNum}>{friendCount}</Text>
            <Text style={[s.statLabel, { color: theme.gold }]}>Friends ›</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statNum}>{hangoutCount}</Text>
            <Text style={s.statLabel}>Hangouts</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statNum}>{daysSince !== null ? daysSince : '—'}</Text>
            <Text style={s.statLabel}>Days since</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>RECENT HANGOUTS</Text>
          {loadingHangouts ? (
            <View style={s.loadingRow}><ActivityIndicator size="small" color={theme.purpleLight} /><Text style={s.loadingText}>Loading hangouts…</Text></View>
          ) : recentHangouts.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🌙</Text>
              <Text style={s.emptyTitle}>No hangouts yet</Text>
              <Text style={s.emptySub}>Create your first hangout and get the crew together!</Text>
              <View style={s.emptyHint}><Text style={s.emptyHintText}>💡 Head to the Hangouts tab to get started</Text></View>
            </View>
          ) : (
            recentHangouts.map(h => {
              const isOverdue = !h.isFuture && h.daysSince > 10;
              const isFlipped = flippedCards.has(h.id);
              const badgeStyle = h.isFuture ? s.badgeFuture : isOverdue ? s.badgeOverdue : s.badgeRecent;
              return (
                <View key={h.id} style={[s.hangoutCard, h.isFuture && s.hangoutCardFuture, isOverdue && s.hangoutCardOverdue]}>
                  <View style={s.hangoutLeft}>
                    <Text style={s.hangoutEmoji}>{h.emoji}</Text>
                    <View style={s.hangoutInfo}>
                      <Text style={s.hangoutName}>{h.name}</Text>
                      <Text style={s.hangoutDate}>📅 {h.date}</Text>
                      {h.attendees.length > 0 && (
                        <View style={s.attendeeRow}>
                          {h.attendees.slice(0, 3).map(name => <AvatarCircle key={name} name={name} size={18} />)}
                          <Text style={s.hangoutWith}>{h.attendees.slice(0, 3).join(', ')}{h.attendees.length > 3 ? ` +${h.attendees.length - 3}` : ''}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity style={[s.badge, badgeStyle]} onPress={() => h.isFuture ? null : toggleFlip(h.id)} activeOpacity={h.isFuture ? 1 : 0.7}>
                    {h.isFuture ? (
                      <><Text style={s.badgeNum}>{h.daysUntil}</Text><Text style={[s.badgeLbl, { color: theme.green }]}>days until</Text></>
                    ) : isFlipped ? (
                      <><Text style={s.badgeFlipIcon}>🔄</Text><Text style={s.badgeLbl}>plan again?</Text></>
                    ) : isOverdue ? (
                      <><Text style={s.badgeNum}>{h.daysSince}</Text><Text style={s.badgeLbl}>days ago</Text><Text style={s.badgeNudge}>👋 reach out</Text></>
                    ) : (
                      <><Text style={s.badgeNum}>{h.daysSince}</Text><Text style={s.badgeLbl}>days ago</Text><Text style={s.badgeTap}>tap ›</Text></>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 60 },
    hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24 },
    glowRing: { position: 'absolute', top: 22, width: 100, height: 100, borderRadius: 50, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 28, elevation: 0 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
    nameGroup: { alignItems: 'center', gap: 6 },
    displayName: { fontSize: 26, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
    editBtn: { marginTop: 2, backgroundColor: theme.purpleDim, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: `${theme.purple}4D` },
    editBtnText: { fontSize: 13, fontWeight: '600', color: theme.purpleLight },
    editGroup: { alignItems: 'center', width: '100%', gap: 12 },
    accountCard: { width: '100%', backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
    infoRowBorder: { borderTopWidth: 1, borderTopColor: theme.cardBorder },
    infoKey: { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
    infoVal: { fontSize: 13, color: theme.text, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
    usernameField: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.purpleDim, borderWidth: 1, borderColor: `${theme.purple}4D`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    atSign: { fontSize: 13, color: theme.textMuted, fontWeight: '700', marginRight: 3 },
    usernameInput: { fontSize: 13, color: theme.text, fontWeight: '500', minWidth: 80 },
    editActions: { flexDirection: 'row', gap: 10, width: '100%' },
    cancelBtn: { flex: 1, backgroundColor: theme.purpleDim, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: `${theme.purple}40` },
    cancelBtnText: { color: theme.purpleLight, fontWeight: '600', fontSize: 14 },
    saveBtn: { flex: 1, backgroundColor: theme.gold, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
    saveBtnText: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '800', fontSize: 14 },
    statsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, paddingVertical: 16 },
    statBlock: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: '800', color: theme.gold },
    statLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
    statDivider: { width: 1, backgroundColor: theme.cardBorder },
    section: { marginHorizontal: 20, marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.purpleMuted, marginBottom: 10 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
    loadingText: { fontSize: 13, color: theme.textMuted },
    emptyCard: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, padding: 28, alignItems: 'center' },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },
    emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 14 },
    emptyHint: { backgroundColor: theme.purpleDim, borderRadius: 10, borderWidth: 1, borderColor: `${theme.purple}40`, paddingHorizontal: 14, paddingVertical: 8 },
    emptyHintText: { fontSize: 12, color: theme.purpleLight, fontWeight: '500' },
    hangoutCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 8 },
    hangoutCardFuture: { borderColor: `${theme.green}59`, backgroundColor: theme.greenDim },
    hangoutCardOverdue: { borderColor: `${theme.red}59`, backgroundColor: theme.redDim },
    hangoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    hangoutEmoji: { fontSize: 26 },
    hangoutInfo: { flex: 1, gap: 3 },
    hangoutName: { fontSize: 14, fontWeight: '600', color: theme.text },
    hangoutDate: { fontSize: 11, color: theme.textMuted },
    attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    hangoutWith: { fontSize: 11, color: theme.textMuted },
    badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 68, borderWidth: 1 },
    badgeRecent: { backgroundColor: theme.goldDim, borderColor: `${theme.gold}40` },
    badgeOverdue: { backgroundColor: theme.redDim, borderColor: `${theme.red}59` },
    badgeFuture: { backgroundColor: theme.greenDim, borderColor: `${theme.green}59` },
    badgeNum: { fontSize: 15, fontWeight: '800', color: theme.text },
    badgeLbl: { fontSize: 9, color: theme.textMuted, marginTop: 1, fontWeight: '600' },
    badgeNudge: { fontSize: 9, color: theme.red, marginTop: 3, fontWeight: '700' },
    badgeTap: { fontSize: 9, color: theme.purpleMuted, marginTop: 3, fontWeight: '600' },
    badgeFlipIcon: { fontSize: 14, marginBottom: 2 },
  });
}