/**

- app/(tabs)/hangouts.tsx — FULLY WIRED VERSION
- ─────────────────────────────────────────────
- Changes from previous version:
- 
- CREATE FORM:
- - Optional "activity" field. If filled → Planned hangout 🎯, if empty → Open hangout 🌀
- - TODO (backend): add `activity` text column to events table
- 
- DETAIL — SUGGESTIONS TAB:
- - Upvote button on each suggestion (local optimistic state)
- - TODO (backend): add `votes` integer column (default 0) to event_suggestions table
- - Host-only "Make this the plan →" button on the top-voted pending suggestion
- - Promoting a suggestion sets event.activity and converts Open → Planned inline
- - Suggestions tab label changes to "Suggest Changes" when activity is already set
- 
- INVITE:
- - InviteSection now receives eventName prop for share message copy
    */

import HangoutHeader from '@/components/HangoutHeader';
import { InviteSection } from '@/components/InviteSection';
import LocationAutocomplete from '@/components/LocationAutoComplete';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
ActivityIndicator,
Alert,
KeyboardAvoidingView,
Platform,
ScrollView,
StyleSheet,
Text,
TextInput,
TouchableOpacity,
View,
} from 'react-native';

const THEME = {
bg: '#0f0a1f',
bgSecondary: '#1a1333',
card: 'rgba(30,24,56,0.6)',
cardBorder: 'rgba(139,92,246,0.2)',
gold: '#facc15',
goldDim: 'rgba(250,204,21,0.1)',
purple: '#8b5cf6',
purpleLight: '#c4b5fd',
purpleMuted: '#a78bfa',
purpleDim: 'rgba(139,92,246,0.15)',
red: '#ef4444',
redDim: 'rgba(239,68,68,0.12)',
green: '#10b981',
greenDim: 'rgba(16,185,129,0.15)',
text: '#e8e4f3',
textSub: '#c4b5fd',
textMuted: '#a78bfa',
};

const GUTTER = 20;
const OUTFIT_VIBES = ['Whatever', 'Comfy / PJs', 'Formal', 'Cosplay', 'Themed', 'Matching'];
const ATTENDEE_COLORS = [
'#facc15', '#ef4444', '#8b5cf6', '#10b981',
'#7ec8e3', '#f97316', '#a855f7', '#06b6d4',
];

// ── Types ─────────────────────────────────────────────────────
interface HangoutSummary {
id: string;
groupId: string;
emoji: string;
name: string;
date: string;
time: string;
confirmed: boolean;
attendeeCount: number;
isOpen: boolean; // true = no activity set yet
}

interface Attendee {
id: string;
name: string;
color: string;
rsvp: string;
}

interface EventItem {
id: string;
name: string;
category: 'food_drink' | 'misc';
status: string;
claimedById: string | null;
claimedBy: string | null;
notes: string;
}

interface Suggestion {
id: string;
fromId: string;
fromName: string;
text: string;
status: 'pending' | 'accepted' | 'declined';
// TODO (backend): add `votes` integer column (default 0) to event_suggestions table
votes: number;
}

interface EventDetail {
id: string;
groupId: string;
emoji: string;
name: string;
date: string;
time: string;
confirmed: boolean;
outfit: string;
playlist: string;
locationName: string;
locationAddr: string;
locationLat: number | null;
locationLon: number | null;
parkingName: string;
parkingAddr: string;
parkingNotes: string;
// TODO (backend): add `activity` text column to events table
activity: string;
creatorId: string;
}

type ViewType = 'list' | 'create' | 'detail';
type DetailTab = 'details' | 'suggestions';

