import HangoutHeader from '@/components/HangoutHeader';
import LocationAutocomplete from '@/components/LocationAutoComplete';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

// ── Types ────────────────────────────────────────────────────
interface FoodItem  { id: string; name: string; claimedBy: string | null; }
interface MiscItem  { id: string; name: string; claimedBy: string | null; }
interface Suggestion { id: string; from: string; text: string; status: 'pending' | 'accepted' | 'declined'; }

interface HangoutEvent {
  id: string;
  groupId: string;   // ← links to groups.id in Supabase
  emoji: string;
  name: string;
  date: string;
  time: string;
  confirmed: boolean;
  attendees: { id: string; name: string; color: string }[];
  outfit: string;
  playlist: string;
  locationName: string;
  locationAddr: string;
  locationLat: number | null; // For Map
  locationLon: number | null; // For Map
  parkingName: string;
  parkingAddr: string;
  parkingNotes: string;
  food: FoodItem[];
  misc: MiscItem[];
  suggestions: Suggestion[];
}

// -- Update db Function --
async function saveEventChanges(updatedEvent : HangoutEvent) {
  const {error} = await supabase
    .from ('events')
    .update({
      title: updatedEvent.name,
      location_name: updatedEvent.locationName,
      location_address: updatedEvent.locationAddr,
      latitude: updatedEvent.locationLat ?? null,
      longitude: updatedEvent.locationLon ?? null,
      parking_name: updatedEvent.parkingName,
      parking_addr: updatedEvent.parkingAddr,
      parking_info: updatedEvent.parkingNotes,
      playlist: updatedEvent.playlist,
      outfit: updatedEvent.outfit,
    })
    .eq('id', updatedEvent.id);

    if (error) throw error;

    // TODO : Link & Update event_items table 
}

