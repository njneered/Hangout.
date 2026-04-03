/**
 * FriendsModal.tsx
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
  purpleActive: 'rgba(139,92,246,0.35)',
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.15)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.12)',
  text: '#e8e4f3',
  textMuted: '#a78bfa',
};

type FriendsTab = 'friends' | 'pending';

interface Friend {
  id: string;       // row id in friends table
  userId: string;   // the friend's user id
  username: string;
}

interface PendingRequest {
  id: string;
  userId: string;   // requester's user id
  username: string;
  direction: 'sent' | 'received';
}

interface SearchResult {
  id: string;
  username: string;
}

// ── Avatar helpers (same as profile.tsx) ─────────────────────
function avatarColor(str: string) {
  const palette = [THEME.purple, THEME.gold, THEME.green, '#ef4444', '#3b82f6', '#f97316', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string) {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
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

// ── Main Component ────────────────────────────────────────────
export function FriendsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [activeTab, setActiveTab]       = useState<FriendsTab>('friends');
  const [friends, setFriends]           = useState<Friend[]>([]);
  const [pending, setPending]           = useState<PendingRequest[]>([]);
  const [suggested, setSuggested]       = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on open ──
  useEffect(() => {
    if (visible && userId) {
      loadFriends();
      loadPending();
      loadSuggested();
    }
  }, [visible, userId]);

  // ── Debounced search ──
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from('users')
          .select('id, username')
          .ilike('username', `%${searchQuery.trim()}%`)
          .neq('id', userId)
          .limit(10);

        // Filter out existing friends and pending
        const existingIds = new Set([
          ...friends.map(f => f.userId),
          ...pending.map(p => p.userId),
        ]);

        setSearchResults(
          (data ?? [])
            .filter((u: any) => !existingIds.has(u.id))
            .map((u: any) => ({ id: u.id, username: u.username }))
        );
      } catch (err: any) {
        console.error('Search error:', err.message);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery, friends, pending]);

  async function loadFriends() {
    setLoadingFriends(true);
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('id, friend_id, users!friends_friend_id_fkey(username)')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      setFriends((data ?? []).map((r: any) => ({
        id:       r.id,
        userId:   r.friend_id,
        username: r.users?.username ?? 'Unknown',
      })));
    } catch (err: any) {
      console.error('Error loading friends:', err.message);
    } finally {
      setLoadingFriends(false);
    }
  }

  async function loadPending() {
    try {
      // Sent by me
      const { data: sent } = await supabase
        .from('friends')
        .select('id, friend_id, users!friends_friend_id_fkey(username)')
        .eq('user_id', userId)
        .eq('status', 'pending');

      // Received (someone sent to me)
      const { data: received } = await supabase
        .from('friends')
        .select('id, user_id, users!friends_user_id_fkey(username)')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      const sentList: PendingRequest[] = (sent ?? []).map((r: any) => ({
        id:        r.id,
        userId:    r.friend_id,
        username:  r.users?.username ?? 'Unknown',
        direction: 'sent',
      }));

      const receivedList: PendingRequest[] = (received ?? []).map((r: any) => ({
        id:        r.id,
        userId:    r.user_id,
        username:  r.users?.username ?? 'Unknown',
        direction: 'received',
      }));

      setPending([...receivedList, ...sentList]); // received first
    } catch (err: any) {
      console.error('Error loading pending:', err.message);
    }
  }

  async function loadSuggested() {
    try {
      // People from shared group_members that aren't already friends
      const { data: groupRows } = await supabase
        .from('group_members')
        .select('user_id')
        .neq('user_id', userId);

      const existingIds = new Set([
        ...friends.map(f => f.userId),
        ...pending.map(p => p.userId),
        userId,
      ]);

      const candidateIds = [...new Set(
        (groupRows ?? []).map((r: any) => r.user_id).filter((id: string) => !existingIds.has(id))
      )].slice(0, 10);

      if (candidateIds.length === 0) { setSuggested([]); return; }

      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', candidateIds);

      setSuggested((users ?? []).map((u: any) => ({ id: u.id, username: u.username })));
    } catch (err: any) {
      console.error('Error loading suggested:', err.message);
    }
  }

  // ── Send friend request ──
  async function sendRequest(toUserId: string, username: string) {
    setActionLoading(toUserId);
    try {
      const { error } = await supabase
        .from('friends')
        .insert({ user_id: userId, friend_id: toUserId, status: 'pending' });

      if (error) throw error;

      setPending(prev => [...prev, {
        id:        `temp-${toUserId}`,
        userId:    toUserId,
        username,
        direction: 'sent',
      }]);

      // Remove from search results and suggested
      setSearchResults(prev => prev.filter(u => u.id !== toUserId));
      setSuggested(prev => prev.filter(u => u.id !== toUserId));

      Alert.alert('Request sent!', `Friend request sent to @${username}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not send request');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Accept friend request ──
  async function acceptRequest(request: PendingRequest) {
    setActionLoading(request.id);
    try {
      // Update their row to accepted
      const { error: updateError } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', request.userId)
        .eq('friend_id', userId);

      if (updateError) throw updateError;

      // Insert reverse row so both users see each other
      const { error: insertError } = await supabase
        .from('friends')
        .insert({ user_id: userId, friend_id: request.userId, status: 'accepted' });

      if (insertError) throw insertError;

      // Update local state
      setPending(prev => prev.filter(p => p.id !== request.id));
      setFriends(prev => [...prev, {
        id:       `new-${request.userId}`,
        userId:   request.userId,
        username: request.username,
      }]);
    } catch (err: any) {
      Alert.alert('Error accepting', err.message ?? 'Could not accept request');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Decline / cancel request ──
  async function removeRequest(request: PendingRequest) {
    setActionLoading(request.id);
    try {
      if (request.direction === 'received') {
        // Delete their row
        await supabase
          .from('friends')
          .delete()
          .eq('user_id', request.userId)
          .eq('friend_id', userId);
      } else {
        // Delete my row
        await supabase
          .from('friends')
          .delete()
          .eq('user_id', userId)
          .eq('friend_id', request.userId);
      }
      setPending(prev => prev.filter(p => p.id !== request.id));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not remove request');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Remove friend ──
  async function removeFriend(friend: Friend) {
    Alert.alert(
      'Remove Friend',
      `Remove @${friend.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(friend.id);
            try {
              // Delete both directions
              await supabase.from('friends').delete()
                .eq('user_id', userId).eq('friend_id', friend.userId);
              await supabase.from('friends').delete()
                .eq('user_id', friend.userId).eq('friend_id', userId);
              setFriends(prev => prev.filter(f => f.id !== friend.id));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not remove friend');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  const receivedCount = pending.filter(p => p.direction === 'received').length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.container}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>Friends</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <View style={s.searchWrap}>
          <View style={s.searchRow}>
            <View style={s.searchInputWrap}>
              <Text style={s.atSign}>@</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search by username..."
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searching && <ActivityIndicator size="small" color={THEME.purpleLight} style={{ marginLeft: 8 }} />}
            </View>
            {searchQuery.length > 0 && (
              <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Text style={s.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search results */}
          {searchQuery.trim().length > 0 && !searching && searchResults.length === 0 && (
            <Text style={s.noResults}>No users found for "@{searchQuery}"</Text>
          )}
          {searchResults.map(u => (
            <UserRow
              key={u.id}
              username={u.username}
              right={
                <ActionBtn
                  label="+ Add"
                  color="purple"
                  loading={actionLoading === u.id}
                  onPress={() => sendRequest(u.id, u.username)}
                />
              }
            />
          ))}
        </View>

        {/* ── Tabs ── */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'friends' && s.tabActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[s.tabText, activeTab === 'friends' && s.tabTextActive]}>
              Friends {friends.length > 0 ? `(${friends.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'pending' && s.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[s.tabText, activeTab === 'pending' && s.tabTextActive]}>
              Pending {receivedCount > 0 ? `🔴 ${receivedCount}` : pending.length > 0 ? `(${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Friends tab ── */}
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            keyExtractor={f => f.id}
            contentContainerStyle={s.listContent}
            ListEmptyComponent={
              loadingFriends ? (
                <View style={s.centerMsg}>
                  <ActivityIndicator color={THEME.purpleLight} />
                </View>
              ) : (
                <View style={s.centerMsg}>
                  <Text style={s.emptyEmoji}>👥</Text>
                  <Text style={s.emptyTitle}>No friends yet</Text>
                  <Text style={s.emptySubtitle}>Search by username above to add friends</Text>
                </View>
              )
            }
            ListHeaderComponent={
              suggested.length > 0 && friends.length === 0 ? (
                <View style={s.suggestedSection}>
                  <Text style={s.suggestedLabel}>PEOPLE YOU MAY KNOW</Text>
                  {suggested.map(u => (
                    <UserRow
                      key={u.id}
                      username={u.username}
                      right={
                        <ActionBtn
                          label="+ Add"
                          color="purple"
                          loading={actionLoading === u.id}
                          onPress={() => sendRequest(u.id, u.username)}
                        />
                      }
                    />
                  ))}
                  <View style={s.divider} />
                </View>
              ) : null
            }
            renderItem={({ item: f }) => (
              <UserRow
                username={f.username}
                right={
                  <ActionBtn
                    label="Remove"
                    color="red"
                    loading={actionLoading === f.id}
                    onPress={() => removeFriend(f)}
                  />
                }
              />
            )}
          />
        )}

        {/* ── Pending tab ── */}
        {activeTab === 'pending' && (
          <FlatList
            data={pending}
            keyExtractor={p => p.id}
            contentContainerStyle={s.listContent}
            ListEmptyComponent={
              <View style={s.centerMsg}>
                <Text style={s.emptyEmoji}>📬</Text>
                <Text style={s.emptyTitle}>No pending requests</Text>
                <Text style={s.emptySubtitle}>Friend requests you send or receive will appear here</Text>
              </View>
            }
            ListHeaderComponent={
              pending.some(p => p.direction === 'received') ? (
                <Text style={s.pendingSectionLabel}>INCOMING</Text>
              ) : null
            }
            renderItem={({ item: p }) => (
              <>
                {/* Section divider between received and sent */}
                {p.direction === 'sent' && pending.findIndex(x => x.direction === 'sent') === pending.indexOf(p) && (
                  <Text style={[s.pendingSectionLabel, { marginTop: 16 }]}>SENT</Text>
                )}
                <UserRow
                  username={p.username}
                  badge={p.direction === 'received' ? '📥 Wants to be friends' : '📤 Request sent'}
                  badgeColor={p.direction === 'received' ? THEME.purpleLight : THEME.textMuted}
                  right={
                    p.direction === 'received' ? (
                      <View style={s.acceptRow}>
                        <ActionBtn
                          label="✓"
                          color="green"
                          loading={actionLoading === p.id}
                          onPress={() => acceptRequest(p)}
                        />
                        <ActionBtn
                          label="✕"
                          color="red"
                          loading={actionLoading === p.id}
                          onPress={() => removeRequest(p)}
                        />
                      </View>
                    ) : (
                      <ActionBtn
                        label="Cancel"
                        color="red"
                        loading={actionLoading === p.id}
                        onPress={() => removeRequest(p)}
                      />
                    )
                  }
                />
              </>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ── Shared sub-components ─────────────────────────────────────
function UserRow({
  username,
  badge,
  badgeColor,
  right,
}: {
  username: string;
  badge?: string;
  badgeColor?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={s.userRow}>
      <AvatarCircle name={username} size={42} />
      <View style={s.userInfo}>
        <Text style={s.username}>@{username}</Text>
        {badge && <Text style={[s.badge, { color: badgeColor ?? THEME.textMuted }]}>{badge}</Text>}
      </View>
      {right}
    </View>
  );
}

function ActionBtn({
  label,
  color,
  loading,
  onPress,
}: {
  label: string;
  color: 'purple' | 'green' | 'red';
  loading: boolean;
  onPress: () => void;
}) {
  const bg = color === 'green'
    ? THEME.greenDim
    : color === 'red'
    ? THEME.redDim
    : THEME.purpleDim;

  const border = color === 'green'
    ? 'rgba(16,185,129,0.4)'
    : color === 'red'
    ? 'rgba(239,68,68,0.4)'
    : 'rgba(139,92,246,0.3)';

  const textColor = color === 'green'
    ? THEME.green
    : color === 'red'
    ? THEME.red
    : THEME.purpleLight;

  return (
    <TouchableOpacity
      style={[s.actionBtn, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[s.actionBtnText, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: THEME.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)',
  },
  title:        { fontSize: 22, fontWeight: '800', color: THEME.text },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 18, color: THEME.textMuted },

  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.1)',
  },
  searchRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  atSign:      { fontSize: 14, color: THEME.textMuted, fontWeight: '700', marginRight: 4 },
  searchInput: { flex: 1, fontSize: 14, color: THEME.text },
  clearBtn:    { padding: 6 },
  clearBtnText:{ fontSize: 14, color: THEME.textMuted },
  noResults:   { fontSize: 13, color: THEME.textMuted, fontStyle: 'italic', marginTop: 8 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab:           { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive:     { backgroundColor: THEME.purpleDim, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  tabText:       { fontSize: 13, fontWeight: '600', color: THEME.textMuted },
  tabTextActive: { color: THEME.purpleLight },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  suggestedSection: { marginBottom: 4 },
  suggestedLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: THEME.textMuted, marginBottom: 8 },
  divider:          { height: 1, backgroundColor: 'rgba(139,92,246,0.1)', marginVertical: 16 },

  pendingSectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: THEME.textMuted, marginBottom: 8,
  },

  centerMsg:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji:   { fontSize: 44, marginBottom: 12 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: THEME.textMuted, textAlign: 'center', lineHeight: 19 },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.card, borderRadius: 14,
    borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 12, marginBottom: 8,
  },
  userInfo:  { flex: 1 },
  username:  { fontSize: 14, fontWeight: '600', color: THEME.text },
  badge:     { fontSize: 11, marginTop: 3 },

  acceptRow: { flexDirection: 'row', gap: 6 },

  actionBtn: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7,
    minWidth: 54, alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});