// ── Root Screen ───────────────────────────────────────────────
export default function HangoutsScreen() {
const { session } = useAuth();
const userId = session?.user?.id ?? '';

const [view, setView]             = useState<ViewType>('list');
const [summaries, setSummaries]   = useState<HangoutSummary[]>([]);
const [loadingList, setLoadingList] = useState(true);
const [selectedId, setSelectedId] = useState<string | null>(null);

useEffect(() => {
if (!userId) return;
loadSummaries();
}, [userId]);

async function loadSummaries() {
setLoadingList(true);
try {
const { data: memberRows, error: memberError } = await supabase
.from('event_members')
.select('event_id')
.eq('user_id', userId);
if (memberError) throw memberError;


  const eventIds = (memberRows ?? []).map((r: any) => r.event_id);
  if (eventIds.length === 0) { setSummaries([]); return; }

  const { data: eventRows, error: eventError } = await supabase
    .from('events')
    // TODO (backend): add `activity` to this select once column exists
    .select('id, title, description, start_time, group_id, confirmed')
    .in('id', eventIds)
    .order('start_time', { ascending: true });
  if (eventError) throw eventError;

  const { data: countRows } = await supabase
    .from('event_members')
    .select('event_id')
    .in('event_id', eventIds);

  const countMap: Record<string, number> = {};
  (countRows ?? []).forEach((r: any) => {
    countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
  });

  setSummaries((eventRows ?? []).map((r: any) => ({
    id:            r.id,
    groupId:       r.group_id ?? '',
    emoji:         r.description?.split(' ')[0] ?? '🎉',
    name:          r.title,
    date:          r.start_time ? new Date(r.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
    time:          r.start_time ? new Date(r.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
    confirmed:     r.confirmed ?? false,
    attendeeCount: countMap[r.id] ?? 1,
    // TODO (backend): replace with `!r.activity` once activity column exists
    isOpen:        true,
  })));
} catch (err: any) {
  Alert.alert('Error loading hangouts', err.message ?? 'Unknown error');
} finally {
  setLoadingList(false);
}


}

function handleSelect(id: string) {
setSelectedId(id);
setView('detail');
}

function handleCreated(id: string) {
loadSummaries();
setSelectedId(id);
setView('detail');
}

return (
<View style={root.container}>
<StatusBar style="light" />
<HangoutHeader />


  {view === 'list' && (
    <HangoutsList
      summaries={summaries}
      loading={loadingList}
      onSelect={handleSelect}
      onCreateNew={() => setView('create')}
    />
  )}

  {view === 'create' && (
    <CreateHangoutForm
      userId={userId}
      onBack={() => setView('list')}
      onCreate={handleCreated}
    />
  )}

  {view === 'detail' && selectedId && (
    <HangoutDetail
      eventId={selectedId}
      userId={userId}
      onBack={() => { setView('list'); loadSummaries(); }}
    />
  )}
</View>


);
}

// ── Hangouts List ─────────────────────────────────────────────
function HangoutsList({
summaries,
loading,
onSelect,
onCreateNew,
}: {
summaries: HangoutSummary[];
loading: boolean;
onSelect: (id: string) => void;
onCreateNew: () => void;
}) {
return (
<ScrollView style={{ flex: 1 }} contentContainerStyle={hl.content} showsVerticalScrollIndicator={false}>
<View style={hl.topRow}>
<Text style={hl.heading}>Hangouts</Text>
<TouchableOpacity style={hl.createBtn} onPress={onCreateNew} activeOpacity={0.8}>
<Text style={hl.createBtnText}>＋ Create</Text>
</TouchableOpacity>
</View>


  {loading ? (
    <View style={hl.emptyState}>
      <ActivityIndicator color={THEME.purpleLight} size="large" />
      <Text style={{ color: THEME.textMuted, marginTop: 12 }}>Loading hangouts...</Text>
    </View>
  ) : summaries.length === 0 ? (
    <View style={hl.emptyState}>
      <Text style={hl.emptyEmoji}>🌙</Text>
      <Text style={hl.emptyTitle}>No hangouts yet</Text>
      <Text style={hl.emptySub}>Tap Create to start planning one</Text>
    </View>
  ) : (
    summaries.map(ev => (
      <TouchableOpacity key={ev.id} style={hl.card} onPress={() => onSelect(ev.id)} activeOpacity={0.8}>
        <View style={hl.cardLeft}>
          <Text style={hl.cardEmoji}>{ev.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={hl.cardNameRow}>
              <Text style={hl.cardName}>{ev.name}</Text>
              {/* Open / Planned badge */}
              <View style={[hl.typeBadge, ev.isOpen ? hl.typeBadgeOpen : hl.typeBadgePlanned]}>
                <Text style={[hl.typeBadgeText, ev.isOpen ? hl.typeBadgeTextOpen : hl.typeBadgeTextPlanned]}>
                  {ev.isOpen ? '🌀 Open' : '🎯 Planned'}
                </Text>
              </View>
            </View>
            <Text style={hl.cardDate}>📅 {ev.date} · 🕐 {ev.time}</Text>
            <Text style={hl.cardAttendees}>👥 {ev.attendeeCount} {ev.attendeeCount === 1 ? 'person' : 'people'}</Text>
          </View>
        </View>
        <View style={hl.cardRight}>
          {ev.confirmed
            ? <View style={hl.confirmedBadge}><Text style={hl.confirmedText}>Confirmed ✓</Text></View>
            : <View style={hl.pendingBadge}><Text style={hl.pendingText}>Planning</Text></View>
          }
          <Text style={hl.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    ))
  )}
  <View style={{ height: 40 }} />
</ScrollView>


);
}

const hl = StyleSheet.create({
content:   { padding: GUTTER, paddingTop: 12 },
topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
heading:   { fontSize: 26, fontWeight: '800', color: THEME.text, letterSpacing: -0.5 },
createBtn: { backgroundColor: THEME.gold, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
createBtnText: { color: '#1a1333', fontWeight: '800', fontSize: 14 },
emptyState: { alignItems: 'center', paddingTop: 80 },
emptyEmoji: { fontSize: 56, marginBottom: 16 },
emptyTitle: { fontSize: 20, fontWeight: '700', color: THEME.text, marginBottom: 6 },
emptySub:   { fontSize: 14, color: THEME.textMuted },
card: {
flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
backgroundColor: THEME.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.cardBorder,
padding: 16, marginBottom: 12,
},
cardLeft:      { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
cardEmoji:     { fontSize: 36 },
cardNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
cardName:      { fontSize: 17, fontWeight: '700', color: THEME.text },
cardDate:      { fontSize: 12, color: THEME.textMuted, marginBottom: 3 },
cardAttendees: { fontSize: 12, color: THEME.textMuted },
cardRight:     { alignItems: 'flex-end', gap: 6 },

typeBadge: {
borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
borderWidth: 1,
},
typeBadgeOpen:        { backgroundColor: THEME.purpleDim, borderColor: 'rgba(139,92,246,0.35)' },
typeBadgePlanned:     { backgroundColor: THEME.goldDim, borderColor: 'rgba(250,204,21,0.35)' },
typeBadgeText:        { fontSize: 10, fontWeight: '700' },
typeBadgeTextOpen:    { color: THEME.purpleLight },
typeBadgeTextPlanned: { color: THEME.gold },

confirmedBadge: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
confirmedText:  { fontSize: 11, fontWeight: '700', color: THEME.green },
pendingBadge:   { backgroundColor: THEME.purpleDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
pendingText:    { fontSize: 11, fontWeight: '700', color: THEME.purpleLight },
chevron:        { fontSize: 22, color: THEME.textMuted },
});

// ── Create Hangout Form ───────────────────────────────────────
function CreateHangoutForm({
userId,
onBack,
onCreate,
}: {
userId: string;
onBack: () => void;
onCreate: (eventId: string) => void;
}) {
const [name, setName]         = useState('');
const [emoji, setEmoji]       = useState('🎉');
const [activity, setActivity] = useState(''); // empty = Open hangout, filled = Planned hangout
const [eventDate, setEventDate] = useState<Date | null>(null);
const [showDatePicker, setShowDatePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);
const [saving, setSaving]     = useState(false);

const EMOJI_OPTIONS = ['🎉','🎮','🍕','🎬','🏖️','🎤','🍻','🏀'];

// Derived: if activity is filled in, this is a Planned hangout
const isPlanned = activity.trim().length > 0;

function formatDate(d: Date | null) {
if (!d) return 'Select a date';
return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function formatTime(d: Date | null) {
if (!d) return 'Select a time';
return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function handleDateChange(_e: any, sel?: Date) {
setShowDatePicker(false);
if (!sel) return;
setEventDate(prev => {
const base = prev ?? new Date();
const next = new Date(base);
next.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate());
return next;
});
}

function handleTimeChange(_e: any, sel?: Date) {
if (!sel) return;
setEventDate(prev => {
const base = prev ?? new Date();
const next = new Date(base);
next.setHours(sel.getHours(), sel.getMinutes(), 0, 0);
return next;
});
}

async function handleCreate() {
if (!name.trim() || !userId || !eventDate) return;
setSaving(true);
try {
const { data: groupData, error: gErr } = await supabase
.from('groups')
.insert({ name: name.trim(), description: `${emoji} ${name.trim()}`, owner_id: userId })
.select('id').single();
if (gErr) throw gErr;


  await supabase.from('group_members').insert({ group_id: groupData.id, user_id: userId });

  const { data: eventData, error: eErr } = await supabase
    .from('events')
    .insert({
      title:          name.trim(),
      creator_id:     userId,
      group_id:       groupData.id,
      start_time:     eventDate.toISOString(),
      description:    `${emoji} ${name.trim()}`,
      is_group_event: true,
      // TODO (backend): uncomment once `activity` column added to events table
      // activity: activity.trim() || null,
    })
    .select('id').single();
  if (eErr) throw eErr;

  await supabase.from('event_members').insert({
    event_id: eventData.id, user_id: userId, role: 'creator', rsvp_status: 'accepted',
  });

  onCreate(eventData.id);
} catch (err: any) {
  Alert.alert('Error creating hangout', err.message ?? 'Unknown error');
} finally {
  setSaving(false);
}


}

return (
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
<ScrollView contentContainerStyle={cf.content} showsVerticalScrollIndicator={false}>
<TouchableOpacity style={cf.backBtn} onPress={onBack}>
<Text style={cf.backBtnText}>← Back</Text>
</TouchableOpacity>
<Text style={cf.heading}>Create a Hangout</Text>


    {/* Hangout type indicator */}
    <View style={[cf.typeBanner, isPlanned ? cf.typeBannerPlanned : cf.typeBannerOpen]}>
      <Text style={[cf.typeBannerText, isPlanned ? cf.typeBannerTextPlanned : cf.typeBannerTextOpen]}>
        {isPlanned
          ? '🎯 Planned hangout — activity is set'
          : '🌀 Open hangout — activity TBD, crew can vote on suggestions'}
      </Text>
    </View>

    <Text style={cf.label}>PICK A VIBE</Text>
    <View style={cf.emojiRow}>
      {EMOJI_OPTIONS.map(e => (
        <TouchableOpacity key={e} style={[cf.emojiBtn, emoji === e && cf.emojiBtnActive]} onPress={() => setEmoji(e)}>
          <Text style={cf.emojiOption}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={cf.label}>HANGOUT NAME</Text>
    <TextInput
      style={cf.input}
      placeholder="e.g. Game Night"
      placeholderTextColor={THEME.textMuted}
      value={name}
      onChangeText={setName}
    />

    {/* Activity field — optional. Filling this makes it a Planned hangout */}
    <Text style={cf.label}>
      ACTIVITY <Text style={cf.labelOptional}>(optional — leave blank to let the crew decide)</Text>
    </Text>
    <TextInput
      style={cf.input}
      placeholder="e.g. Bowling, Movie Night, Beach..."
      placeholderTextColor={THEME.textMuted}
      value={activity}
      onChangeText={setActivity}
    />

    <Text style={cf.label}>DATE</Text>
    <TouchableOpacity style={cf.input} onPress={() => setShowDatePicker(true)}>
      <Text style={{ color: eventDate ? THEME.text : THEME.textMuted }}>{formatDate(eventDate)}</Text>
    </TouchableOpacity>
    {showDatePicker && (
      <DateTimePicker value={eventDate ?? new Date()} mode="date" display="inline" minimumDate={new Date()} onChange={handleDateChange} />
    )}

    <Text style={cf.label}>TIME</Text>
    <TouchableOpacity style={cf.input} onPress={() => setShowTimePicker(true)}>
      <Text style={{ color: eventDate ? THEME.text : THEME.textMuted }}>{formatTime(eventDate)}</Text>
    </TouchableOpacity>
    {showTimePicker && (
      <>
        <DateTimePicker value={eventDate ?? new Date()} mode="time" display="spinner" onChange={handleTimeChange} />
        <TouchableOpacity style={cf.doneBtn} onPress={() => setShowTimePicker(false)}>
          <Text style={{ color: THEME.textMuted }}>Done</Text>
        </TouchableOpacity>
      </>
    )}

    <TouchableOpacity
      style={[cf.createBtn, (!name.trim() || !eventDate || saving) && cf.createBtnDisabled]}
      onPress={handleCreate}
      disabled={!name.trim() || !eventDate || saving}
    >
      {saving
        ? <ActivityIndicator color="#1a1333" />
        : <Text style={cf.createBtnText}>Create Hangout {isPlanned ? '🎯' : '🌀'}</Text>
      }
    </TouchableOpacity>
    <View style={{ height: 40 }} />
  </ScrollView>
</KeyboardAvoidingView>


);
}

const cf = StyleSheet.create({
content:           { padding: GUTTER, paddingTop: 16 },
backBtn:           { marginBottom: 20 },
backBtnText:       { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },
heading:           { fontSize: 26, fontWeight: '800', color: THEME.text, marginBottom: 20, letterSpacing: -0.5 },

typeBanner: {
borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24,
},
typeBannerOpen:        { backgroundColor: THEME.purpleDim, borderColor: 'rgba(139,92,246,0.3)' },
typeBannerPlanned:     { backgroundColor: THEME.goldDim, borderColor: 'rgba(250,204,21,0.35)' },
typeBannerText:        { fontSize: 13, fontWeight: '600', lineHeight: 18 },
typeBannerTextOpen:    { color: THEME.purpleLight },
typeBannerTextPlanned: { color: THEME.gold },

label:         { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 8 },
labelOptional: { fontSize: 10, fontWeight: '400', letterSpacing: 0, color: THEME.textMuted, textTransform: 'none' },

emojiRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
emojiBtn:       { width: 48, height: 48, borderRadius: 14, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
emojiBtnActive: { borderColor: THEME.gold, backgroundColor: THEME.goldDim },
emojiOption:    { fontSize: 24 },

input:            { backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder, color: THEME.text, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20, fontSize: 15 },
doneBtn:          { alignSelf: 'flex-start', backgroundColor: THEME.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, borderWidth: 1, borderColor: THEME.cardBorder },
createBtn:        { backgroundColor: THEME.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
createBtnDisabled:{ opacity: 0.4 },
createBtnText:    { color: '#1a1333', fontWeight: '800', fontSize: 16 },
});

// ── Hangout Detail ────────────────────────────────────────────
function HangoutDetail({
eventId,
userId,
onBack,
}: {
eventId: string;
userId: string;
onBack: () => void;
}) {
const [event, setEvent]             = useState<EventDetail | null>(null);
const [attendees, setAttendees]     = useState<Attendee[]>([]);
const [items, setItems]             = useState<EventItem[]>([]);
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [loading, setLoading]         = useState(true);
const [saving, setSaving]           = useState(false);
const [editMode, setEditMode]       = useState(false);
const [activeTab, setActiveTab]     = useState<DetailTab>('details');
const [newFood, setNewFood]         = useState('');
const [newMisc, setNewMisc]         = useState('');
const [newSuggestion, setNewSuggestion] = useState('');

useEffect(() => { loadAll(); }, [eventId]);

async function loadAll() {
setLoading(true);
try {
await Promise.all([loadEvent(), loadAttendees(), loadItems(), loadSuggestions()]);
} catch (err: any) {
Alert.alert('Error loading hangout', err.message ?? 'Unknown error');
} finally {
setLoading(false);
}
}

async function loadEvent() {
const { data, error } = await supabase
.from('events')
// TODO (backend): add `activity, creator_id` to this select once columns exist
.select('id, title, description, start_time, group_id, confirmed, outfit, playlist, location_name, location_address, latitude, longitude, parking_name, parking_addr, parking_info, creator_id')
.eq('id', eventId)
.single();
if (error) throw error;
setEvent({
id:           data.id,
groupId:      data.group_id ?? '',
emoji:        data.description?.split(' ')[0] ?? '🎉',
name:         data.title,
date:         data.start_time ? new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
time:         data.start_time ? new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
confirmed:    data.confirmed ?? false,
outfit:       data.outfit ?? 'Whatever',
playlist:     data.playlist ?? '',
locationName: data.location_name ?? '',
locationAddr: data.location_address ?? '',
locationLat:  data.latitude ?? null,
locationLon:  data.longitude ?? null,
parkingName:  data.parking_name ?? '',
parkingAddr:  data.parking_addr ?? '',
parkingNotes: data.parking_info ?? '',
// TODO (backend): replace '' with data.activity ?? '' once column exists
activity:     '',
creatorId:    data.creator_id ?? '',
});
}

async function loadAttendees() {
const { data, error } = await supabase
.from('event_members')
.select('user_id, rsvp_status, users(username)')
.eq('event_id', eventId);
if (error) throw error;
setAttendees((data ?? []).map((r: any, i: number) => ({
id:    r.user_id,
name:  r.user_id === userId ? 'You' : (r.users?.username ?? 'Unknown'),
color: ATTENDEE_COLORS[i % ATTENDEE_COLORS.length],
rsvp:  r.rsvp_status,
})));
}

async function loadItems() {
const { data, error } = await supabase
.from('event_items')
.select('id, item_name, category, status, user_id, notes, users(username)')
.eq('event_id', eventId)
.order('created_at', { ascending: true });
if (error) throw error;
setItems((data ?? []).map((r: any) => ({
id:          r.id,
name:        r.item_name,
category:    r.category,
status:      r.status,
claimedBy:   r.user_id === userId ? 'YOU' : (r.users?.username ?? null),
claimedById: r.user_id,
notes:       r.notes ?? '',
})));
}

async function loadSuggestions() {
const { data, error } = await supabase
.from('event_suggestions')
// TODO (backend): add `votes` to this select once column exists on event_suggestions
.select('id, text, status, user_id, users(username)')
.eq('event_id', eventId)
.order('created_at', { ascending: true });
if (error) throw error;
setSuggestions((data ?? []).map((r: any) => ({
id:       r.id,
fromId:   r.user_id,
fromName: r.user_id === userId ? 'You' : (r.users?.username ?? 'Someone'),
text:     r.text,
status:   r.status,
// TODO (backend): replace 0 with r.votes once column exists
votes:    0,
})));
}

async function handleSaveEdits() {
if (!event) return;
setSaving(true);
try {
const { error } = await supabase.from('events').update({
title:            event.name,
outfit:           event.outfit,
playlist:         event.playlist,
location_name:    event.locationName,
location_address: event.locationAddr,
latitude:         event.locationLat,
longitude:        event.locationLon,
parking_name:     event.parkingName,
parking_addr:     event.parkingAddr,
parking_info:     event.parkingNotes,
// TODO (backend): uncomment once activity column exists
// activity: event.activity || null,
}).eq('id', eventId);
if (error) throw error;
setEditMode(false);
} catch (err: any) {
Alert.alert('Error saving', err.message ?? 'Unknown error');
} finally {
setSaving(false);
}
}

async function handleConfirm() {
setSaving(true);
try {
const { error } = await supabase.from('events').update({ confirmed: true }).eq('id', eventId);
if (error) throw error;
setEvent(prev => prev ? { ...prev, confirmed: true } : prev);
} catch (err: any) {
Alert.alert('Error confirming', err.message ?? 'Unknown error');
} finally {
setSaving(false);
}
}

async function addItem(category: 'food_drink' | 'misc', name: string) {
if (!name.trim()) return;
try {
const { data, error } = await supabase
.from('event_items')
.insert({ event_id: eventId, user_id: userId, category, item_name: name.trim(), status: 'bringing' })
.select('id, item_name, category, status, user_id, notes').single();
if (error) throw error;
setItems(prev => [...prev, { id: data.id, name: data.item_name, category: data.category, status: data.status, claimedBy: 'YOU', claimedById: userId, notes: '' }]);
if (category === 'food_drink') setNewFood(''); else setNewMisc('');
} catch (err: any) {
Alert.alert('Error adding item', err.message ?? 'Unknown error');
}
}

async function removeItem(itemId: string) {
try {
const { error } = await supabase.from('event_items').delete().eq('id', itemId);
if (error) throw error;
setItems(prev => prev.filter(i => i.id !== itemId));
} catch (err: any) {
Alert.alert('Error removing item', err.message ?? 'Unknown error');
}
}

async function toggleClaim(item: EventItem) {
if (item.claimedById && item.claimedById !== userId) return;
const isMine = item.claimedById === userId;
try {
const { error } = await supabase.from('event_items')
.update({ user_id: isMine ? null : userId, status: isMine ? 'bringing' : 'claimed' })
.eq('id', item.id);
if (error) throw error;
setItems(prev => prev.map(i => i.id === item.id
? { ...i, claimedBy: isMine ? null : 'YOU', claimedById: isMine ? null : userId, status: isMine ? 'bringing' : 'claimed' }
: i));
} catch (err: any) {
Alert.alert('Error updating item', err.message ?? 'Unknown error');
}
}

async function addSuggestion() {
if (!newSuggestion.trim()) return;
try {
const { data, error } = await supabase
.from('event_suggestions')
.insert({ event_id: eventId, user_id: userId, text: newSuggestion.trim() })
.select('id, text, status').single();
if (error) throw error;
setSuggestions(prev => [...prev, {
id: data.id, fromId: userId, fromName: 'You',
text: data.text, status: 'pending', votes: 0,
}]);
setNewSuggestion('');
} catch (err: any) {
Alert.alert('Error adding suggestion', err.message ?? 'Unknown error');
}
}

async function updateSuggestionStatus(suggId: string, status: 'accepted' | 'declined') {
try {
const { error } = await supabase.from('event_suggestions').update({ status }).eq('id', suggId);
if (error) throw error;
setSuggestions(prev => prev.map(s => s.id === suggId ? { ...s, status } : s));
} catch (err: any) {
Alert.alert('Error updating suggestion', err.message ?? 'Unknown error');
}
}

// ── Upvote (optimistic local only until backend column exists) ──
function handleUpvote(suggId: string) {
// TODO (backend): once `votes` int column exists on event_suggestions,
// call: supabase.from('event_suggestions').update({ votes: s.votes + 1 }).eq('id', suggId)
// For now this is purely local / optimistic state.
setSuggestions(prev => prev.map(s =>
s.id === suggId ? { ...s, votes: s.votes + 1 } : s
));
}

// ── Promote suggestion to event activity (host only) ──
async function handlePromote(sugg: Suggestion) {
try {
// TODO (backend): once `activity` column exists on events, uncomment:
// await supabase.from('events').update({ activity: sugg.text }).eq('id', eventId);
// Mark suggestion as accepted
await updateSuggestionStatus(sugg.id, 'accepted');
// Update local event state so UI flips to Planned immediately
setEvent(prev => prev ? { ...prev, activity: sugg.text } : prev);
Alert.alert('Activity set! 🎯', `"${sugg.text}" is now the plan.`);
} catch (err: any) {
Alert.alert('Error promoting suggestion', err.message ?? 'Unknown error');
}
}

const isHost = event?.creatorId === userId;
const isOpen = !event?.activity;

// Top-voted pending suggestion (for promote button)
const topSuggestion = suggestions
.filter(s => s.status === 'pending')
.sort((a, b) => b.votes - a.votes)[0] ?? null;

const daysUntil: number = (() => {
if (!event) return 0;
const d = new Date(event.date);
const t = new Date();
t.setHours(0, 0, 0, 0);
d.setHours(0, 0, 0, 0);
return Math.max(0, Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24)));
})();

const foodItems = items.filter(i => i.category === 'food_drink');
const miscItems = items.filter(i => i.category === 'misc');
const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;

if (loading) {
return (
<View style={[ed.container, { alignItems: 'center', justifyContent: 'center' }]}>
<ActivityIndicator color={THEME.purpleLight} size="large" />
<Text style={{ color: THEME.textMuted, marginTop: 12 }}>Loading hangout...</Text>
</View>
);
}

if (!event) return null;

return (
<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
{/* Tab bar */}
<View style={ed.tabBar}>
<TouchableOpacity style={ed.backBtn} onPress={onBack}>
<Text style={ed.backBtnText}>← All</Text>
</TouchableOpacity>
<View style={ed.tabs}>
<TouchableOpacity style={[ed.tab, activeTab === 'details' && ed.tabActive]} onPress={() => setActiveTab('details')}>
<Text style={[ed.tabText, activeTab === 'details' && ed.tabTextActive]}>Details</Text>
</TouchableOpacity>
<TouchableOpacity style={[ed.tab, activeTab === 'suggestions' && ed.tabActive]} onPress={() => setActiveTab('suggestions')}>
<Text style={[ed.tabText, activeTab === 'suggestions' && ed.tabTextActive]}>
{isOpen ? '💬 Suggestions' : '✏️ Suggest Changes'}
{pendingSuggestions > 0 ? ` (${pendingSuggestions})` : ''}
</Text>
</TouchableOpacity>
</View>
<TouchableOpacity
style={[ed.editBtn, editMode && ed.editBtnActive]}
onPress={() => { if (editMode) handleSaveEdits(); else setEditMode(true); }}
>
{saving
? <ActivityIndicator size="small" color="#1a1333" />
: <Text style={[ed.editBtnText, editMode && ed.editBtnTextActive]}>{editMode ? 'Save' : '✏️'}</Text>
}
</TouchableOpacity>
</View>


  {/* Details tab */}
  {activeTab === 'details' && (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={ed.header}>
        <Text style={ed.emoji}>{event.emoji}</Text>
        <View style={{ flex: 1 }}>
          {editMode
            ? <TextInput style={ed.nameInput} value={event.name} onChangeText={v => setEvent(p => p ? { ...p, name: v } : p)} placeholderTextColor={THEME.textMuted} />
            : <Text style={ed.eventName}>{event.name}</Text>
          }
          <View style={ed.metaRow}>
            <View style={ed.metaChip}><Text style={ed.metaChipText}>📅 {event.date}</Text></View>
            <View style={ed.metaChip}><Text style={ed.metaChipText}>🕐 {event.time}</Text></View>
            {event.confirmed && <View style={ed.confirmedChip}><Text style={ed.confirmedChipText}>✓ Confirmed</Text></View>}
            {/* Open / Planned badge */}
            <View style={[ed.typeChip, isOpen ? ed.typeChipOpen : ed.typeChipPlanned]}>
              <Text style={[ed.typeChipText, isOpen ? ed.typeChipTextOpen : ed.typeChipTextPlanned]}>
                {isOpen ? '🌀 Open' : '🎯 Planned'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Activity banner — shown when activity is set */}
      {!isOpen && (
        <View style={ed.activityBanner}>
          <Text style={ed.activityLabel}>ACTIVITY</Text>
          {editMode ? (
            <TextInput
              style={ed.activityInput}
              value={event.activity}
              onChangeText={v => setEvent(p => p ? { ...p, activity: v } : p)}
              placeholder="What are you doing?"
              placeholderTextColor={THEME.textMuted}
            />
          ) : (
            <Text style={ed.activityText}>{event.activity}</Text>
          )}
        </View>
      )}

      {/* Countdown */}
      {!event.confirmed && (
        <View style={ed.countdown}>
          <View>
            <Text style={ed.countdownLabel}>Almost time...</Text>
            <Text style={ed.countdownNum}>{daysUntil} day{daysUntil !== 1 ? 's' : ''} until</Text>
            <Text style={ed.countdownEvent}>{event.name} hangout</Text>
          </View>
          <Text style={ed.countdownMoon}>🌙</Text>
        </View>
      )}

      {/* Who's coming */}
      <Section label="WHO'S COMING">
        <View style={ed.attendeeRow}>
          {attendees.map(a => (
            <View key={a.id} style={[ed.attendeeChip, { borderColor: a.color + '60' }]}>
              <View style={[ed.attendeeAvatar, { backgroundColor: a.color + '33' }]}>
                <Text style={[ed.attendeeInitial, { color: a.color }]}>{a.name[0]}</Text>
              </View>
              <View>
                <Text style={ed.attendeeName}>{a.name}</Text>
                <Text style={ed.attendeeRsvp}>{a.rsvp}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      {/* Invite */}
      <Section label="INVITE PEOPLE">
        <InviteSection
          eventId={event.id}
          eventName={event.name}
          groupId={event.groupId}
          currentUserId={userId}
          currentAttendees={attendees}
          onInvited={(user) => setAttendees(prev => [...prev, {
            id: user.id, name: user.username,
            color: ATTENDEE_COLORS[prev.length % ATTENDEE_COLORS.length],
            rsvp: 'pending',
          }])}
        />
      </Section>

      {/* Outfit vibes */}
      <Section label="OUTFIT VIBES">
        <View style={ed.chipRow}>
          {OUTFIT_VIBES.map(v => (
            <TouchableOpacity key={v} style={[ed.vibeChip, event.outfit === v && ed.vibeChipActive]} onPress={() => editMode && setEvent(p => p ? { ...p, outfit: v } : p)} activeOpacity={editMode ? 0.7 : 1}>
              <Text style={[ed.vibeChipText, event.outfit === v && ed.vibeChipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Music */}
      <Section label="MUSIC">
        <View style={ed.musicCard}>
          <Text style={ed.musicIcon}>🎵</Text>
          <View style={{ flex: 1 }}>
            {editMode
              ? <TextInput style={ed.inlineInput} value={event.playlist} onChangeText={v => setEvent(p => p ? { ...p, playlist: v } : p)} placeholder="Paste playlist link or name" placeholderTextColor={THEME.textMuted} />
              : <><Text style={ed.musicTitle}>{event.playlist || 'No playlist added'}</Text><Text style={ed.musicSub}>Tap to open playlist</Text></>
            }
          </View>
        </View>
      </Section>

      {/* Food */}
      <Section label="FOOD & DRINKS">
        {foodItems.map(item => (
          <ItemRow key={item.id} item={item} userId={userId} onClaim={() => toggleClaim(item)} onRemove={editMode ? () => removeItem(item.id) : undefined} />
        ))}
        <AddRow value={newFood} onChange={setNewFood} onAdd={() => addItem('food_drink', newFood)} placeholder="Add food or drink..." />
      </Section>

      {/* Misc */}
      <Section label="MISC SUPPLIES">
        {miscItems.map(item => (
          <ItemRow key={item.id} item={item} userId={userId} onClaim={() => toggleClaim(item)} onRemove={editMode ? () => removeItem(item.id) : undefined} />
        ))}
        <AddRow value={newMisc} onChange={setNewMisc} onAdd={() => addItem('misc', newMisc)} placeholder="Add a supply..." />
      </Section>

      {/* Location */}
      <Section label="LOCATION">
        <View style={ed.locationCard}>
          <Text style={ed.locationIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            {editMode ? (
              <LocationAutocomplete onSelect={({ name, address, latitude, longitude }) =>
                setEvent(p => p ? { ...p, locationName: name, locationAddr: address, locationLat: latitude, locationLon: longitude } : p)
              } />
            ) : (
              <>
                <Text style={ed.locationName}>{event.locationName || 'No location set'}</Text>
                {event.locationAddr ? <Text style={ed.locationAddr}>{event.locationAddr}</Text> : null}
              </>
            )}
          </View>
        </View>
      </Section>

      {/* Parking */}
      <Section label="PARKING">
        <View style={ed.locationCard}>
          <Text style={ed.locationIcon}>🅿️</Text>
          <View style={{ flex: 1 }}>
            {editMode ? (
              <>
                <LocationAutocomplete onSelect={({ name, address }) =>
                  setEvent(p => p ? { ...p, parkingName: name, parkingAddr: address } : p)
                } />
                <TextInput style={[ed.parkingNotesInput, { marginTop: 8 }]} value={event.parkingNotes} onChangeText={v => setEvent(p => p ? { ...p, parkingNotes: v } : p)} placeholder="Notes (free after 5pm, etc.)" placeholderTextColor={THEME.textMuted} multiline numberOfLines={3} />
              </>
            ) : (
              <>
                <Text style={ed.locationName}>{event.parkingName || 'No parking info'}</Text>
                {event.parkingNotes ? <Text style={ed.locationAddr}>{event.parkingNotes}</Text> : null}
              </>
            )}
          </View>
        </View>
      </Section>

      {/* Confirm */}
      {!event.confirmed && (
        <TouchableOpacity style={ed.confirmBtn} onPress={handleConfirm} disabled={saving}>
          <Text style={ed.confirmBtnText}>Confirm Hangout ✓</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )}

  {/* Suggestions tab */}
  {activeTab === 'suggestions' && (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Context blurb */}
      <Text style={sg.intro}>
        {isOpen
          ? "No activity set yet — drop ideas below. The crew can upvote and the host can lock one in as the plan."
          : `Current plan: "${event.activity}". Suggest changes below if something better comes up.`
        }
      </Text>

      {/* Host promote banner — shown when there's a top-voted suggestion */}
      {isHost && topSuggestion && topSuggestion.votes > 0 && (
        <View style={sg.promoteBanner}>
          <View style={{ flex: 1 }}>
            <Text style={sg.promoteBannerLabel}>TOP SUGGESTION</Text>
            <Text style={sg.promoteBannerText} numberOfLines={2}>"{topSuggestion.text}"</Text>
            <Text style={sg.promoteBannerVotes}>{topSuggestion.votes} vote{topSuggestion.votes !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={sg.promoteBtn} onPress={() => handlePromote(topSuggestion)} activeOpacity={0.8}>
            <Text style={sg.promoteBtnText}>Make this{'\n'}the plan 🎯</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add suggestion input */}
      <View style={sg.addRow}>
        <TextInput
          style={sg.addInput}
          value={newSuggestion}
          onChangeText={setNewSuggestion}
          placeholder={isOpen ? "Drop an idea..." : "Suggest a change..."}
          placeholderTextColor={THEME.textMuted}
          onSubmitEditing={addSuggestion}
          returnKeyType="send"
        />
        <TouchableOpacity style={sg.addBtn} onPress={addSuggestion}>
          <Text style={sg.addBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      {suggestions.length === 0 ? (
        <View style={sg.emptyState}>
          <Text style={sg.emptyEmoji}>💬</Text>
          <Text style={sg.emptyTitle}>No suggestions yet</Text>
          <Text style={sg.emptySub}>Be the first to drop an idea above</Text>
        </View>
      ) : (
        suggestions.map(s => (
          <View key={s.id} style={[
            sg.card,
            s.status === 'accepted' && sg.cardAccepted,
            s.status === 'declined' && sg.cardDeclined,
            topSuggestion?.id === s.id && s.status === 'pending' && sg.cardTop,
          ]}>
            <View style={sg.cardHeader}>
              <View style={sg.fromBadge}><Text style={sg.fromText}>{s.fromName[0]}</Text></View>
              <Text style={sg.fromName}>{s.fromName} suggested</Text>
              {s.status !== 'pending' && (
                <View style={[sg.statusBadge, s.status === 'accepted' ? sg.statusAccepted : sg.statusDeclined]}>
                  <Text style={sg.statusText}>{s.status === 'accepted' ? 'Accepted ✓' : 'Passed'}</Text>
                </View>
              )}
              {topSuggestion?.id === s.id && s.status === 'pending' && s.votes > 0 && (
                <View style={sg.topBadge}><Text style={sg.topBadgeText}>🔥 Top</Text></View>
              )}
            </View>

            <Text style={sg.suggestionText}>{s.text}</Text>

            {s.status === 'pending' && (
              <View style={sg.actionRow}>
                {/* Upvote button — anyone can vote */}
                <TouchableOpacity
                  style={sg.upvoteBtn}
                  onPress={() => handleUpvote(s.id)}
                  activeOpacity={0.7}
                >
                  <Text style={sg.upvoteBtnText}>👍 {s.votes > 0 ? s.votes : ''}</Text>
                </TouchableOpacity>

                {/* Accept / Decline — only for non-own suggestions, non-host */}
                {s.fromId !== userId && !isHost && (
                  <>
                    <TouchableOpacity style={sg.acceptBtn} onPress={() => updateSuggestionStatus(s.id, 'accepted')}>
                      <Text style={sg.acceptBtnText}>Sounds good 👍</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={sg.declineBtn} onPress={() => updateSuggestionStatus(s.id, 'declined')}>
                      <Text style={sg.declineBtnText}>Pass</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Host-only: promote this specific suggestion inline */}
                {isHost && (
                  <TouchableOpacity style={sg.promoteInlineBtn} onPress={() => handlePromote(s)} activeOpacity={0.8}>
                    <Text style={sg.promoteInlineBtnText}>Make the plan →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )}
</KeyboardAvoidingView>


);
}

// ── Shared sub-components ─────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
return (
<View style={ed.section}>
<Text style={ed.sectionLabel}>{label}</Text>
{children}
</View>
);
}

function ItemRow({ item, userId, onClaim, onRemove }: { item: EventItem; userId: string; onClaim: () => void; onRemove?: () => void }) {
const isYou   = item.claimedById === userId;
const isOther = item.claimedById && !isYou;
return (
<View style={ed.listRow}>
<Text style={ed.listItemName}>{item.name}</Text>
<View style={ed.listRowRight}>
{onRemove && <TouchableOpacity style={ed.removeBtn} onPress={onRemove}><Text style={ed.removeBtnText}>✕</Text></TouchableOpacity>}
<TouchableOpacity style={[ed.claimBtn, isYou && ed.claimBtnYou, isOther && ed.claimBtnOther]} onPress={onClaim} disabled={!!isOther}>
<Text style={[ed.claimBtnText, isYou && ed.claimBtnTextYou, isOther && ed.claimBtnTextOther]}>
{isYou ? 'YOU ✓' : isOther ? item.claimedBy : 'Claim'}
</Text>
</TouchableOpacity>
</View>
</View>
);
}

function AddRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
return (
<View style={ed.addRow}>
<TextInput style={ed.addInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={THEME.textMuted} onSubmitEditing={onAdd} returnKeyType="done" />
<TouchableOpacity style={ed.addBtn} onPress={onAdd}><Text style={ed.addBtnText}>Add</Text></TouchableOpacity>
</View>
);
}

// ── Styles ────────────────────────────────────────────────────
const ed = StyleSheet.create({
container:     { flex: 1, backgroundColor: THEME.bg },
scrollContent: { paddingBottom: 60 },
tabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)', gap: 8 },
backBtn: {}, backBtnText: { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },
tabs: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
tabActive: { backgroundColor: THEME.purpleDim, borderColor: 'rgba(139,92,246,0.3)' },
tabText: { fontSize: 12, fontWeight: '600', color: THEME.textMuted },
tabTextActive: { color: THEME.purpleLight },
editBtn: { backgroundColor: THEME.purpleDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', minWidth: 52, alignItems: 'center' },
editBtnActive: { backgroundColor: THEME.gold, borderColor: THEME.gold },
editBtnText: { fontSize: 13, color: THEME.purpleLight, fontWeight: '600' },
editBtnTextActive: { color: '#1a1333', fontWeight: '700' },

header: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: GUTTER, paddingBottom: 0 },
emoji: { fontSize: 44, marginTop: 2 },
eventName: { fontSize: 26, fontWeight: '800', color: THEME.text, letterSpacing: -0.5, marginBottom: 8 },
nameInput: { fontSize: 22, fontWeight: '800', color: THEME.text, borderBottomWidth: 1.5, borderBottomColor: THEME.purple, paddingBottom: 4, marginBottom: 8 },
metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
metaChip: { backgroundColor: THEME.purpleDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
metaChipText: { fontSize: 12, fontWeight: '600', color: THEME.textSub },
confirmedChip: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
confirmedChipText: { fontSize: 12, fontWeight: '700', color: THEME.green },
typeChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
typeChipOpen:        { backgroundColor: THEME.purpleDim, borderColor: 'rgba(139,92,246,0.35)' },
typeChipPlanned:     { backgroundColor: THEME.goldDim, borderColor: 'rgba(250,204,21,0.35)' },
typeChipText:        { fontSize: 12, fontWeight: '700' },
typeChipTextOpen:    { color: THEME.purpleLight },
typeChipTextPlanned: { color: THEME.gold },

activityBanner: {
marginHorizontal: GUTTER, marginTop: 14,
backgroundColor: THEME.goldDim, borderRadius: 14,
borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)',
padding: 14,
},
activityLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: THEME.gold, marginBottom: 6 },
activityText:  { fontSize: 16, fontWeight: '700', color: THEME.text },
activityInput: { fontSize: 15, color: THEME.text, borderBottomWidth: 1.5, borderBottomColor: THEME.gold, paddingBottom: 4 },

countdown: { margin: GUTTER, backgroundColor: THEME.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(250,204,21,0.3)', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
countdownLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 4 },
countdownNum: { fontSize: 28, fontWeight: '800', color: THEME.text },
countdownEvent: { fontSize: 15, fontWeight: '700', color: THEME.gold, marginTop: 2 },
countdownMoon: { fontSize: 48 },

section: { marginHorizontal: GUTTER, marginBottom: 20 },
sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 10 },
attendeeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
attendeeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.card, borderRadius: 20, paddingRight: 12, paddingLeft: 4, paddingVertical: 6, borderWidth: 1 },
attendeeAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
attendeeInitial: { fontSize: 12, fontWeight: '700' },
attendeeName: { fontSize: 13, fontWeight: '600', color: THEME.text },
attendeeRsvp: { fontSize: 10, color: THEME.textMuted, textTransform: 'capitalize' },

chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
vibeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.cardBorder },
vibeChipActive: { backgroundColor: THEME.gold, borderColor: THEME.gold },
vibeChipText: { fontSize: 13, fontWeight: '600', color: THEME.textSub },
vibeChipTextActive: { color: '#1a1333', fontWeight: '700' },

musicCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder, padding: 14 },
musicIcon: { fontSize: 22 },
musicTitle: { fontSize: 14, fontWeight: '600', color: THEME.text },
musicSub: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
inlineInput: { fontSize: 14, color: THEME.text, borderBottomWidth: 1, borderBottomColor: THEME.purple, paddingBottom: 2 },
parkingNotesInput: { fontSize: 13, color: THEME.text, backgroundColor: 'rgba(20,16,44,0.5)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 10, lineHeight: 18, textAlignVertical: 'top' },

listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.card, borderRadius: 12, borderWidth: 1, borderColor: THEME.cardBorder, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
listItemName: { fontSize: 14, fontWeight: '500', color: THEME.text, flex: 1 },
listRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
removeBtn: { padding: 4 },
removeBtnText: { fontSize: 12, color: THEME.red, fontWeight: '700' },
claimBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
claimBtnYou: { backgroundColor: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.4)' },
claimBtnOther: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
claimBtnText: { fontSize: 11, fontWeight: '700', color: THEME.purpleLight },
claimBtnTextYou: { color: THEME.gold },
claimBtnTextOther: { color: THEME.green },

addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
addInput: { flex: 1, backgroundColor: 'rgba(30,24,56,0.6)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: THEME.text },
addBtn: { backgroundColor: THEME.purpleDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', justifyContent: 'center' },
addBtnText: { fontSize: 13, fontWeight: '700', color: THEME.purpleLight },

locationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder, padding: 14 },
locationIcon: { fontSize: 20, marginTop: 2 },
locationName: { fontSize: 14, fontWeight: '600', color: THEME.text },
locationAddr: { fontSize: 12, color: THEME.textMuted, marginTop: 3, lineHeight: 17 },

confirmBtn: { marginHorizontal: GUTTER, marginTop: 8, backgroundColor: THEME.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#1a1333' },
});

const sg = StyleSheet.create({
intro: { marginHorizontal: GUTTER, marginTop: 16, marginBottom: 12, fontSize: 13, color: THEME.textMuted, lineHeight: 19 },

promoteBanner: {
marginHorizontal: GUTTER, marginBottom: 16,
flexDirection: 'row', alignItems: 'center', gap: 14,
backgroundColor: THEME.goldDim, borderRadius: 16,
borderWidth: 1.5, borderColor: 'rgba(250,204,21,0.35)',
padding: 16,
},
promoteBannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: THEME.gold, marginBottom: 4 },
promoteBannerText:  { fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 4, lineHeight: 19 },
promoteBannerVotes: { fontSize: 12, color: THEME.textMuted },
promoteBtn: {
backgroundColor: THEME.gold, borderRadius: 12,
paddingHorizontal: 14, paddingVertical: 10,
alignItems: 'center',
},
promoteBtnText: { fontSize: 12, fontWeight: '800', color: '#1a1333', textAlign: 'center', lineHeight: 17 },

addRow: { flexDirection: 'row', gap: 8, marginHorizontal: GUTTER, marginBottom: 16 },
addInput: { flex: 1, backgroundColor: THEME.card, borderRadius: 12, borderWidth: 1, borderColor: THEME.cardBorder, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: THEME.text },
addBtn: { backgroundColor: THEME.purpleDim, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', justifyContent: 'center' },
addBtnText: { fontSize: 13, fontWeight: '700', color: THEME.purpleLight },

emptyState: { alignItems: 'center', paddingTop: 60 },
emptyEmoji: { fontSize: 48, marginBottom: 12 },
emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 6 },
emptySub:   { fontSize: 13, color: THEME.textMuted },

card: { marginHorizontal: GUTTER, marginBottom: 12, backgroundColor: THEME.card, borderRadius: 16, borderWidth: 1, borderColor: THEME.cardBorder, padding: 16 },
cardAccepted: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.06)' },
cardDeclined: { opacity: 0.5 },
cardTop:      { borderColor: 'rgba(250,204,21,0.4)', backgroundColor: 'rgba(250,204,21,0.05)' },

cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
fromBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.purpleDim, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', alignItems: 'center', justifyContent: 'center' },
fromText:  { fontSize: 12, fontWeight: '800', color: THEME.purpleLight },
fromName:  { flex: 1, fontSize: 13, fontWeight: '600', color: THEME.textMuted },

statusBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
statusAccepted: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
statusDeclined: { backgroundColor: THEME.redDim, borderColor: 'rgba(239,68,68,0.3)' },
statusText:     { fontSize: 11, fontWeight: '700', color: THEME.text },

topBadge:     { backgroundColor: THEME.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)' },
topBadgeText: { fontSize: 11, fontWeight: '700', color: THEME.gold },

suggestionText: { fontSize: 14, color: THEME.text, lineHeight: 20, marginBottom: 12 },
actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

upvoteBtn: {
backgroundColor: THEME.purpleDim, borderRadius: 10,
paddingVertical: 8, paddingHorizontal: 14,
borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
alignItems: 'center',
},
upvoteBtnText: { fontSize: 13, fontWeight: '700', color: THEME.purpleLight },

acceptBtn: { flex: 1, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
acceptBtnText: { fontSize: 13, fontWeight: '700', color: THEME.green },
declineBtn: { backgroundColor: THEME.purpleDim, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
declineBtnText: { fontSize: 13, fontWeight: '600', color: THEME.textMuted },

promoteInlineBtn: {
backgroundColor: THEME.goldDim, borderRadius: 10,
paddingVertical: 8, paddingHorizontal: 14,
borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)',
alignItems: 'center',
},
promoteInlineBtnText: { fontSize: 12, fontWeight: '800', color: THEME.gold },
});

const root = StyleSheet.create({
container: { flex: 1, backgroundColor: THEME.bg },
});