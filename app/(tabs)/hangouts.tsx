import HangoutHeader from '@/components/HangoutHeader';
import { InviteSection } from '@/components/InviteSection';
import LocationAutocomplete from '@/components/LocationAutoComplete';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/themeprovider';
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

const GUTTER = 20;
const OUTFIT_VIBES = ['Whatever', 'Comfy / PJs', 'Formal', 'Cosplay', 'Themed', 'Matching'];
const ATTENDEE_COLORS = [
  '#facc15', '#ef4444', '#8b5cf6', '#10b981',
  '#7ec8e3', '#f97316', '#a855f7', '#06b6d4',
];

interface HangoutSummary {
  id: string; groupId: string; emoji: string; name: string;
  date: string; time: string; confirmed: boolean; myRsvp: string;
  attendeeCount: number; isOpen: boolean;
}
interface Attendee { id: string; name: string; color: string; rsvp: string; }
interface EventItem {
  id: string; name: string; category: 'food_drink' | 'misc';
  status: string; claimedById: string | null; claimedBy: string | null; notes: string;
}
interface Suggestion {
  id: string; fromId: string; fromName: string; text: string;
  status: 'pending' | 'accepted' | 'declined'; votes: number; votedBy: string[];
}
interface EventDetail {
  id: string; groupId: string; emoji: string; name: string;
  date: string; time: string; confirmed: boolean; outfit: string; playlist: string;
  locationName: string; locationAddr: string; locationLat: number | null; locationLon: number | null;
  parkingName: string; parkingAddr: string; parkingNotes: string; activity: string; creatorId: string;
  rawStartTime: Date;
}

type ViewType = 'list' | 'create' | 'detail';
type DetailTab = 'details' | 'suggestions';

export default function HangoutsScreen() {
  const { session } = useAuth();
  const { theme, isDark } = useTheme();
  const userId = session?.user?.id ?? '';
  const [view, setView] = useState<ViewType>('list');
  const [summaries, setSummaries] = useState<HangoutSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { if (!userId) return; loadSummaries(); }, [userId]);

  async function loadSummaries() {
    setLoadingList(true);
    try {
      const { data: memberRows, error: memberError } = await supabase
        .from('event_members').select('event_id, rsvp_status').eq('user_id', userId);
      if (memberError) throw memberError;
      const eventIds = (memberRows ?? []).map((r: any) => r.event_id);
      if (eventIds.length === 0) { setSummaries([]); return; }
      const rsvpMap: Record<string, string> = {};
      (memberRows ?? []).forEach((r: any) => { rsvpMap[r.event_id] = r.rsvp_status; });
      const { data: eventRows, error: eventError } = await supabase
        .from('events').select('id, title, description, start_time, group_id, confirmed')
        .in('id', eventIds).order('start_time', { ascending: true });
      if (eventError) throw eventError;
      const { data: countRows } = await supabase
        .from('event_members').select('event_id').in('event_id', eventIds);
      const countMap: Record<string, number> = {};
      (countRows ?? []).forEach((r: any) => { countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1; });
      setSummaries((eventRows ?? []).map((r: any) => ({
        id: r.id, groupId: r.group_id ?? '',
        emoji: r.description?.split(' ')[0] ?? '🎉', name: r.title,
        date: r.start_time ? new Date(r.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
        time: r.start_time ? new Date(r.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
        confirmed: r.confirmed === true, myRsvp: rsvpMap[r.id] ?? 'pending',
        attendeeCount: countMap[r.id] ?? 1, isOpen: true,
      })));
    } catch (err: any) {
      Alert.alert('Error loading hangouts', err.message ?? 'Unknown error');
    } finally { setLoadingList(false); }
  }

  function handleSelect(id: string) { setSelectedId(id); setView('detail'); }
  function handleCreated(id: string) { loadSummaries(); setSelectedId(id); setView('detail'); }

  const s = makeRootStyles(theme);

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HangoutHeader />
      {view === 'list' && <HangoutsList summaries={summaries} loading={loadingList} onSelect={handleSelect} onCreateNew={() => setView('create')} />}
      {view === 'create' && <CreateHangoutForm userId={userId} onBack={() => setView('list')} onCreate={handleCreated} />}
      {view === 'detail' && selectedId && <HangoutDetail eventId={selectedId} userId={userId} onBack={() => { setView('list'); loadSummaries(); }} />}
    </View>
  );
}

function makeRootStyles(theme: any) {
  return StyleSheet.create({ container: { flex: 1, backgroundColor: theme.bg } });
}

