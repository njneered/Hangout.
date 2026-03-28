import HangoutHeader from '@/components/HangoutHeader';
import { FRIENDS, NUDGE } from '@/constants/mockData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarCircle } from './profile';

const THEME = {
  bg: '#0f0a1f',
  card: 'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',
  gold: '#facc15',
  goldDim: 'rgba(250,204,21,0.1)',
  purpleMuted: '#a78bfa',
  purpleLight: '#c4b5fd',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.12)',
  text: '#e8e4f3',
  textSub: '#c4b5fd',
  textMuted: '#a78bfa',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('users').select('username').eq('id', user.id).single();
      if (!error && data && active) setUsername(data.username ?? '');
    })();
    return () => { active = false; };
  }, [user]);

  const greetingName = username || user?.email?.split('@')[0] || 'there';

  return (
    <View style={styles.container}>
      <HangoutHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* GREETING */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good {getGreeting()}, {greetingName}!</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {/* NUDGE CARD */}
        <View style={styles.nudgeCard}>
          <Text style={styles.nudgeLabel}>It's been a while...</Text>
          <Text style={styles.nudgeDays}>{NUDGE.lastHangout} days since</Text>
          <Text style={styles.nudgeActivity}>hanging with {NUDGE.name}</Text>
          <TouchableOpacity style={styles.planBtn} onPress={() => router.push('/schedule' as any)}>
            <Text style={styles.planBtnText}>Plan something</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT HANGOUTS */}
        <Text style={styles.sectionLabel}>RECENT HANGOUTS</Text>
        {FRIENDS.map(friend => (
          <View key={friend.id} style={styles.friendRow}>
            {/* Avatar circle */}
            <AvatarCircle name={friend.name} size={44} />
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendActivity}>{friend.activity}</Text>
            </View>
            <View style={[styles.badge, friend.overdue ? styles.badgeOverdue : styles.badgeSoon]}>
              <Text style={styles.badgeNum}>{friend.lastHangout}</Text>
              <Text style={styles.badgeLabel}>{friend.overdue ? 'overdue' : 'days ago'}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scroll:    { flex: 1 },
  content:   { padding: 24, paddingTop: 16 },

  header:    { marginBottom: 28 },
  greeting:  { fontSize: 20, fontWeight: '700', color: THEME.text, marginBottom: 2 },
  date:      { fontSize: 13, color: THEME.textMuted },

  nudgeCard: {
    backgroundColor: THEME.goldDim, borderRadius: 20, padding: 24, marginBottom: 28,
    borderWidth: 1.5, borderColor: 'rgba(250,204,21,0.35)',
  },
  nudgeLabel:    { fontSize: 13, color: THEME.textSub, marginBottom: 4 },
  nudgeDays:     { fontSize: 36, fontWeight: '800', color: THEME.gold },
  nudgeActivity: { fontSize: 16, color: THEME.text, marginBottom: 20 },
  planBtn: {
    backgroundColor: THEME.gold, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'flex-start',
  },
  planBtnText: { color: '#1a1333', fontWeight: '700', fontSize: 14 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2,
    color: THEME.purpleMuted, marginBottom: 12,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: THEME.cardBorder,
  },
  friendInfo:    { flex: 1 },
  friendName:    { fontSize: 14, fontWeight: '600', color: THEME.text },
  friendActivity:{ fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  badge:         { borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52, borderWidth: 1 },
  badgeSoon:     { backgroundColor: 'rgba(250,204,21,0.12)', borderColor: 'rgba(250,204,21,0.25)' },
  badgeOverdue:  { backgroundColor: THEME.redDim, borderColor: 'rgba(239,68,68,0.3)' },
  badgeNum:      { fontSize: 16, fontWeight: '800', color: THEME.text },
  badgeLabel:    { fontSize: 10, color: THEME.textMuted, marginTop: 1 },
});
