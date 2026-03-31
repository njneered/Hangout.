/**
 * InviteSection.tsx
 * ─────────────────────────────────────────────────────────────
 * Drop this component into your hangouts.tsx file.
 * Add it inside EventDetail's details tab, below WHO'S COMING.
 *
 * USAGE in EventDetail:
 *   <Section label="INVITE PEOPLE">
 *     <InviteSection
 *       eventId={ev.id}
 *       groupId={ev.groupId}
 *       currentUserId={currentUserId}
 *       currentAttendees={ev.attendees}
 *       onInvited={(user) => setEv(prev => ({
 *         ...prev,
 *         attendees: [...prev.attendees, { id: user.id, name: user.username, color: THEME.purpleLight }]
 *       }))}
 *     />
 *   </Section>
 *
 * Also add to EventDetail props:
 *   currentUserId: string
 * And pass it in from HangoutsScreen:
 *   <EventDetail ... currentUserId={userId} />
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

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
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.15)',
  red: '#ef4444',
};

type FoundUser = { id: string; username: string };
type InviteTab = 'search' | 'friends';

interface InviteSectionProps {
  eventId: string;
  groupId: string;
  currentUserId: string;
  currentAttendees: { id: string }[];
  onInvited: (user: FoundUser) => void;
}

export function InviteSection({
  eventId,
  groupId,
  currentUserId,
  currentAttendees,
  onInvited,
}: InviteSectionProps) {
  const [activeTab, setActiveTab]     = useState<InviteTab>('search');
  const [query, setQuery]             = useState('');
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);
  const [searching, setSearching]     = useState(false);
  const [friends, setFriends]         = useState<FoundUser[]>([]);
  const [recentPeople, setRecentPeople] = useState<FoundUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [inviting, setInviting]       = useState<string | null>(null); // user id being invited
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attendeeIds = new Set(currentAttendees.map(a => a.id));

  // ── Load friends + recent group people on mount ──
  useEffect(() => {
    async function loadFriendsAndRecent() {
      setLoadingFriends(true);
      try {
        // 1. Friends from friends table (accepted)
        const { data: friendRows } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', currentUserId)
          .eq('status', 'accepted');

        const friendIds = (friendRows ?? []).map((r: any) => r.friend_id);

        if (friendIds.length > 0) {
          const { data: friendUsers } = await supabase
            .from('users')
            .select('id, username')
            .in('id', friendIds);

          setFriends((friendUsers ?? []).map((u: any) => ({
            id: u.id,
            username: u.username,
          })));
        }

        // 2. Recent group members (people from past groups, excluding self)
        const { data: groupMemberRows } = await supabase
          .from('group_members')
          .select('user_id')
          .neq('user_id', currentUserId);

        const recentIds = [...new Set(
          (groupMemberRows ?? []).map((r: any) => r.user_id)
        )].filter(id => !friendIds.includes(id)); // exclude friends (already shown above)

        if (recentIds.length > 0) {
          const { data: recentUsers } = await supabase
            .from('users')
            .select('id, username')
            .in('id', recentIds)
            .limit(20);

          setRecentPeople((recentUsers ?? []).map((u: any) => ({
            id: u.id,
            username: u.username,
          })));
        }
      } catch (err: any) {
        console.error('Error loading friends/recent:', err.message);
      } finally {
        setLoadingFriends(false);
      }
    }

    loadFriendsAndRecent();
  }, [currentUserId]);

  // ── Debounced username search ──
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from('users')
          .select('id, username')
          .ilike('username', `%${query.trim()}%`)
          .neq('id', currentUserId)
          .limit(10);

        setSearchResults((data ?? []).map((u: any) => ({
          id: u.id,
          username: u.username,
        })));
      } catch (err: any) {
        console.error('Search error:', err.message);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  // ── Send invite ──
  async function handleInvite(user: FoundUser) {
    if (inviting) return;
    setInviting(user.id);

    try {
      // 1. Add to event_members as pending
      const { error: eventMemberError } = await supabase
        .from('event_members')
        .insert({
          event_id:    eventId,
          user_id:     user.id,
          role:        'member',
          rsvp_status: 'pending',
        });

      if (eventMemberError) throw eventMemberError;

      // 2. Add to group_members if not already there
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        await supabase
          .from('group_members')
          .insert({ group_id: groupId, user_id: user.id });
      }

      onInvited(user);
      Alert.alert('Invited!', `${user.username} has been invited to the hangout.`);
    } catch (err: any) {
      Alert.alert('Error inviting', err.message ?? 'Unknown error');
    } finally {
      setInviting(null);
    }
  }

  // ── User row ──
  function UserRow({ user }: { user: FoundUser }) {
    const alreadyAdded = attendeeIds.has(user.id);
    const isInviting   = inviting === user.id;

    return (
      <View style={inv.userRow}>
        <View style={inv.userAvatar}>
          <Text style={inv.userAvatarText}>{user.username[0].toUpperCase()}</Text>
        </View>
        <Text style={inv.username}>@{user.username}</Text>
        <TouchableOpacity
          style={[
            inv.inviteBtn,
            alreadyAdded && inv.inviteBtnAdded,
            isInviting && inv.inviteBtnLoading,
          ]}
          onPress={() => !alreadyAdded && handleInvite(user)}
          disabled={alreadyAdded || !!inviting}
          activeOpacity={0.7}
        >
          {isInviting ? (
            <ActivityIndicator size="small" color={THEME.purpleLight} />
          ) : (
            <Text style={[inv.inviteBtnText, alreadyAdded && inv.inviteBtnTextAdded]}>
              {alreadyAdded ? 'Invited ✓' : '+ Invite'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={inv.container}>
      {/* ── Tab switcher ── */}
      <View style={inv.tabRow}>
        <TouchableOpacity
          style={[inv.tab, activeTab === 'search' && inv.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[inv.tabText, activeTab === 'search' && inv.tabTextActive]}>
            🔍 Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[inv.tab, activeTab === 'friends' && inv.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[inv.tabText, activeTab === 'friends' && inv.tabTextActive]}>
            👥 Friends & Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search tab ── */}
      {activeTab === 'search' && (
        <View>
          <View style={inv.searchRow}>
            <TextInput
              style={inv.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={THEME.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator
                size="small"
                color={THEME.purpleLight}
                style={{ position: 'absolute', right: 12 }}
              />
            )}
          </View>

          {query.trim().length > 0 && !searching && searchResults.length === 0 && (
            <Text style={inv.emptyText}>No users found for "{query}"</Text>
          )}

          {searchResults.map(user => (
            <UserRow key={user.id} user={user} />
          ))}
        </View>
      )}

      {/* ── Friends & Recent tab ── */}
      {activeTab === 'friends' && (
        <View>
          {loadingFriends ? (
            <View style={inv.loadingRow}>
              <ActivityIndicator color={THEME.purpleLight} size="small" />
              <Text style={inv.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {/* Friends section */}
              {friends.length > 0 && (
                <>
                  <Text style={inv.subLabel}>FRIENDS</Text>
                  {friends.map(user => <UserRow key={user.id} user={user} />)}
                </>
              )}

              {/* Recent groups section */}
              {recentPeople.length > 0 && (
                <>
                  <Text style={[inv.subLabel, { marginTop: friends.length > 0 ? 16 : 0 }]}>
                    FROM RECENT GROUPS
                  </Text>
                  {recentPeople.map(user => <UserRow key={user.id} user={user} />)}
                </>
              )}

              {friends.length === 0 && recentPeople.length === 0 && (
                <Text style={inv.emptyText}>
                  No friends or recent group members yet. Use Search to find people by username.
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const inv = StyleSheet.create({
  container: { gap: 8 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:     { backgroundColor: THEME.purpleDim, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  tabText:       { fontSize: 12, fontWeight: '600', color: THEME.textMuted },
  tabTextActive: { color: THEME.purpleLight },

  searchRow: { position: 'relative', marginBottom: 8 },
  searchInput: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: THEME.text,
    paddingRight: 40,
  },

  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: THEME.textMuted,
    marginBottom: 8,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.purpleDim,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 13, fontWeight: '800', color: THEME.purpleLight },
  username:       { flex: 1, fontSize: 14, fontWeight: '600', color: THEME.text },

  inviteBtn: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    minWidth: 70,
    alignItems: 'center',
  },
  inviteBtnAdded:   { backgroundColor: THEME.greenDim, borderColor: 'rgba(16,185,129,0.4)' },
  inviteBtnLoading: { opacity: 0.6 },
  inviteBtnText:    { fontSize: 12, fontWeight: '700', color: THEME.purpleLight },
  inviteBtnTextAdded: { color: THEME.green },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadingText: { fontSize: 13, color: THEME.textMuted },
  emptyText:   { fontSize: 13, color: THEME.textMuted, textAlign: 'center', padding: 16 },
});