// ── Hangouts List ─────────────────────────────────────────────
function HangoutsList({
  events,
  loading,
  onSelect,
  onCreateNew,
}: {
  events: HangoutEvent[];
  loading: boolean;
  onSelect: (e: HangoutEvent) => void;
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
          <Text style={{ color: THEME.textMuted, marginTop: 12 }}>Loading hangouts…</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={hl.emptyState}>
          <Text style={hl.emptyEmoji}>🌙</Text>
          <Text style={hl.emptyTitle}>No hangouts yet</Text>
          <Text style={hl.emptySub}>Tap Create to start planning one</Text>
        </View>
      ) : (
        events.map(ev => (
          <TouchableOpacity key={ev.id} style={hl.card} onPress={() => onSelect(ev)} activeOpacity={0.8}>
            <View style={hl.cardLeft}>
              <Text style={hl.cardEmoji}>{ev.emoji}</Text>
              <View>
                <Text style={hl.cardName}>{ev.name}</Text>
                <Text style={hl.cardDate}>📅 {ev.date} · 🕐 {ev.time}</Text>
                <View style={hl.attendeeRow}>
                  {ev.attendees.slice(0, 4).map(a => (
                    <View key={a.id} style={[hl.pip, { backgroundColor: a.color + '55', borderColor: a.color }]}>
                      <Text style={[hl.pipText, { color: a.color }]}>{a.name[0]}</Text>
                    </View>
                  ))}
                  {ev.attendees.length > 4 && (
                    <Text style={hl.moreAttendees}>+{ev.attendees.length - 4}</Text>
                  )}
                </View>
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
    backgroundColor: THEME.card, borderRadius: 18,
    borderWidth: 1, borderColor: THEME.cardBorder,
    padding: 16, marginBottom: 12,
  },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardEmoji: { fontSize: 36 },
  cardName:  { fontSize: 17, fontWeight: '700', color: THEME.text, marginBottom: 3 },
  cardDate:  { fontSize: 12, color: THEME.textMuted, marginBottom: 6 },
  attendeeRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  pip: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pipText: { fontSize: 10, fontWeight: '800' },
  moreAttendees: { fontSize: 11, color: THEME.textMuted, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
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
  onCreate: (e: HangoutEvent) => void;
}) {
  const [name, setName]   = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [eventDate, setEventDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const EMOJI_OPTIONS = ['🎉','🎮','🍕','🎬','🏖️','🎤','🍻','🏀'];

    function formatDate(date: Date | null) {
    if (!date) return 'Select a date';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(date: Date | null) {
    if (!date) return 'Select a time';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

    function handleDateChange(_event: any, selectedDate?: Date) {
    setShowDatePicker(false);
    if (!selectedDate) return;

    setEventDate(prev => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      return next;
    });
  }

    function handleTimeChange(_event: any, selectedTime?: Date) {
    if (!selectedTime) return;

    setEventDate(prev => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || !userId || !eventDate) return;
    setSaving(true);

    try {
      // ── 1. Create the group (hangout = group in this app) ──
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name:        name.trim(),
          description: `${emoji} ${name.trim()}`,
          owner_id:    userId,
        })
        .select('id')
        .single();

      if (groupError) throw groupError;
      const groupId = groupData.id;

      // ── 2. Add creator to group_members ──
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id:  userId,
        });

      if (memberError) throw memberError;

      // ── 3. Create the event linked to the group ──
      const startTime = new Date().toISOString();
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title:       name.trim(),
          creator_id:  userId,
          group_id:    groupId,
          start_time:  eventDate.toISOString(),
          description: `${emoji} ${name.trim()}`,
          is_group_event: true,
        })
        .select('id')
        .single();

      if (eventError) throw eventError;
      const eventId = eventData.id;

      // ── 4. Add creator to event_members ──
      const { error: eventMemberError } = await supabase
        .from('event_members')
        .insert({
          event_id: eventId,
          user_id:  userId,
          role:     'creator',
          rsvp_status: 'accepted',
        });

      if (eventMemberError) throw eventMemberError;

      // ── 5. Build local event object and pass back up ──
      const newEvent: HangoutEvent = {
        id:          eventId,
        groupId:     groupId,
        emoji,
        name:        name.trim(),
        date:        formatDate(eventDate),
        time:        formatTime(eventDate),
        confirmed:   false,
        attendees:   [{ id: userId, name: 'You', color: THEME.gold }],
        outfit:      'Whatever',
        playlist:    '',
        locationName:'',
        locationAddr:'',
        locationLat: null,
        locationLon: null,
        parkingName: '',
        parkingAddr: '',
        parkingNotes:'',
        food:        [],
        misc:        [],
        suggestions: [],
      };

      onCreate(newEvent);
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

        <Text style={cf.label}>PICK A VIBE</Text>
        <View style={cf.emojiRow}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={[cf.emojiBtn, emoji === e && cf.emojiBtnActive]}
              onPress={() => setEmoji(e)}
            >
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

        <Text style={cf.label}>DATE</Text>
        <TouchableOpacity style={cf.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: eventDate ? THEME.text : THEME.textMuted }}>
            {eventDate ? formatDate(eventDate) : 'Select date'}
          </Text>
        </TouchableOpacity>


        {showDatePicker && (
          <DateTimePicker
            value={eventDate ?? new Date()}
            mode="date"
            display="inline"
            onChange={handleDateChange}
          />
        )}

        <Text style={cf.label}>TIME</Text>
        <TouchableOpacity style={cf.input} onPress={() => setShowTimePicker(true)}>
          <Text style={{ color: eventDate ? THEME.text : THEME.textMuted }}>
            {eventDate ? formatTime(eventDate) : 'Select time'}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <>
            <DateTimePicker
              value={eventDate ?? new Date()}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
            <TouchableOpacity 
              style={cf.done} onPress={() => setShowTimePicker(false)}>
              <Text style={{color: THEME.textMuted}}>Done</Text>
            </TouchableOpacity>
          </>
          
        )}

        <TouchableOpacity
          style={[cf.createBtn, (!name.trim() || saving) && cf.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || saving}
        >
          {saving
            ? <ActivityIndicator color="#1a1333" />
            : <Text style={cf.createBtnText}>Create Hangout 🎉</Text>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const cf = StyleSheet.create({
  content:     { padding: GUTTER, paddingTop: 16 },
  backBtn:     { marginBottom: 20 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },
  heading:     { fontSize: 26, fontWeight: '800', color: THEME.text, marginBottom: 28, letterSpacing: -0.5 },
  label:       { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 8 },

  emojiRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  emojiBtn:      { width: 48, height: 48, borderRadius: 14, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive:{ borderColor: THEME.gold, backgroundColor: THEME.goldDim },
  emojiOption:   { fontSize: 24 },

  input: {
    backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder,
    color: THEME.text, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20, fontSize: 15,
  },

  done: {
    backgroundColor: THEME.card, borderRadius: 14, borderWidth: 1, borderColor: THEME.cardBorder,
    color: THEME.text, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20, fontSize: 15, alignSelf: 'flex-start',
  },



  createBtn:        { backgroundColor: THEME.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  createBtnDisabled:{ opacity: 0.4 },
  createBtnText:    { color: '#1a1333', fontWeight: '800', fontSize: 16 },
});

// ── Event Detail ──────────────────────────────────────────────
type DetailTab = 'details' | 'suggestions';

function EventDetail({
  event: initialEvent,
  onBack,
  onConfirm,
}: {
  event: HangoutEvent;
  onBack: () => void;
  onConfirm: (updated: HangoutEvent) => void;
}) {
  const [ev, setEv]               = useState(initialEvent);
  const [editMode, setEditMode]   = useState(!ev.confirmed);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [newFood, setNewFood]     = useState('');
  const [newMisc, setNewMisc]     = useState('');

  function acceptSuggestion(id: string) {
    setEv(prev => ({ ...prev, suggestions: prev.suggestions.map(sg => sg.id === id ? { ...sg, status: 'accepted' } : sg) }));
  }
  function declineSuggestion(id: string) {
    setEv(prev => ({ ...prev, suggestions: prev.suggestions.map(sg => sg.id === id ? { ...sg, status: 'declined' } : sg) }));
  }

  const pendingSuggestions = ev.suggestions.filter(sg => sg.status === 'pending').length;

  const claimFood  = (id: string) => setEv(prev => ({ ...prev, food: prev.food.map(f => f.id === id ? { ...f, claimedBy: f.claimedBy === 'YOU' ? null : 'YOU' } : f) }));
  const claimMisc  = (id: string) => setEv(prev => ({ ...prev, misc: prev.misc.map(m => m.id === id ? { ...m, claimedBy: m.claimedBy === 'YOU' ? null : 'YOU' } : m) }));
  const addFood    = () => { if (!newFood.trim()) return; setEv(prev => ({ ...prev, food: [...prev.food, { id: Date.now().toString(), name: newFood.trim(), claimedBy: null }] })); setNewFood(''); };
  const addMisc    = () => { if (!newMisc.trim()) return; setEv(prev => ({ ...prev, misc: [...prev.misc, { id: Date.now().toString(), name: newMisc.trim(), claimedBy: null }] })); setNewMisc(''); };
  const removeFood = (id: string) => setEv(prev => ({ ...prev, food: prev.food.filter(f => f.id !== id) }));
  const removeMisc = (id: string) => setEv(prev => ({ ...prev, misc: prev.misc.filter(m => m.id !== id) }));

  async function handleConfirmHangout() {
    const confirmedEvent = { ...ev, confirmed: true };
    await saveEventChanges(confirmedEvent);
    setEv(confirmedEvent);
    setEditMode(false);
    onConfirm(confirmedEvent);
  }

  async function handleSaveEdits() {
    const updated = { ...ev };
    await saveEventChanges(updated);
    setEv(updated);
    setEditMode(false);
    onConfirm(updated);
}

  const daysUntil: number = (() => {
  const eventDate = new Date(ev.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const diff = eventDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
})();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              Suggestions{pendingSuggestions > 0 ? ` (${pendingSuggestions})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[ed.editBtn, editMode && ed.editBtnActive]} onPress={() => { if (editMode) {handleSaveEdits();} else { setEditMode(true); }}}>
          <Text style={[ed.editBtnText, editMode && ed.editBtnTextActive]}>{editMode ? 'Done' : '✏️'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={ed.header}>
            <Text style={ed.emoji}>{ev.emoji}</Text>
            <View style={{ flex: 1 }}>
              {editMode
                ? <TextInput style={ed.nameInput} value={ev.name} onChangeText={v => setEv(p => ({ ...p, name: v }))} placeholderTextColor={THEME.textMuted} />
                : <Text style={ed.eventName}>{ev.name}</Text>
              }
              <View style={ed.metaRow}>
                <View style={ed.metaChip}><Text style={ed.metaChipText}>📅 {ev.date}</Text></View>
                <View style={ed.metaChip}><Text style={ed.metaChipText}>🕐 {ev.time}</Text></View>
                {ev.confirmed && <View style={ed.confirmedChip}><Text style={ed.confirmedChipText}>✓ Confirmed</Text></View>}
              </View>
            </View>
          </View>

          {!ev.confirmed && (
            <View style={ed.countdown}>
              <View>
                <Text style={ed.countdownLabel}>Almost time...</Text>
                <Text style={ed.countdownNum}>{daysUntil} day{daysUntil !== 1 ? 's' : ''} until</Text>
                <Text style={ed.countdownEvent}>{ev.name} hangout</Text>
              </View>
              <Text style={ed.countdownMoon}>🌙</Text>
            </View>
          )}

          <Section label="WHO'S COMING">
            <View style={ed.attendeeRow}>
              {ev.attendees.map(a => (
                <View key={a.id} style={[ed.attendeeChip, { borderColor: a.color + '60' }]}>
                  <View style={[ed.attendeeAvatar, { backgroundColor: a.color + '33' }]}>
                    <Text style={[ed.attendeeInitial, { color: a.color }]}>{a.name[0]}</Text>
                  </View>
                  <Text style={ed.attendeeName}>{a.name}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section label="OUTFIT VIBES">
            <View style={ed.chipRow}>
              {OUTFIT_VIBES.map(v => (
                <TouchableOpacity key={v} style={[ed.vibeChip, ev.outfit === v && ed.vibeChipActive]} onPress={() => editMode && setEv(p => ({ ...p, outfit: v }))} activeOpacity={editMode ? 0.7 : 1}>
                  <Text style={[ed.vibeChipText, ev.outfit === v && ed.vibeChipTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section label="MUSIC">
            <View style={ed.musicCard}>
              <Text style={ed.musicIcon}>🎵</Text>
              <View style={{ flex: 1 }}>
                {editMode
                  ? <TextInput style={ed.inlineInput} value={ev.playlist} onChangeText={v => setEv(p => ({ ...p, playlist: v }))} placeholder="Paste playlist link or name" placeholderTextColor={THEME.textMuted} />
                  : <><Text style={ed.musicTitle}>{ev.playlist || 'No playlist added'}</Text><Text style={ed.musicSub}>Tap to open playlist</Text></>
                }
              </View>
            </View>
          </Section>

          <Section label="FOOD & DRINKS">
            {ev.food.map(f => <ListRow key={f.id} item={f} onClaim={() => claimFood(f.id)} onRemove={editMode ? () => removeFood(f.id) : undefined} />)}
            <AddRow value={newFood} onChange={setNewFood} onAdd={addFood} placeholder="Add food or drink..." />
          </Section>

          <Section label="MISC SUPPLIES">
            {ev.misc.map(m => <ListRow key={m.id} item={m} onClaim={() => claimMisc(m.id)} onRemove={editMode ? () => removeMisc(m.id) : undefined} />)}
            <AddRow value={newMisc} onChange={setNewMisc} onAdd={addMisc} placeholder="Add a supply..." />
          </Section>

          <Section label="LOCATION">
            <View style={ed.locationCard}>
              <Text style={ed.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                {editMode ? (
                    <LocationAutocomplete onSelect={( { name, address, latitude, longitude }) =>
                      setEv(prev => ({
                        ...prev,
                        locationName: name,
                        locationAddr: address,
                        locationLat: latitude,
                        locationLon: longitude,
                      }))
                    }
                    />
                ) : (
                  <>
                    <Text style={ed.locationName}>{ev.locationName || 'No location set'}</Text>
                    {ev.locationAddr ? <Text style={ed.locationAddr}>{ev.locationAddr}</Text> : null}
                  </>
                )}
              </View>
            </View>
          </Section>

          <Section label="PARKING">
            <View style={ed.locationCard}>
              <Text style={ed.locationIcon}>🅿️</Text>
              <View style={{ flex: 1 }}>
                {editMode ? (
                  <>
                    <LocationAutocomplete onSelect={( { name, address }) =>
                      setEv(prev => ({
                        ...prev,
                        parkingName: name,
                        parkingAddr: address,
                      }))
                    }
                      />
                    <TextInput style={[ed.parkingNotesInput, { marginTop: 8 }]} value={ev.parkingNotes} onChangeText={v => setEv(p => ({ ...p, parkingNotes: v }))} placeholder="Notes (free after 5pm, etc.)" placeholderTextColor={THEME.textMuted} multiline numberOfLines={3} />
                  </>
                ) : (
                  <>
                    <Text style={ed.locationName}>{ev.parkingName || 'No parking info'}</Text>
                    {ev.parkingNotes ? <Text style={ed.locationAddr}>{ev.parkingNotes}</Text> : null}
                  </>
                )}
              </View>
            </View>
          </Section>

          {!ev.confirmed && (
            <TouchableOpacity style={ed.confirmBtn} onPress={handleConfirmHangout}>
              <Text style={ed.confirmBtnText}>Confirm Hangout ✓</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'suggestions' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={ed.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={sg.intro}>Your crew can drop ideas here. Accept what works, pass on what doesn't.</Text>
          {ev.suggestions.length === 0 ? (
            <View style={sg.emptyState}>
              <Text style={sg.emptyEmoji}>💬</Text>
              <Text style={sg.emptyTitle}>No suggestions yet</Text>
              <Text style={sg.emptySub}>Your crew hasn't suggested anything yet</Text>
            </View>
          ) : (
            ev.suggestions.map(suggestion => (
              <View key={suggestion.id} style={[sg.card, suggestion.status === 'accepted' && sg.cardAccepted, suggestion.status === 'declined' && sg.cardDeclined]}>
                <View style={sg.cardHeader}>
                  <View style={sg.fromBadge}><Text style={sg.fromText}>{suggestion.from[0]}</Text></View>
                  <Text style={sg.fromName}>{suggestion.from} suggested</Text>
                  {suggestion.status !== 'pending' && (
                    <View style={[sg.statusBadge, suggestion.status === 'accepted' ? sg.statusAccepted : sg.statusDeclined]}>
                      <Text style={sg.statusText}>{suggestion.status === 'accepted' ? 'Accepted ✓' : 'Passed'}</Text>
                    </View>
                  )}
                </View>
                <Text style={sg.suggestionText}>{suggestion.text}</Text>
                {suggestion.status === 'pending' && (
                  <View style={sg.actionRow}>
                    <TouchableOpacity style={sg.acceptBtn} onPress={() => acceptSuggestion(suggestion.id)}>
                      <Text style={sg.acceptBtnText}>Sounds good 👍</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={sg.declineBtn} onPress={() => declineSuggestion(suggestion.id)}>
                      <Text style={sg.declineBtnText}>Pass</Text>
                    </TouchableOpacity>
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

function ListRow({ item, onClaim, onRemove }: { item: FoodItem | MiscItem; onClaim: () => void; onRemove?: () => void }) {
  const isYou   = item.claimedBy === 'YOU';
  const isOther = item.claimedBy && !isYou;
  return (
    <View style={ed.listRow}>
      <Text style={ed.listItemName}>{item.name}</Text>
      <View style={ed.listRowRight}>
        {onRemove && <TouchableOpacity style={ed.removeBtn} onPress={onRemove}><Text style={ed.removeBtnText}>✕</Text></TouchableOpacity>}
        <TouchableOpacity style={[ed.claimBtn, isYou && ed.claimBtnYou, isOther && ed.claimBtnOther]} onPress={onClaim} disabled={!!isOther}>
          <Text style={[ed.claimBtnText, isYou && ed.claimBtnTextYou, isOther && ed.claimBtnTextOther]}>{item.claimedBy ?? 'Claim'}</Text>
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

// ── Root screen ───────────────────────────────────────────────
type ViewType = 'list' | 'create' | 'detail';

export default function HangoutsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [view, setView]         = useState<ViewType>('list');
  const [events, setEvents]     = useState<HangoutEvent[]>([]);
  const [selected, setSelected] = useState<HangoutEvent | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // ── Load existing hangouts from Supabase on mount ──
  useEffect(() => {
    if (!userId) return;

    async function loadEvents() {
      try {
        // Get event IDs the user is a member of
        const { data: memberRows, error: memberError } = await supabase
          .from('event_members')
          .select('event_id')
          .eq('user_id', userId);

        if (memberError) throw memberError;

        const eventIds = (memberRows ?? []).map((r: any) => r.event_id);

        if (eventIds.length === 0) {
          setEvents([]);
          setLoadingEvents(false);
          return;
        }

        // Fetch those events
        const { data: eventRows, error: eventError } = await supabase
          .from('events')
          .select('id, title, start_time, description, group_id, location_name, location_address, parking_name, parking_addr, parking_info, latitude, longitude, playlist, outfit, confirmed')
          .in('id', eventIds)
          .order('start_time', { ascending: true });

        if (eventError) throw eventError;

        const loaded: HangoutEvent[] = (eventRows ?? []).map((r: any) => ({
          id:          r.id,
          groupId:     r.group_id ?? '',
          emoji:       r.description?.split(' ')[0] ?? '🎉',
          name:        r.title,
          date:        r.start_time ? new Date(r.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD',
          time:        r.start_time ? new Date(r.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
          confirmed:   r.confirmed,
          attendees:    [{ id: userId, name: 'You', color: THEME.gold }],
          outfit:       r.outfit ?? 'Whatever',
          playlist:     r.playlist ?? '',
          locationName: r.location_name ?? '',
          locationAddr: r.location_address ?? '',
          locationLat:  r.latitude ?? null,
          locationLon:  r.longitude ?? null,
          parkingName:  r.parking_name ?? '',
          parkingAddr:  r.parking_addr ?? '',
          parkingNotes: r.parking_info ?? '',
          food:         [],
          misc:         [],
          suggestions:  [],
        }));

        setEvents(loaded);
      } catch (err: any) {
        Alert.alert('Error loading hangouts', err.message ?? 'Unknown error');
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [userId]);

  function handleSelect(ev: HangoutEvent) {
    setSelected(ev);
    setView('detail');
  }

  function handleCreate(ev: HangoutEvent) {
    setEvents(prev => [ev, ...prev]);
    setSelected(ev);
    setView('detail');
  }

  function handleConfirm(updated: HangoutEvent) {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelected(updated);
  }

  return (
    <View style={root.container}>
      <StatusBar style="light" />
      <HangoutHeader />
      {view === 'list' && (
        <HangoutsList
          events={events}
          loading={loadingEvents}
          onSelect={handleSelect}
          onCreateNew={() => setView('create')}
        />
      )}
      {view === 'create' && (
        <CreateHangoutForm
          userId={userId}
          onBack={() => setView('list')}
          onCreate={handleCreate}
        />
      )}
      {view === 'detail' && selected && (
        <EventDetail event={selected} onBack={() => setView('list')} onConfirm={handleConfirm} />
      )}
    </View>
  );
}

// ── Styles: event detail + suggestions ───────────────────────
const ed = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },
  tabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)', gap: 8 },
  backBtn: {}, backBtnText: { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },
  tabs: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tabActive: { backgroundColor: THEME.purpleDim, borderColor: 'rgba(139,92,246,0.3)' },
  tabText: { fontSize: 13, fontWeight: '600', color: THEME.textMuted },
  tabTextActive: { color: THEME.purpleLight },
  editBtn: { backgroundColor: THEME.purpleDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
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
  countdown: { margin: GUTTER, backgroundColor: THEME.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(250,204,21,0.3)', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countdownLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 4 },
  countdownNum: { fontSize: 28, fontWeight: '800', color: THEME.text },
  countdownEvent: { fontSize: 15, fontWeight: '700', color: THEME.gold, marginTop: 2 },
  countdownMoon: { fontSize: 48 },
  section: { marginHorizontal: GUTTER, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: THEME.purpleMuted, marginBottom: 10 },
  attendeeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendeeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.card, borderRadius: 20, paddingRight: 12, paddingLeft: 4, paddingVertical: 4, borderWidth: 1 },
  attendeeAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attendeeInitial: { fontSize: 12, fontWeight: '700' },
  attendeeName: { fontSize: 13, fontWeight: '600', color: THEME.text },
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
  intro: { marginHorizontal: GUTTER, marginTop: 16, marginBottom: 20, fontSize: 13, color: THEME.textMuted, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: THEME.textMuted },
  card: { marginHorizontal: GUTTER, marginBottom: 12, backgroundColor: THEME.card, borderRadius: 16, borderWidth: 1, borderColor: THEME.cardBorder, padding: 16 },
  cardAccepted: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.06)' },
  cardDeclined: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fromBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.purpleDim, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', alignItems: 'center', justifyContent: 'center' },
  fromText: { fontSize: 12, fontWeight: '800', color: THEME.purpleLight },
  fromName: { flex: 1, fontSize: 13, fontWeight: '600', color: THEME.textMuted },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusAccepted: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  statusDeclined: { backgroundColor: THEME.redDim, borderColor: 'rgba(239,68,68,0.3)' },
  statusText: { fontSize: 11, fontWeight: '700', color: THEME.text },
  suggestionText: { fontSize: 14, color: THEME.text, lineHeight: 20, marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: THEME.green },
  declineBtn: { backgroundColor: THEME.purpleDim, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  declineBtnText: { fontSize: 13, fontWeight: '600', color: THEME.textMuted },
});

const root = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
});