function HangoutsList({ summaries, loading, onSelect, onCreateNew }: { summaries: HangoutSummary[]; loading: boolean; onSelect: (id: string) => void; onCreateNew: () => void; }) {
  const { theme } = useTheme();
  const hl = makeHlStyles(theme);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={hl.content} showsVerticalScrollIndicator={false}>
      <View style={hl.topRow}>
        <Text style={hl.heading}>Hangouts</Text>
        <TouchableOpacity style={hl.createBtn} onPress={onCreateNew} activeOpacity={0.8}>
          <Text style={hl.createBtnText}>＋ Create</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={hl.emptyState}><ActivityIndicator color={theme.purpleLight} size="large" /><Text style={{ color: theme.textMuted, marginTop: 12 }}>Loading hangouts...</Text></View>
      ) : summaries.length === 0 ? (
        <View style={hl.emptyState}><Text style={hl.emptyEmoji}>🌙</Text><Text style={hl.emptyTitle}>No hangouts yet</Text><Text style={hl.emptySub}>Tap Create to start planning one</Text></View>
      ) : (
        summaries.map(ev => (
          <TouchableOpacity key={ev.id} style={hl.card} onPress={() => onSelect(ev.id)} activeOpacity={0.8}>
            <View style={hl.cardLeft}>
              <Text style={hl.cardEmoji}>{ev.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={hl.cardName}>{ev.name}</Text>
                <Text style={hl.cardDate}>📅 {ev.date} · 🕐 {ev.time}</Text>
                <Text style={hl.cardAttendees}>👥 {ev.attendeeCount} {ev.attendeeCount === 1 ? 'person' : 'people'}</Text>
              </View>
            </View>
            <View style={hl.cardRight}>
              {ev.confirmed ? <View style={hl.confirmedBadge}><Text style={hl.confirmedText}>Confirmed ✓</Text></View> : <View style={hl.pendingBadge}><Text style={hl.pendingText}>Planning</Text></View>}
              {ev.myRsvp === 'pending' && <View style={hl.rsvpBadge}><Text style={hl.rsvpBadgeText}>📬 Invited</Text></View>}
              {ev.myRsvp === 'accepted' && <View style={hl.rsvpAcceptedBadge}><Text style={hl.rsvpAcceptedText}>✓ Going</Text></View>}
              <Text style={hl.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function makeHlStyles(theme: any) {
  return StyleSheet.create({
    content: { padding: GUTTER, paddingTop: 12 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    heading: { fontSize: 26, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
    createBtn: { backgroundColor: theme.gold, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    createBtnText: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '800', fontSize: 14 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 6 },
    emptySub: { fontSize: 14, color: theme.textMuted },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.cardBorder, padding: 16, marginBottom: 12 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    cardEmoji: { fontSize: 36 },
    cardName: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 3 },
    cardDate: { fontSize: 12, color: theme.textMuted, marginBottom: 3 },
    cardAttendees: { fontSize: 12, color: theme.textMuted },
    cardRight: { alignItems: 'flex-end', gap: 5 },
    confirmedBadge: { backgroundColor: theme.greenDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${theme.green}55` },
    confirmedText: { fontSize: 11, fontWeight: '700', color: theme.green },
    pendingBadge: { backgroundColor: theme.purpleDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${theme.purple}4D` },
    pendingText: { fontSize: 11, fontWeight: '700', color: theme.purpleLight },
    rsvpBadge: { backgroundColor: theme.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${theme.gold}4D` },
    rsvpBadgeText: { fontSize: 11, fontWeight: '700', color: theme.gold },
    rsvpAcceptedBadge: { backgroundColor: theme.greenDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${theme.green}4D` },
    rsvpAcceptedText: { fontSize: 11, fontWeight: '700', color: theme.green },
    chevron: { fontSize: 22, color: theme.textMuted },
  });
}

function CreateHangoutForm({ userId, onBack, onCreate }: { userId: string; onBack: () => void; onCreate: (eventId: string) => void; }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [activity, setActivity] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMOJI_OPTIONS = ['🎉','🎮','🍕','🎬','🏖️','🎤','🍻','🏀'];
  const isPlanned = activity.trim().length > 0;
  const cf = makeCfStyles(theme);

  function formatDate(d: Date | null) { if (!d) return 'Select a date'; return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
  function formatTime(d: Date | null) { if (!d) return 'Select a time'; return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function handleDateChange(_e: any, sel?: Date) {
    setShowDatePicker(false);
    if (!sel) return;
    setEventDate(prev => { const base = prev ?? new Date(); const next = new Date(base); next.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate()); return next; });
  }
  function handleTimeChange(_e: any, sel?: Date) {
    if (!sel) return;
    setEventDate(prev => { const base = prev ?? new Date(); const next = new Date(base); next.setHours(sel.getHours(), sel.getMinutes(), 0, 0); return next; });
  }

  async function handleCreate() {
    if (!name.trim() || !userId || !eventDate) return;
    setSaving(true);
    try {
      const { data: groupData, error: gErr } = await supabase.from('groups').insert({ name: name.trim(), description: `${emoji} ${name.trim()}`, owner_id: userId }).select('id').single();
      if (gErr) throw gErr;
      await supabase.from('group_members').insert({ group_id: groupData.id, user_id: userId });
      const { data: eventData, error: eErr } = await supabase.from('events').insert({ title: name.trim(), creator_id: userId, group_id: groupData.id, start_time: eventDate.toISOString(), description: `${emoji} ${name.trim()}`, is_group_event: true }).select('id').single();
      if (eErr) throw eErr;
      await supabase.from('event_members').insert({ event_id: eventData.id, user_id: userId, role: 'creator', rsvp_status: 'accepted' });
      onCreate(eventData.id);
    } catch (err: any) {
      Alert.alert('Error creating hangout', err.message ?? 'Unknown error');
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={cf.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={cf.backBtn} onPress={onBack}><Text style={cf.backBtnText}>← Back</Text></TouchableOpacity>
        <Text style={cf.heading}>Create a Hangout</Text>
        <View style={[cf.typeBanner, isPlanned ? cf.typeBannerPlanned : cf.typeBannerOpen]}>
          <Text style={[cf.typeBannerText, isPlanned ? cf.typeBannerTextPlanned : cf.typeBannerTextOpen]}>{isPlanned ? '🎯 Planned hangout — activity is set' : '🌀 Open hangout — activity TBD, crew can vote on suggestions'}</Text>
        </View>
        <Text style={cf.label}>PICK A VIBE</Text>
        <View style={cf.emojiRow}>
          {EMOJI_OPTIONS.map(e => (<TouchableOpacity key={e} style={[cf.emojiBtn, emoji === e && cf.emojiBtnActive]} onPress={() => setEmoji(e)}><Text style={cf.emojiOption}>{e}</Text></TouchableOpacity>))}
        </View>
        <Text style={cf.label}>HANGOUT NAME</Text>
        <TextInput style={cf.input} placeholder="e.g. Game Night" placeholderTextColor={theme.textMuted} value={name} onChangeText={setName} />
        <Text style={cf.label}>ACTIVITY <Text style={cf.labelOptional}>(optional — leave blank to let the crew decide)</Text></Text>
        <TextInput style={cf.input} placeholder="e.g. Bowling, Movie Night, Beach..." placeholderTextColor={theme.textMuted} value={activity} onChangeText={setActivity} />
        <Text style={cf.label}>DATE</Text>
        <TouchableOpacity style={cf.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: eventDate ? theme.text : theme.textMuted }}>{formatDate(eventDate)}</Text>
        </TouchableOpacity>
        {showDatePicker && <DateTimePicker value={eventDate ?? new Date()} mode="date" display="inline" minimumDate={new Date()} onChange={handleDateChange} />}
        <Text style={cf.label}>TIME</Text>
        <TouchableOpacity style={cf.input} onPress={() => setShowTimePicker(true)}>
          <Text style={{ color: eventDate ? theme.text : theme.textMuted }}>{formatTime(eventDate)}</Text>
        </TouchableOpacity>
        {showTimePicker && (<><DateTimePicker value={eventDate ?? new Date()} mode="time" display="spinner" onChange={handleTimeChange} /><TouchableOpacity style={cf.doneBtn} onPress={() => setShowTimePicker(false)}><Text style={{ color: theme.textMuted }}>Done</Text></TouchableOpacity></>)}
        <TouchableOpacity style={[cf.createBtn, (!name.trim() || !eventDate || saving) && cf.createBtnDisabled]} onPress={handleCreate} disabled={!name.trim() || !eventDate || saving}>
          {saving ? <ActivityIndicator color={theme.isDark ? '#1a1333' : '#fff'} /> : <Text style={cf.createBtnText}>Create Hangout {isPlanned ? '🎯' : '🌀'}</Text>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeCfStyles(theme: any) {
  return StyleSheet.create({
    content: { padding: GUTTER, paddingTop: 16 },
    backBtn: { marginBottom: 20 }, backBtnText: { fontSize: 14, fontWeight: '600', color: theme.purpleLight },
    heading: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 20, letterSpacing: -0.5 },
    typeBanner: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24 },
    typeBannerOpen: { backgroundColor: theme.purpleDim, borderColor: `${theme.purple}4D` },
    typeBannerPlanned: { backgroundColor: theme.goldDim, borderColor: `${theme.gold}59` },
    typeBannerText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    typeBannerTextOpen: { color: theme.purpleLight }, typeBannerTextPlanned: { color: theme.gold },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.purpleMuted, marginBottom: 8 },
    labelOptional: { fontSize: 10, fontWeight: '400', letterSpacing: 0, color: theme.textMuted },
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    emojiBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emojiBtnActive: { borderColor: theme.gold, backgroundColor: theme.goldDim },
    emojiOption: { fontSize: 24 },
    input: { backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, color: theme.text, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20, fontSize: 15 },
    doneBtn: { alignSelf: 'flex-start', backgroundColor: theme.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, borderWidth: 1, borderColor: theme.cardBorder },
    createBtn: { backgroundColor: theme.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    createBtnDisabled: { opacity: 0.4 },
    createBtnText: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '800', fontSize: 16 },
  });
}

function HangoutDetail({ eventId, userId, onBack }: { eventId: string; userId: string; onBack: () => void; }) {
  const { theme } = useTheme();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [items, setItems] = useState<EventItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [myRsvp, setMyRsvp] = useState<string>('accepted');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [newFood, setNewFood] = useState('');
  const [newMisc, setNewMisc] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const ed = makeEdStyles(theme);
  const sg = makeSgStyles(theme);

  useEffect(() => { loadAll(); }, [eventId]);

  async function loadAll() {
    setLoading(true);
    try { await Promise.all([loadEvent(), loadAttendees(), loadItems(), loadSuggestions(), loadMyRsvp()]); }
    catch (err: any) { Alert.alert('Error loading hangout', err.message ?? 'Unknown error'); }
    finally { setLoading(false); }
  }

  async function loadMyRsvp() {
    const { data } = await supabase.from('event_members').select('rsvp_status').eq('event_id', eventId).eq('user_id', userId).single();
    if (data) setMyRsvp(data.rsvp_status);
  }

  async function loadEvent() {
    const { data, error } = await supabase.from('events')
      .select('id, title, activity, description, start_time, group_id, confirmed, outfit, playlist, location_name, location_address, latitude, longitude, parking_name, parking_addr, parking_info, creator_id')
      .eq('id', eventId).single();
    if (error) throw error;
    if (data.start_time) setEditDate(new Date(data.start_time));
    setEvent({
      id: data.id, groupId: data.group_id ?? '',
      emoji: data.description?.split(' ')[0] ?? '🎉', name: data.title,
      date: data.start_time ? new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
      time: data.start_time ? new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
      confirmed: data.confirmed === true, outfit: data.outfit ?? 'Whatever', playlist: data.playlist ?? '',
      locationName: data.location_name ?? '', locationAddr: data.location_address ?? '',
      locationLat: data.latitude ?? null, locationLon: data.longitude ?? null,
      parkingName: data.parking_name ?? '', parkingAddr: data.parking_addr ?? '',
      parkingNotes: data.parking_info ?? '', activity: data.activity ?? '', creatorId: data.creator_id ?? '',
      rawStartTime: data.start_time ?? '',
    });
  }

  async function loadAttendees() {
    const { data, error } = await supabase.from('event_members').select('user_id, rsvp_status, users(username)').eq('event_id', eventId);
    if (error) throw error;
    setAttendees((data ?? []).map((r: any, i: number) => ({ id: r.user_id, name: r.user_id === userId ? 'You' : (r.users?.username ?? 'Unknown'), color: ATTENDEE_COLORS[i % ATTENDEE_COLORS.length], rsvp: r.rsvp_status })));
  }

  async function loadItems() {
    const { data, error } = await supabase.from('event_items').select('id, item_name, category, status, user_id, notes, users(username)').eq('event_id', eventId).order('created_at', { ascending: true });
    if (error) throw error;
    setItems((data ?? []).map((r: any) => ({ id: r.id, name: r.item_name, category: r.category, status: r.status, claimedBy: r.user_id === userId ? 'YOU' : (r.users?.username ?? null), claimedById: r.user_id, notes: r.notes ?? '' })));
  }

  async function loadSuggestions() {
    const { data, error } = await supabase.from('event_suggestions').select('id, text, status, user_id, votes, voted_by, users(username)').eq('event_id', eventId).order('created_at', { ascending: true });
    if (error) throw error;
    setSuggestions((data ?? []).map((r: any) => ({ id: r.id, fromId: r.user_id, fromName: r.user_id === userId ? 'You' : (r.users?.username ?? 'Someone'), text: r.text, status: r.status, votes: r.votes ?? 0, votedBy: r.voted_by ?? [] })));
  }

  async function handleRsvp(status: 'accepted' | 'rejected') {
    setRsvpSaving(true);
    try {
      const { error } = await supabase.from('event_members').update({ rsvp_status: status }).eq('event_id', eventId).eq('user_id', userId);
      if (error) throw error;
      setMyRsvp(status);
      setAttendees(prev => prev.map(a => a.id === userId ? { ...a, rsvp: status } : a));
    } catch (err: any) { Alert.alert('Error updating RSVP', err.message ?? 'Unknown error'); }
    finally { setRsvpSaving(false); }
  }

  async function handleSaveEdits() {
    if (!event) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('events').update({
        title: event.name, outfit: event.outfit, playlist: event.playlist,
        location_name: event.locationName, location_address: event.locationAddr,
        latitude: event.locationLat, longitude: event.locationLon,
        parking_name: event.parkingName, parking_addr: event.parkingAddr,
        parking_info: event.parkingNotes, activity: event.activity,
        start_time: editDate ? editDate.toISOString() : undefined,
      }).eq('id', eventId);
      if (error) throw error;
      if (editDate) {
        setEvent(prev => prev ? {
          ...prev,
          date: editDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          time: editDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        } : prev);
      }
      setEditMode(false);
    } catch (err: any) { Alert.alert('Error saving', err.message ?? 'Unknown error'); }
    finally { setSaving(false); }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const { error } = await supabase.from('events').update({ confirmed: true }).eq('id', eventId);
      if (error) throw error;
      setEvent(prev => prev ? { ...prev, confirmed: true } : prev);
    } catch (err: any) { Alert.alert('Error confirming', err.message ?? 'Unknown error'); }
    finally { setSaving(false); }
  }

  async function addItem(category: 'food_drink' | 'misc', name: string) {
    if (!name.trim()) return;
    try {
      const { data, error } = await supabase.from('event_items').insert({ event_id: eventId, user_id: userId, category, item_name: name.trim(), status: 'bringing' }).select('id, item_name, category, status, user_id, notes').single();
      if (error) throw error;
      setItems(prev => [...prev, { id: data.id, name: data.item_name, category: data.category, status: data.status, claimedBy: 'YOU', claimedById: userId, notes: '' }]);
      if (category === 'food_drink') setNewFood(''); else setNewMisc('');
    } catch (err: any) { Alert.alert('Error adding item', err.message ?? 'Unknown error'); }
  }

  async function removeItem(itemId: string) {
    try {
      const { error } = await supabase.from('event_items').delete().eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) { Alert.alert('Error removing item', err.message ?? 'Unknown error'); }
  }

  async function toggleClaim(item: EventItem) {
    if (item.claimedById && item.claimedById !== userId) return;
    const isMine = item.claimedById === userId;
    try {
      const { error } = await supabase.from('event_items').update({ user_id: isMine ? null : userId, status: isMine ? 'bringing' : 'claimed' }).eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, claimedBy: isMine ? null : 'YOU', claimedById: isMine ? null : userId, status: isMine ? 'bringing' : 'claimed' } : i));
    } catch (err: any) { Alert.alert('Error updating item', err.message ?? 'Unknown error'); }
  }

  async function addSuggestion() {
    if (!newSuggestion.trim()) return;
    try {
      const { data, error } = await supabase.from('event_suggestions').insert({ event_id: eventId, user_id: userId, text: newSuggestion.trim() }).select('id, text, status').single();
      if (error) throw error;
      setSuggestions(prev => [...prev, { id: data.id, fromId: userId, fromName: 'You', text: data.text, status: 'pending', votes: 0, votedBy: [] }]);
      setNewSuggestion('');
    } catch (err: any) { Alert.alert('Error adding suggestion', err.message ?? 'Unknown error'); }
  }

  async function updateSuggestionStatus(suggId: string, status: 'accepted' | 'declined') {
    try {
      const { error } = await supabase.from('event_suggestions').update({ status }).eq('id', suggId);
      if (error) throw error;
      setSuggestions(prev => prev.map(s => s.id === suggId ? { ...s, status } : s));
    } catch (err: any) { Alert.alert('Error updating suggestion', err.message ?? 'Unknown error'); }
  }

  async function handleUpvote(sugg: Suggestion) {
    if (sugg.votedBy.includes(userId)) return;
    const newVotes = sugg.votes + 1;
    const newVotedBy = [...sugg.votedBy, userId];
    setSuggestions(prev => prev.map(s => s.id === sugg.id ? { ...s, votes: newVotes, votedBy: newVotedBy } : s));
    try {
      const { error } = await supabase.from('event_suggestions').update({ votes: newVotes, voted_by: newVotedBy }).eq('id', sugg.id);
      if (error) throw error;
      const majority = Math.ceil((attendees.length * 51) / 100);
      if (newVotes >= majority && sugg.status === 'pending') {
        await updateSuggestionStatus(sugg.id, 'accepted');
        const { error: itemErr } = await supabase.from('event_items').insert({ event_id: eventId, user_id: userId, category: 'misc', item_name: sugg.text, status: 'bringing' });
        if (itemErr) throw itemErr;
        await loadItems();
        Alert.alert('🗳️ Majority vote!', `"${sugg.text}" got majority approval and has been added to Misc Supplies.`);
      }
    } catch (err: any) {
      setSuggestions(prev => prev.map(s => s.id === sugg.id ? { ...s, votes: sugg.votes, votedBy: sugg.votedBy } : s));
      Alert.alert('Error voting', err.message ?? 'Unknown error');
    }
  }

  async function handlePromote(sugg: Suggestion) {
    try {
      await updateSuggestionStatus(sugg.id, 'accepted');
      await supabase
        .from('events')
        .update({activity: sugg.text})
        .eq('id', event?.id);

      setEvent(prev => prev ? { ...prev, activity: sugg.text } : prev);
      Alert.alert('Activity set! 🎯', `"${sugg.text}" is now the plan.`);
      handleConfirm();
    } catch (err: any) { Alert.alert('Error promoting suggestion', err.message ?? 'Unknown error'); }
  }

  const isHost = event?.creatorId === userId;
  const isOpen = !event?.activity;
  const topSuggestion = suggestions.filter(s => s.status === 'pending').sort((a, b) => b.votes - a.votes)[0] ?? null;
  const daysUntil: number = (() => {
    if (!event) return 0;
    const d = new Date(event.rawStartTime); const t = new Date();
    t.setHours(0,0,0,0); d.setHours(0,0,0,0);
    return Math.max(0, Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24)));
  })();
  const foodItems = items.filter(i => i.category === 'food_drink');
  const miscItems = items.filter(i => i.category === 'misc');
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;

  if (loading) return (<View style={[ed.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={theme.purpleLight} size="large" /><Text style={{ color: theme.textMuted, marginTop: 12 }}>Loading hangout...</Text></View>);
  if (!event) return null;

  let editButton = null; // Only event creators can view and enable edit mode. 
  if  (isHost) {
    editButton = <TouchableOpacity style={[ed.editBtn, editMode && ed.editBtnActive]} onPress={() => { if (editMode) handleSaveEdits(); else setEditMode(true); }}>
          {saving ? <ActivityIndicator size="small" color={theme.isDark ? '#1a1333' : '#fff'} /> : <Text style={[ed.editBtnText, editMode && ed.editBtnTextActive]}>{editMode ? 'Save' : '✏️'}</Text>}
        </TouchableOpacity>
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={ed.tabBar}>
        <TouchableOpacity style={ed.backBtn} onPress={onBack}><Text style={ed.backBtnText}>← All</Text></TouchableOpacity>
        <View style={ed.tabs}>
          <TouchableOpacity style={[ed.tab, activeTab === 'details' && ed.tabActive]} onPress={() => setActiveTab('details')}><Text style={[ed.tabText, activeTab === 'details' && ed.tabTextActive]}>Details</Text></TouchableOpacity>
          <TouchableOpacity style={[ed.tab, activeTab === 'suggestions' && ed.tabActive]} onPress={() => setActiveTab('suggestions')}>
            <Text style={[ed.tabText, activeTab === 'suggestions' && ed.tabTextActive]}>{isOpen ? '💬 Suggestions' : '✏️ Suggest Changes'}{pendingSuggestions > 0 ? ` (${pendingSuggestions})` : ''}</Text>
          </TouchableOpacity>
        </View>
          {editButton}
        </View>

      {activeTab === 'details' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {myRsvp === 'pending' && (
            <View style={ed.rsvpBanner}>
              <View style={ed.rsvpBannerLeft}>
                <Text style={ed.rsvpBannerTitle}>You've been invited! 🎉</Text>
                <Text style={ed.rsvpBannerSub}>Are you going to {event.name}?</Text>
              </View>
              <View style={ed.rsvpBannerActions}>
                <TouchableOpacity style={ed.rsvpAcceptBtn} onPress={() => handleRsvp('accepted')} disabled={rsvpSaving} activeOpacity={0.8}>
                  {rsvpSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ed.rsvpAcceptBtnText}>✓ Going</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={ed.rsvpDeclineBtn} onPress={() => handleRsvp('rejected')} disabled={rsvpSaving} activeOpacity={0.8}>
                  <Text style={ed.rsvpDeclineBtnText}>✕ Can't</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={[ed.header, {marginBottom: 16}]}>
            <Text style={ed.emoji}>{event.emoji}</Text>
            <View style={{ flex: 1 }}>
              {editMode
                ? <TextInput style={ed.nameInput} value={event.name} onChangeText={v => setEvent(p => p ? { ...p, name: v } : p)} placeholderTextColor={theme.textMuted} />
                : <Text style={ed.eventName}>{event.name}</Text>
              }
              <View style={ed.metaRow}>
                {editMode ? (
                  <>
                    <TouchableOpacity style={ed.metaChipEdit} onPress={() => setShowEditDatePicker(true)}>
                      <Text style={ed.metaChipEditText}>📅 {editDate ? editDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : event.date}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={ed.metaChipEdit} onPress={() => setShowEditTimePicker(true)}>
                      <Text style={ed.metaChipEditText}>🕐 {editDate ? editDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : event.time}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={ed.metaChip}><Text style={ed.metaChipText}>📅 {event.date}</Text></View>
                    <View style={ed.metaChip}><Text style={ed.metaChipText}>🕐 {event.time}</Text></View>
                  </>
                )}
                {event.confirmed && <View style={ed.confirmedChip}><Text style={ed.confirmedChipText}>✓ Confirmed</Text></View>}
              </View>
            </View>
          </View>
          {showEditDatePicker && (
            <DateTimePicker value={editDate ?? new Date()} mode="date" display="inline"
              onChange={(_e, sel) => { setShowEditDatePicker(false); if (!sel) return; setEditDate(prev => { const base = prev ?? new Date(); const next = new Date(base); next.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate()); return next; }); }} />
          )}
          {showEditTimePicker && (
            <>
              <DateTimePicker value={editDate ?? new Date()} mode="time" display="spinner"
                onChange={(_e, sel) => { if (!sel) return; setEditDate(prev => { const base = prev ?? new Date(); const next = new Date(base); next.setHours(sel.getHours(), sel.getMinutes(), 0, 0); return next; }); }} />
              <TouchableOpacity style={ed.doneBtn} onPress={() => setShowEditTimePicker(false)}><Text style={ed.doneBtnText}>Done</Text></TouchableOpacity>
            </>
          )}
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
          <Section label="WHO'S COMING" theme={theme}>
            <View style={ed.attendeeRow}>
              {attendees.map(a => (
                <View key={a.id} style={[ed.attendeeChip, { borderColor: a.color + '60' }]}>
                  <View style={[ed.attendeeAvatar, { backgroundColor: a.color + '33' }]}><Text style={[ed.attendeeInitial, { color: a.color }]}>{a.name[0]}</Text></View>
                  <View><Text style={ed.attendeeName}>{a.name}</Text><Text style={ed.attendeeRsvp}>{a.rsvp}</Text></View>
                </View>
              ))}
            </View>
          </Section>
          <Section label="INVITE PEOPLE" theme={theme}>
            <InviteSection eventId={event.id} eventName={event.name} groupId={event.groupId} currentUserId={userId} currentAttendees={attendees}
              onInvited={(user) => setAttendees(prev => [...prev, { id: user.id, name: user.username, color: ATTENDEE_COLORS[prev.length % ATTENDEE_COLORS.length], rsvp: 'pending' }])} />
          </Section>
          <Section label="OUTFIT VIBES" theme={theme}>
            <View style={ed.chipRow}>
              {OUTFIT_VIBES.map(v => (
                <TouchableOpacity key={v} style={[ed.vibeChip, event.outfit === v && ed.vibeChipActive]} onPress={() => editMode && setEvent(p => p ? { ...p, outfit: v } : p)} activeOpacity={editMode ? 0.7 : 1}>
                  <Text style={[ed.vibeChipText, event.outfit === v && ed.vibeChipTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
          <Section label="MUSIC" theme={theme}>
            <View style={ed.musicCard}>
              <Text style={ed.musicIcon}>🎵</Text>
              <View style={{ flex: 1 }}>
                {editMode ? <TextInput style={ed.inlineInput} value={event.playlist} onChangeText={v => setEvent(p => p ? { ...p, playlist: v } : p)} placeholder="Paste playlist link or name" placeholderTextColor={theme.textMuted} />
                  : <><Text style={ed.musicTitle}>{event.playlist || 'No playlist added'}</Text><Text style={ed.musicSub}>Tap to open playlist</Text></>}
              </View>
            </View>
          </Section>
          <Section label="FOOD & DRINKS" theme={theme}>
            {foodItems.map(item => (<ItemRow key={item.id} item={item} userId={userId} theme={theme} onClaim={() => toggleClaim(item)} onRemove={editMode ? () => removeItem(item.id) : undefined} />))}
            <AddRow value={newFood} onChange={setNewFood} onAdd={() => addItem('food_drink', newFood)} placeholder="Add food or drink..." theme={theme} />
          </Section>
          <Section label="MISC SUPPLIES" theme={theme}>
            {miscItems.map(item => (<ItemRow key={item.id} item={item} userId={userId} theme={theme} onClaim={() => toggleClaim(item)} onRemove={editMode ? () => removeItem(item.id) : undefined} />))}
            <AddRow value={newMisc} onChange={setNewMisc} onAdd={() => addItem('misc', newMisc)} placeholder="Add a supply..." theme={theme} />
          </Section>
          <Section label="LOCATION" theme={theme}>
            <View style={ed.locationCard}>
              <Text style={ed.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                {editMode ? <LocationAutocomplete onSelect={({ name, address, latitude, longitude }) => setEvent(p => p ? { ...p, locationName: name, locationAddr: address, locationLat: latitude, locationLon: longitude } : p)} />
                  : <><Text style={ed.locationName}>{event.locationName || 'No location set'}</Text>{event.locationAddr ? <Text style={ed.locationAddr}>{event.locationAddr}</Text> : null}</>}
              </View>
            </View>
          </Section>
          <Section label="PARKING" theme={theme}>
            <View style={ed.locationCard}>
              <Text style={ed.locationIcon}>🅿️</Text>
              <View style={{ flex: 1 }}>
                {editMode ? (<><LocationAutocomplete onSelect={({ name, address }) => setEvent(p => p ? { ...p, parkingName: name, parkingAddr: address } : p)} /><TextInput style={[ed.parkingNotesInput, { marginTop: 8 }]} value={event.parkingNotes} onChangeText={v => setEvent(p => p ? { ...p, parkingNotes: v } : p)} placeholder="Notes (free after 5pm, etc.)" placeholderTextColor={theme.textMuted} multiline numberOfLines={3} /></>)
                  : <><Text style={ed.locationName}>{event.parkingName || 'No parking info'}</Text>{event.parkingNotes ? <Text style={ed.locationAddr}>{event.parkingNotes}</Text> : null}</>}
              </View>
            </View>
          </Section>
          {!event.confirmed && (<TouchableOpacity style={ed.confirmBtn} onPress={handleConfirm} disabled={saving}><Text style={ed.confirmBtnText}>Confirm Hangout ✓</Text></TouchableOpacity>)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'suggestions' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={sg.intro}>{isOpen ? "No activity set yet — drop ideas below. The crew can upvote and the host can lock one in as the plan." : `Current plan: "${event.activity}". Suggest changes below if something better comes up.`}</Text>
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
          <View style={sg.addRow}>
            <TextInput style={sg.addInput} value={newSuggestion} onChangeText={setNewSuggestion} placeholder={isOpen ? "Drop an idea..." : "Suggest a change..."} placeholderTextColor={theme.textMuted} onSubmitEditing={addSuggestion} returnKeyType="send" />
            <TouchableOpacity style={sg.addBtn} onPress={addSuggestion}><Text style={sg.addBtnText}>Send</Text></TouchableOpacity>
          </View>
          {suggestions.length === 0 ? (
            <View style={sg.emptyState}><Text style={sg.emptyEmoji}>💬</Text><Text style={sg.emptyTitle}>No suggestions yet</Text><Text style={sg.emptySub}>Be the first to drop an idea above</Text></View>
          ) : (
            suggestions.map(s => (
              <View key={s.id} style={[sg.card, s.status === 'accepted' && sg.cardAccepted, s.status === 'declined' && sg.cardDeclined, topSuggestion?.id === s.id && s.status === 'pending' && sg.cardTop]}>
                <View style={sg.cardHeader}>
                  <View style={sg.fromBadge}><Text style={sg.fromText}>{s.fromName[0]}</Text></View>
                  <Text style={sg.fromName}>{s.fromName} suggested</Text>
                  {s.status !== 'pending' && (<View style={[sg.statusBadge, s.status === 'accepted' ? sg.statusAccepted : sg.statusDeclined]}><Text style={sg.statusText}>{s.status === 'accepted' ? 'Accepted ✓' : 'Passed'}</Text></View>)}
                  {topSuggestion?.id === s.id && s.status === 'pending' && s.votes > 0 && (<View style={sg.topBadge}><Text style={sg.topBadgeText}>🔥 Top</Text></View>)}
                </View>
                <Text style={sg.suggestionText}>{s.text}</Text>
                {s.status === 'pending' && (
                  <View style={sg.actionRow}>
                    {(() => {
                      const hasVoted = s.votedBy.includes(userId);
                      const majority = Math.ceil((attendees.length * 51) / 100);
                      return (
                        <TouchableOpacity style={[sg.upvoteBtn, hasVoted && sg.upvoteBtnVoted]} onPress={() => handleUpvote(s)} disabled={hasVoted} activeOpacity={hasVoted ? 1 : 0.7}>
                          <Text style={[sg.upvoteBtnText, hasVoted && sg.upvoteBtnTextVoted]}>👍 {s.votes}/{attendees.length}</Text>
                          <Text style={sg.upvoteNeeded}>{hasVoted ? 'voted' : `${Math.max(0, majority - s.votes)} more needed`}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                    {s.fromId !== userId && !isHost && (
                      <><TouchableOpacity style={sg.acceptBtn} onPress={() => updateSuggestionStatus(s.id, 'accepted')}><Text style={sg.acceptBtnText}>Sounds good 👍</Text></TouchableOpacity>
                      <TouchableOpacity style={sg.declineBtn} onPress={() => updateSuggestionStatus(s.id, 'declined')}><Text style={sg.declineBtnText}>Pass</Text></TouchableOpacity></>
                    )}
                    {isHost && (<TouchableOpacity style={sg.promoteInlineBtn} onPress={() => handlePromote(s)} activeOpacity={0.8}><Text style={sg.promoteInlineBtnText}>Make the plan →</Text></TouchableOpacity>)}
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

function Section({ label, children, theme }: { label: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={{ marginHorizontal: GUTTER, marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.purpleMuted, marginBottom: 10 }}>{label}</Text>
      {children}
    </View>
  );
}

function ItemRow({ item, userId, theme, onClaim, onRemove }: { item: EventItem; userId: string; theme: any; onClaim: () => void; onRemove?: () => void }) {
  const isYou = item.claimedById === userId;
  const isOther = item.claimedById && !isYou;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text, flex: 1 }}>{item.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {onRemove && <TouchableOpacity style={{ padding: 4 }} onPress={onRemove}><Text style={{ fontSize: 12, color: theme.red, fontWeight: '700' }}>✕</Text></TouchableOpacity>}
        <TouchableOpacity style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 }, isYou ? { backgroundColor: `${theme.gold}26`, borderColor: `${theme.gold}66` } : isOther ? { backgroundColor: theme.greenDim, borderColor: `${theme.green}4D` } : { backgroundColor: theme.purpleDim, borderColor: `${theme.purple}40` }]} onPress={onClaim} disabled={!!isOther}>
          <Text style={[{ fontSize: 11, fontWeight: '700' }, isYou ? { color: theme.gold } : isOther ? { color: theme.green } : { color: theme.purpleLight }]}>{isYou ? 'YOU ✓' : isOther ? item.claimedBy : 'Claim'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddRow({ value, onChange, onAdd, placeholder, theme }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
      <TextInput style={{ flex: 1, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: theme.text }} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.textMuted} onSubmitEditing={onAdd} returnKeyType="done" />
      <TouchableOpacity style={{ backgroundColor: theme.purpleDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: `${theme.purple}4D`, justifyContent: 'center' }} onPress={onAdd}><Text style={{ fontSize: 13, fontWeight: '700', color: theme.purpleLight }}>Add</Text></TouchableOpacity>
    </View>
  );
}

function makeEdStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scrollContent: { paddingBottom: 60 },
    tabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, gap: 8 },
    backBtn: {}, backBtnText: { fontSize: 14, fontWeight: '600', color: theme.purpleLight },
    tabs: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
    tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    tabActive: { backgroundColor: theme.purpleDim, borderColor: `${theme.purple}4D` },
    tabText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    tabTextActive: { color: theme.purpleLight },
    editBtn: { backgroundColor: theme.purpleDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${theme.purple}4D`, minWidth: 52, alignItems: 'center' },
    editBtnActive: { backgroundColor: theme.gold, borderColor: theme.gold },
    editBtnText: { fontSize: 13, color: theme.purpleLight, fontWeight: '600' },
    editBtnTextActive: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '700' },
    rsvpBanner: { marginHorizontal: GUTTER, marginTop: 16, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: `${theme.gold}59`, padding: 16 },
    rsvpBannerLeft: { flex: 1 },
    rsvpBannerTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 3 },
    rsvpBannerSub: { fontSize: 13, color: theme.textMuted },
    rsvpBannerActions: { flexDirection: 'column', gap: 8 },
    rsvpAcceptBtn: { backgroundColor: theme.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 80 },
    rsvpAcceptBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
    rsvpDeclineBtn: { backgroundColor: theme.redDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: `${theme.red}59` },
    rsvpDeclineBtnText: { fontSize: 13, fontWeight: '700', color: theme.red },
    header: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: GUTTER, paddingBottom: 0 },
    emoji: { fontSize: 44, marginTop: 2 },
    eventName: { fontSize: 26, fontWeight: '800', color: theme.text, letterSpacing: -0.5, marginBottom: 8 },
    nameInput: { fontSize: 22, fontWeight: '800', color: theme.text, borderBottomWidth: 1.5, borderBottomColor: theme.purple, paddingBottom: 4, marginBottom: 8 },
    metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    metaChip: { backgroundColor: theme.purpleDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${theme.purple}40` },
    metaChipText: { fontSize: 12, fontWeight: '600', color: theme.textSub },
    metaChipEdit: { backgroundColor: theme.goldDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${theme.gold}66` },
    metaChipEditText: { fontSize: 12, fontWeight: '600', color: theme.gold },
    confirmedChip: { backgroundColor: theme.greenDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${theme.green}59` },
    confirmedChipText: { fontSize: 12, fontWeight: '700', color: theme.green },
    doneBtn: { alignSelf: 'flex-start', backgroundColor: theme.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8, marginHorizontal: GUTTER, borderWidth: 1, borderColor: theme.cardBorder },
    doneBtnText: { color: theme.textMuted, fontSize: 14 },
    countdown: { margin: GUTTER, backgroundColor: theme.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: `${theme.gold}4D`, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    countdownLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
    countdownNum: { fontSize: 28, fontWeight: '800', color: theme.text },
    countdownEvent: { fontSize: 15, fontWeight: '700', color: theme.gold, marginTop: 2 },
    countdownMoon: { fontSize: 48 },
    attendeeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    attendeeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, borderRadius: 20, paddingRight: 12, paddingLeft: 4, paddingVertical: 6, borderWidth: 1 },
    attendeeAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    attendeeInitial: { fontSize: 12, fontWeight: '700' },
    attendeeName: { fontSize: 13, fontWeight: '600', color: theme.text },
    attendeeRsvp: { fontSize: 10, color: theme.textMuted, textTransform: 'capitalize' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vibeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder },
    vibeChipActive: { backgroundColor: theme.gold, borderColor: theme.gold },
    vibeChipText: { fontSize: 13, fontWeight: '600', color: theme.textSub },
    vibeChipTextActive: { color: theme.isDark ? '#1a1333' : '#fff', fontWeight: '700' },
    musicCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, padding: 14 },
    musicIcon: { fontSize: 22 },
    musicTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
    musicSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    inlineInput: { fontSize: 14, color: theme.text, borderBottomWidth: 1, borderBottomColor: theme.purple, paddingBottom: 2 },
    parkingNotesInput: { fontSize: 13, color: theme.text, backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder, padding: 10, lineHeight: 18, textAlignVertical: 'top' },
    locationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, padding: 14 },
    locationIcon: { fontSize: 20, marginTop: 2 },
    locationName: { fontSize: 14, fontWeight: '600', color: theme.text },
    locationAddr: { fontSize: 12, color: theme.textMuted, marginTop: 3, lineHeight: 17 },
    confirmBtn: { marginHorizontal: GUTTER, marginTop: 8, backgroundColor: theme.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { fontSize: 16, fontWeight: '800', color: theme.isDark ? '#1a1333' : '#fff' },
  });
}

function makeSgStyles(theme: any) {
  return StyleSheet.create({
    intro: { marginHorizontal: GUTTER, marginTop: 16, marginBottom: 12, fontSize: 13, color: theme.textMuted, lineHeight: 19 },
    promoteBanner: { marginHorizontal: GUTTER, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: `${theme.gold}59`, padding: 16 },
    promoteBannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: theme.gold, marginBottom: 4 },
    promoteBannerText: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 4, lineHeight: 19 },
    promoteBannerVotes: { fontSize: 12, color: theme.textMuted },
    promoteBtn: { backgroundColor: theme.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
    promoteBtnText: { fontSize: 12, fontWeight: '800', color: theme.isDark ? '#1a1333' : '#fff', textAlign: 'center', lineHeight: 17 },
    addRow: { flexDirection: 'row', gap: 8, marginHorizontal: GUTTER, marginBottom: 16 },
    addInput: { flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: theme.text },
    addBtn: { backgroundColor: theme.purpleDim, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: `${theme.purple}4D`, justifyContent: 'center' },
    addBtnText: { fontSize: 13, fontWeight: '700', color: theme.purpleLight },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 6 },
    emptySub: { fontSize: 13, color: theme.textMuted },
    card: { marginHorizontal: GUTTER, marginBottom: 12, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, padding: 16 },
    cardAccepted: { borderColor: `${theme.green}66`, backgroundColor: theme.greenDim },
    cardDeclined: { opacity: 0.5 },
    cardTop: { borderColor: `${theme.gold}66`, backgroundColor: theme.goldDim },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    fromBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.purpleDim, borderWidth: 1, borderColor: `${theme.purple}66`, alignItems: 'center', justifyContent: 'center' },
    fromText: { fontSize: 12, fontWeight: '800', color: theme.purpleLight },
    fromName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.textMuted },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
    statusAccepted: { backgroundColor: theme.greenDim, borderColor: `${theme.green}66` },
    statusDeclined: { backgroundColor: theme.redDim, borderColor: `${theme.red}4D` },
    statusText: { fontSize: 11, fontWeight: '700', color: theme.text },
    topBadge: { backgroundColor: theme.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${theme.gold}66` },
    topBadgeText: { fontSize: 11, fontWeight: '700', color: theme.gold },
    suggestionText: { fontSize: 14, color: theme.text, lineHeight: 20, marginBottom: 12 },
    actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    upvoteBtn: { backgroundColor: theme.purpleDim, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: `${theme.purple}4D`, alignItems: 'center' },
    upvoteBtnText: { fontSize: 13, fontWeight: '700', color: theme.purpleLight },
    upvoteBtnVoted: { backgroundColor: theme.greenDim, borderColor: `${theme.green}66` },
    upvoteBtnTextVoted: { color: theme.green },
    upvoteNeeded: { fontSize: 9, color: theme.textMuted, marginTop: 2, fontWeight: '600' },
    acceptBtn: { flex: 1, backgroundColor: theme.greenDim, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: `${theme.green}59` },
    acceptBtnText: { fontSize: 13, fontWeight: '700', color: theme.green },
    declineBtn: { backgroundColor: theme.purpleDim, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: `${theme.purple}40` },
    declineBtnText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    promoteInlineBtn: { backgroundColor: theme.goldDim, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: `${theme.gold}66`, alignItems: 'center' },
    promoteInlineBtnText: { fontSize: 12, fontWeight: '800', color: theme.gold },
  });
}