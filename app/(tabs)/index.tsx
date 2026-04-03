import HangoutHeader from '@/components/HangoutHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/themeprovider';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AvatarCircle } from './profile';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

interface NudgeData {
  name: string;
  daysSince: number;
  eventId: string;
}

interface RecentFriend {
  id: string;
  name: string;
  lastActivity: string;
  daysSince: number;
  overdue: boolean;
}

export default function HomeScreen() {
  const router        = useRouter();
  const { user }      = useAuth();
  const { theme }     = useTheme();          // ← replaces hardcoded THEME

  const [username, setUsername]           = useState('');
  const [nudge, setNudge]                 = useState<NudgeData | null>(null);
  const [recentFriends, setRecentFriends] = useState<RecentFriend[]>([]);
  const [loading, setLoading]             = useState(true);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  useEffect(() => { if (!user) return; loadAll(); }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try { await Promise.all([loadUsername(), loadNudge(), loadRecentFriends()]); }
    catch (err) { console.error('Home load error:', err); }
    finally { setLoading(false); }
  }

  async function loadUsername() {
    const { data } = await supabase.from('users').select('username').eq('id', user!.id).single();
    if (data) setUsername(data.username ?? '');
  }

  async function loadNudge() {
    const { data: memberRows } = await supabase.from('event_members').select('event_id').eq('user_id', user!.id);
    const eventIds = (memberRows ?? []).map((r: any) => r.event_id);
    if (eventIds.length === 0) return;
    const { data: events } = await supabase.from('events').select('id, title, start_time').in('id', eventIds).lt('start_time', new Date().toISOString()).order('start_time', { ascending: false }).limit(1);
    if (!events || events.length === 0) return;
    const lastEvent = events[0];
    const daysSince = Math.floor((Date.now() - new Date(lastEvent.start_time).getTime()) / (1000 * 60 * 60 * 24));
    setNudge({ name: lastEvent.title, daysSince, eventId: lastEvent.id });
  }

  async function loadRecentFriends() {
    const { data: memberRows } = await supabase.from('event_members').select('event_id').eq('user_id', user!.id);
    const eventIds = (memberRows ?? []).map((r: any) => r.event_id);
    if (eventIds.length === 0) { setRecentFriends([]); return; }
    const { data: events } = await supabase.from('events').select('id, title, start_time').in('id', eventIds).lt('start_time', new Date().toISOString()).order('start_time', { ascending: false }).limit(5);
    if (!events || events.length === 0) { setRecentFriends([]); return; }
    const results: RecentFriend[] = await Promise.all(
      (events ?? []).map(async (ev: any) => {
        const { data: attendeeRows } = await supabase.from('event_members').select('users(username)').eq('event_id', ev.id).neq('user_id', user!.id).limit(3);
        const names = (attendeeRows ?? []).map((r: any) => r.users?.username).filter(Boolean) as string[];
        const daysSince = Math.floor((Date.now() - new Date(ev.start_time).getTime()) / (1000 * 60 * 60 * 24));
        return { id: ev.id, name: ev.title, lastActivity: names.length > 0 ? `with ${names.join(', ')}` : 'Just you', daysSince, overdue: daysSince > 10 };
      })
    );
    setRecentFriends(results);
  }

  const greetingName = username || user?.email?.split('@')[0] || 'there';

  // ── Build styles from current theme ──────────────────────
  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <HangoutHeader />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* ── Greeting ── */}
        <View style={s.header}>
          <Text style={s.greeting}>Good {getGreeting()}, {greetingName}!</Text>
          <Text style={s.date}>{today}</Text>
        </View>

        {/* ── Nudge Card ── */}
        {loading ? (
          <View style={s.nudgeCard}>
            <ActivityIndicator color={theme.gold} />
          </View>
        ) : nudge ? (
          <View style={s.nudgeCard}>
            <Text style={s.nudgeLabel}>It's been a while...</Text>
            <Text style={s.nudgeDays}>{nudge.daysSince} days since</Text>
            <Text style={s.nudgeActivity}>hanging with {nudge.name}</Text>
            <TouchableOpacity style={s.planBtn} onPress={() => router.push('/(tabs)/hangouts' as any)}>
              <Text style={s.planBtnText}>Plan something</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.nudgeCard}>
            <Text style={s.nudgeLabel}>Welcome to Hangout! 🎉</Text>
            <Text style={s.nudgeActivityFirst}>Create your first hangout and get the crew together.</Text>
            <TouchableOpacity style={s.planBtn} onPress={() => router.push('/(tabs)/hangouts' as any)}>
              <Text style={s.planBtnText}>Create a hangout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Recent Hangouts ── */}
        <Text style={s.sectionLabel}>RECENT HANGOUTS</Text>

        {loading ? (
          <ActivityIndicator color={theme.purpleLight} style={{ marginTop: 20 }} />
        ) : recentFriends.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>👥</Text>
            <Text style={s.emptyText}>No hangouts yet — invite some friends and start planning!</Text>
          </View>
        ) : (
          recentFriends.map(friend => (
            <View key={friend.id} style={s.friendRow}>
              <AvatarCircle name={friend.name} size={44} />
              <View style={s.friendInfo}>
                <Text style={s.friendName}>{friend.name}</Text>
                <Text style={s.friendActivity}>{friend.lastActivity}</Text>
              </View>
              <View style={[s.badge, friend.overdue ? s.badgeOverdue : s.badgeSoon]}>
                <Text style={s.badgeNum}>{friend.daysSince}</Text>
                <Text style={s.badgeLabel}>{friend.overdue ? 'overdue' : 'days ago'}</Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

// ── makeStyles — rebuilds when theme changes ──────────────────
function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll:    { flex: 1 },
    content:   { padding: 24, paddingTop: 16 },

    header:   { marginBottom: 28 },
    greeting: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 2 },
    date:     { fontSize: 13, color: theme.textMuted },

    nudgeCard: {
      backgroundColor: theme.goldDim, borderRadius: 20, padding: 24, marginBottom: 28,
      borderWidth: 1.5, borderColor: `${theme.gold}55`,
      minHeight: 80, justifyContent: 'center',
    },
    nudgeLabel:         { fontSize: 13, color: theme.textSub, marginBottom: 4 },
    nudgeDays:          { fontSize: 36, fontWeight: '800', color: theme.gold },
    nudgeActivity:      { fontSize: 16, color: theme.text, marginBottom: 20 },
    nudgeActivityFirst: { fontSize: 15, color: theme.text, marginBottom: 20, lineHeight: 22 },
    planBtn: {
      backgroundColor: theme.gold, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start',
    },
    planBtnText: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '700', fontSize: 14 },

    sectionLabel: {
      fontSize: 11, fontWeight: '700', letterSpacing: 2,
      color: theme.purpleMuted, marginBottom: 12,
    },

    emptyCard: {
      backgroundColor: theme.card, borderRadius: 14, padding: 24,
      borderWidth: 1, borderColor: theme.cardBorder,
      alignItems: 'center', gap: 10,
    },
    emptyEmoji: { fontSize: 36 },
    emptyText:  { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 19 },

    friendRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: theme.cardBorder,
    },
    friendInfo:     { flex: 1 },
    friendName:     { fontSize: 14, fontWeight: '600', color: theme.text },
    friendActivity: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

    badge:        { borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52, borderWidth: 1 },
    badgeSoon:    { backgroundColor: `${theme.gold}1F`, borderColor: `${theme.gold}40` },
    badgeOverdue: { backgroundColor: theme.redDim, borderColor: `${theme.red}4D` },
    badgeNum:     { fontSize: 16, fontWeight: '800', color: theme.text },
    badgeLabel:   { fontSize: 10, color: theme.textMuted, marginTop: 1 },
  });
}