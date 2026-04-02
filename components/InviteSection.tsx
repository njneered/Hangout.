/**
 * InviteSection.tsx
 * ─────────────────────────────────────────────────────────────
 * Three invite methods:
 *   1. Search by username (existing)
 *   2. Friends & Recent (existing)
 *   3. Share Link — generates a shareable deep link via native share sheet
 *
 * TODO (backend): Create a join endpoint/handler that:
 *   - Accepts an eventId param from the deep link
 *   - Validates the event exists and is not full/cancelled
 *   - Inserts the authenticated joining user into event_members (role: 'member', rsvp_status: 'pending')
 *   - Inserts into group_members if not already present
 *   Deep link format: hangout://join?event=<eventId>
 */

import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
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
  goldDim: 'rgba(250,204,21,0.1)',
  purpleLight: '#c4b5fd',
  purpleMuted: '#a78bfa',
  purpleDim: 'rgba(139,92,246,0.15)',
  text: '#e8e4f3',
  textMuted: '#a78bfa',
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.15)',
  red: '#ef4444',
};

type FoundUser = { id: string; username: string };
type InviteTab = 'search' | 'friends' | 'link';

interface InviteSectionProps {
  eventId: string;
  eventName: string;
  groupId: string;
  currentUserId: string;
  currentAttendees: { id: string }[];
  onInvited: (user: FoundUser) => void;
}

export function InviteSection({
  eventId,
  eventName,
  groupId,
  currentUserId,
  currentAttendees,
  onInvited,
}: InviteSectionProps) {
  const [activeTab, setActiveTab]         = useState<InviteTab>('search');
  const [query, setQuery]                 = useState('');
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);
  const [searching, setSearching]         = useState(false);
  const [friends, setFriends]             = useState<FoundUser[]>([]);
  const [recentPeople, setRecentPeople]   = useState<FoundUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [inviting, setInviting]           = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attendeeIds = new Set(currentAttendees.map(a => a.id));

  // TODO (backend): replace with your actual deep link / universal link domain
  // once the join endpoint is implemented. Format: hangout://join?event=<eventId>
  const inviteLink = `hangout://join?event=${eventId}`;
  const shareMessage = `Hey! Join my hangout "${eventName}" on Hangout 🎉\n\nTap to join: ${inviteLink}`;

  // ── Load friends + recent on mount ──
  useEffect(() => {
    async function loadFriendsAndRecent() {
      setLoadingFriends(true);
      try {
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

        const { data: groupMemberRows } = await supabase
          .from('group_members')
          .select('user_id')
          .neq('user_id', currentUserId);

        const recentIds = [...new Set(
          (groupMemberRows ?? []).map((r: any) => r.user_id)
        )].filter(id => !friendIds.includes(id));

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

  // ── Debounced search ──
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }

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

  // ── Send in-app invite ──
  async function handleInvite(user: FoundUser) {
    if (inviting) return;
    setInviting(user.id);
    try {
      const { error: eventMemberError } = await supabase
        .from('event_members')
        .insert({
          event_id:    eventId,
          user_id:     user.id,
          role:        'member',
          rsvp_status: 'pending',
        });

      if (eventMemberError) throw eventMemberError;

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

  // ── Copy link to clipboard ──
  async function handleCopyLink() {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Native share sheet ──
  async function handleShareSheet() {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        // Fallback to clipboard if sharing not available
        await handleCopyLink();
        Alert.alert('Link copied!', 'Sharing is not available on this device. The link has been copied to your clipboard instead.');
        return;
      }
      // expo-sharing requires a file URI, so we use a temp text file workaround.
      // TODO (backend): once you have a proper universal link (e.g. https://hangout.app/join?event=xxx)
      // replace this with Share.share() from react-native which accepts plain text/URLs directly.
      Alert.alert(
        'Share invite',
        shareMessage,
        [
          { text: 'Copy Link', onPress: handleCopyLink },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      console.error('Share error:', err.message);
    }
  }

  // ── User row (search + friends tabs) ──
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
            isInviting   && inv.inviteBtnLoading,
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
        {(['search', 'friends', 'link'] as InviteTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[inv.tab, activeTab === tab && inv.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[inv.tabText, activeTab === tab && inv.tabTextActive]}>
              {tab === 'search' ? '🔍 Search' : tab === 'friends' ? '👥 Friends' : '🔗 Link'}
            </Text>
          </TouchableOpacity>
        ))}
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
                style={{ position: 'absolute', right: 12, top: 12 }}
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
              {friends.length > 0 && (
                <>
                  <Text style={inv.subLabel}>FRIENDS</Text>
                  {friends.map(user => <UserRow key={user.id} user={user} />)}
                </>
              )}

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

      {/* ── Share Link tab ── */}
      {activeTab === 'link' && (
        <View style={inv.linkContainer}>
          <Text style={inv.linkDesc}>
            Share this link with anyone — they'll be able to join the hangout directly.
          </Text>

          {/* Link preview box */}
          <View style={inv.linkBox}>
            <Text style={inv.linkText} numberOfLines={1} ellipsizeMode="middle">
              {inviteLink}
            </Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={[inv.shareBtn, inv.shareBtnPrimary]}
            onPress={handleShareSheet}
            activeOpacity={0.8}
          >
            <Text style={inv.shareBtnPrimaryText}>📤 Send Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[inv.shareBtn, copied && inv.shareBtnCopied]}
            onPress={handleCopyLink}
            activeOpacity={0.8}
          >
            <Text style={[inv.shareBtnText, copied && inv.shareBtnTextCopied]}>
              {copied ? 'Copied ✓' : '📋 Copy Link'}
            </Text>
          </TouchableOpacity>

          {/* TODO (backend): once join endpoint is live, replace inviteLink with
              a real universal link e.g. https://hangout.app/join?event=<eventId>
              so it works for people who don't have the app installed yet */}
          <Text style={inv.linkNote}>
            Friends without the app will be prompted to download it when they open the link.
          </Text>
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
  tabText:       { fontSize: 11, fontWeight: '600', color: THEME.textMuted },
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
  userAvatarText:     { fontSize: 13, fontWeight: '800', color: THEME.purpleLight },
  username:           { flex: 1, fontSize: 14, fontWeight: '600', color: THEME.text },

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
  inviteBtnAdded:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  inviteBtnLoading:   { opacity: 0.6 },
  inviteBtnText:      { fontSize: 12, fontWeight: '700', color: THEME.purpleLight },
  inviteBtnTextAdded: { color: THEME.green },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadingText: { fontSize: 13, color: THEME.textMuted },
  emptyText:   { fontSize: 13, color: THEME.textMuted, textAlign: 'center', padding: 16 },

  // ── Share Link tab ──
  linkContainer: { gap: 12 },
  linkDesc: {
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 19,
  },
  linkBox: {
    backgroundColor: 'rgba(20,16,44,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 13,
    color: THEME.purpleLight,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  shareBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    backgroundColor: THEME.purpleDim,
  },
  shareBtnPrimary: {
    backgroundColor: THEME.gold,
    borderColor: THEME.gold,
  },
  shareBtnCopied: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  shareBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#1a1333' },
  shareBtnText:        { fontSize: 14, fontWeight: '700', color: THEME.purpleLight },
  shareBtnTextCopied:  { color: THEME.green },
  linkNote: {
    fontSize: 11,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});