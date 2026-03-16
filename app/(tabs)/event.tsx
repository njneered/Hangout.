import HangoutHeader from '@/components/HangoutHeader';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    Dimensions,
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OUTFIT_VIBES = ['Whatever', 'Comfy / PJs', 'Formal', 'Cosplay', 'Themed', 'Matching'];

// ── Mock data (will be replaced by Supabase) ──
const MOCK_ATTENDEES = [
  { id: '1', name: 'You',      color: THEME.gold },
  { id: '2', name: 'Sandy',    color: '#ef4444' },
  { id: '3', name: 'Brittany', color: THEME.purple },
  { id: '4', name: 'Josh',     color: THEME.green },
];

interface FoodItem  { id: string; name: string; claimedBy: string | null; }
interface MiscItem  { id: string; name: string; claimedBy: string | null; }

export default function EventScreen() {
  const [editMode, setEditMode] = useState(false);

  // Event meta
  const [eventName, setEventName]   = useState('Game Night');
  const [eventDate, setEventDate]   = useState('Friday, March 13');
  const [eventTime, setEventTime]   = useState('7:30 PM');

  // Outfit
  const [selectedOutfit, setSelectedOutfit] = useState('Cosplay');

  // Music
  const [playlistLink, setPlaylistLink] = useState("Josh's Game Night Playlist");

  // Location
  const [locationText, setLocationText]   = useState('Reitz Game Room');
  const [locationSub, setLocationSub]     = useState('655 Reitz Union Drive, Gainesville, FL 32611');

  // Parking
  const [parkingText, setParkingText]     = useState('Parking Garage 10');
  const [parkingNotes, setParkingNotes]   = useState('Free after 5 PM on weekdays. Enter from Museum Rd.');

  // Food list
  const [foodItems, setFoodItems] = useState<FoodItem[]>([
    { id: '1', name: 'Pizza 🍕',     claimedBy: 'JOSH' },
    { id: '2', name: 'Drinks 🥤',    claimedBy: 'SANDY' },
    { id: '3', name: 'Chips & Dip 🥔', claimedBy: 'BRITTNEY' },
    { id: '4', name: 'Popcorn 🍿',   claimedBy: null },
    { id: '5', name: 'Publix Chicken 🍗', claimedBy: 'YOU' },
  ]);
  const [newFood, setNewFood] = useState('');

  // Misc list
  const [miscItems, setMiscItems] = useState<MiscItem[]>([
    { id: '1', name: 'Paper Plates 🍽️', claimedBy: 'YOU' },
    { id: '2', name: 'Napkins',          claimedBy: null },
    { id: '3', name: 'Cups 🥤',          claimedBy: 'SANDY' },
  ]);
  const [newMisc, setNewMisc] = useState('');

  // ── Days until countdown ──
  const daysUntil: number = 2;

  const claimFood = (id: string) => {
    setFoodItems(prev => prev.map(f =>
      f.id === id ? { ...f, claimedBy: f.claimedBy === 'YOU' ? null : 'YOU' } : f
    ));
  };

  const claimMisc = (id: string) => {
    setMiscItems(prev => prev.map(m =>
      m.id === id ? { ...m, claimedBy: m.claimedBy === 'YOU' ? null : 'YOU' } : m
    ));
  };

  const addFood = () => {
    if (!newFood.trim()) return;
    setFoodItems(prev => [...prev, { id: Date.now().toString(), name: newFood.trim(), claimedBy: null }]);
    setNewFood('');
  };

  const addMisc = () => {
    if (!newMisc.trim()) return;
    setMiscItems(prev => [...prev, { id: Date.now().toString(), name: newMisc.trim(), claimedBy: null }]);
    setNewMisc('');
  };

  const removeFood = (id: string) => setFoodItems(prev => prev.filter(f => f.id !== id));
  const removeMisc = (id: string) => setMiscItems(prev => prev.filter(m => m.id !== id));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <HangoutHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              {editMode ? (
                <TextInput
                  style={styles.eventNameInput}
                  value={eventName}
                  onChangeText={setEventName}
                  placeholder="Event name"
                  placeholderTextColor={THEME.textMuted}
                />
              ) : (
                <Text style={styles.eventName}>{eventName}</Text>
              )}
              <View style={styles.eventMeta}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>📅 {eventDate}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>🕐 {eventTime}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, editMode && styles.editBtnActive]}
              onPress={() => setEditMode(e => !e)}
            >
              <Text style={[styles.editBtnText, editMode && styles.editBtnTextActive]}>
                {editMode ? 'Done' : '✏️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Countdown banner ── */}
        <View style={styles.countdown}>
          <View style={styles.countdownLeft}>
            <Text style={styles.countdownLabel}>Almost time...</Text>
            <Text style={styles.countdownNum}>
              {daysUntil} day{daysUntil !== 1 ? 's' : ''} until
            </Text>
            <Text style={styles.countdownEvent}>{eventName} hangout</Text>
          </View>
          <Text style={styles.countdownMoon}>🌙</Text>
        </View>

        {/* ── Who's coming ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHO'S COMING</Text>
          <View style={styles.attendeeRow}>
            {MOCK_ATTENDEES.map(a => (
              <View key={a.id} style={[styles.attendeeChip, { borderColor: a.color + '60' }]}>
                <View style={[styles.attendeeAvatar, { backgroundColor: a.color + '33' }]}>
                  <Text style={[styles.attendeeAvatarText, { color: a.color }]}>
                    {a.name[0]}
                  </Text>
                </View>
                <Text style={styles.attendeeName}>{a.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Outfit vibes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OUTFIT VIBES</Text>
          <View style={styles.chipRow}>
            {OUTFIT_VIBES.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.vibeChip, selectedOutfit === v && styles.vibeChipActive]}
                onPress={() => editMode || setSelectedOutfit(v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.vibeChipText, selectedOutfit === v && styles.vibeChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Music ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MUSIC</Text>
          <View style={styles.musicCard}>
            <Text style={styles.musicIcon}>🎵</Text>
            <View style={{ flex: 1 }}>
              {editMode ? (
                <TextInput
                  style={styles.musicInput}
                  value={playlistLink}
                  onChangeText={setPlaylistLink}
                  placeholder="Paste playlist link or name"
                  placeholderTextColor={THEME.textMuted}
                />
              ) : (
                <>
                  <Text style={styles.musicTitle}>{playlistLink}</Text>
                  <Text style={styles.musicSub}>Tap to open playlist</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Food list ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FOOD & DRINKS</Text>
          {foodItems.map(f => (
            <View key={f.id} style={styles.listRow}>
              <Text style={styles.listItemName}>{f.name}</Text>
              <View style={styles.listRowRight}>
                {editMode && (
                  <TouchableOpacity onPress={() => removeFood(f.id)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.claimBtn,
                    f.claimedBy === 'YOU' && styles.claimBtnYou,
                    f.claimedBy && f.claimedBy !== 'YOU' && styles.claimBtnOther,
                  ]}
                  onPress={() => claimFood(f.id)}
                  disabled={!!f.claimedBy && f.claimedBy !== 'YOU'}
                >
                  <Text style={[
                    styles.claimBtnText,
                    f.claimedBy === 'YOU' && styles.claimBtnTextYou,
                    f.claimedBy && f.claimedBy !== 'YOU' && styles.claimBtnTextOther,
                  ]}>
                    {f.claimedBy ?? 'CLAIM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newFood}
              onChangeText={setNewFood}
              placeholder="Add food item..."
              placeholderTextColor={THEME.textMuted}
              onSubmitEditing={addFood}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addFood}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Misc list ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MISC (SUPPLIES & EXTRAS)</Text>
          {miscItems.map(m => (
            <View key={m.id} style={styles.listRow}>
              <Text style={styles.listItemName}>{m.name}</Text>
              <View style={styles.listRowRight}>
                {editMode && (
                  <TouchableOpacity onPress={() => removeMisc(m.id)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.claimBtn,
                    m.claimedBy === 'YOU' && styles.claimBtnYou,
                    m.claimedBy && m.claimedBy !== 'YOU' && styles.claimBtnOther,
                  ]}
                  onPress={() => claimMisc(m.id)}
                  disabled={!!m.claimedBy && m.claimedBy !== 'YOU'}
                >
                  <Text style={[
                    styles.claimBtnText,
                    m.claimedBy === 'YOU' && styles.claimBtnTextYou,
                    m.claimedBy && m.claimedBy !== 'YOU' && styles.claimBtnTextOther,
                  ]}>
                    {m.claimedBy ?? 'CLAIM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newMisc}
              onChangeText={setNewMisc}
              placeholder="Add item (plates, napkins...)"
              placeholderTextColor={THEME.textMuted}
              onSubmitEditing={addMisc}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMisc}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOCATION</Text>
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              {editMode ? (
                <>
                  <TextInput
                    style={styles.locationInput}
                    value={locationText}
                    onChangeText={setLocationText}
                    placeholder="Search location..."
                    placeholderTextColor={THEME.textMuted}
                  />
                  <TextInput
                    style={[styles.locationInput, { marginTop: 6, fontSize: 12 }]}
                    value={locationSub}
                    onChangeText={setLocationSub}
                    placeholder="Address (auto-fills from search)"
                    placeholderTextColor={THEME.textMuted}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.locationName}>{locationText}</Text>
                  <Text style={styles.locationAddress}>{locationSub}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Parking ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PARKING</Text>
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>🅿️</Text>
            <View style={{ flex: 1 }}>
              {editMode ? (
                <>
                  <TextInput
                    style={styles.locationInput}
                    value={parkingText}
                    onChangeText={setParkingText}
                    placeholder="Search parking location..."
                    placeholderTextColor={THEME.textMuted}
                  />
                  <Text style={styles.parkingNotesLabel}>Parking notes</Text>
                  <TextInput
                    style={styles.parkingNotesInput}
                    value={parkingNotes}
                    onChangeText={setParkingNotes}
                    placeholder="e.g. Free after 5 PM, enter from Museum Rd..."
                    placeholderTextColor={THEME.textMuted}
                    multiline
                    numberOfLines={4 as any}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.locationName}>{parkingText}</Text>
                  {parkingNotes ? (
                    <Text style={styles.locationAddress}>{parkingNotes}</Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Confirm button ── */}
        <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Confirm event ✓</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // ── Header ──
  header: {
    paddingTop: 16,
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventName: {
    fontSize: 30,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  eventNameInput: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.text,
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.purple,
    paddingBottom: 4,
    marginBottom: 10,
  },
  eventMeta:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  metaChipText:  { fontSize: 12, fontWeight: '600', color: THEME.textSub },

  editBtn: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    marginTop: 4,
  },
  editBtnActive:     { backgroundColor: THEME.gold, borderColor: THEME.gold },
  editBtnText:       { fontSize: 14, color: THEME.purpleLight, fontWeight: '600' },
  editBtnTextActive: { color: '#1a1333', fontWeight: '700' },

  // ── Countdown ──
  countdown: {
    marginHorizontal: GUTTER,
    marginBottom: 20,
    backgroundColor: 'rgba(250,204,21,0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.3)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownLeft:  {},
  countdownLabel: { fontSize: 12, color: THEME.textMuted, marginBottom: 4 },
  countdownNum:   { fontSize: 28, fontWeight: '800', color: THEME.text },
  countdownEvent: { fontSize: 15, fontWeight: '700', color: THEME.gold, marginTop: 2 },
  countdownMoon:  { fontSize: 48 },

  // ── Section ──
  section: {
    marginHorizontal: GUTTER,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: THEME.purpleMuted,
    marginBottom: 10,
  },

  // ── Attendees ──
  attendeeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.card,
    borderRadius: 20,
    paddingRight: 12,
    paddingLeft: 4,
    paddingVertical: 4,
    borderWidth: 1,
  },
  attendeeAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  attendeeAvatarText: { fontSize: 12, fontWeight: '700' },
  attendeeName:       { fontSize: 13, fontWeight: '600', color: THEME.text },

  // ── Outfit vibes ──
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  vibeChipActive:     { backgroundColor: THEME.gold, borderColor: THEME.gold },
  vibeChipText:       { fontSize: 13, fontWeight: '600', color: THEME.textSub },
  vibeChipTextActive: { color: '#1a1333', fontWeight: '700' },

  // ── Music ──
  musicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
  },
  musicIcon:  { fontSize: 22 },
  musicTitle: { fontSize: 14, fontWeight: '600', color: THEME.text },
  musicSub:   { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  musicInput: {
    fontSize: 14,
    color: THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: THEME.purple,
    paddingBottom: 2,
  },

  // ── List rows (food + misc) ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  listItemName:  { fontSize: 14, fontWeight: '500', color: THEME.text, flex: 1 },
  listRowRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn:     { padding: 4 },
  removeBtnText: { fontSize: 12, color: THEME.red, fontWeight: '700' },

  claimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  claimBtnYou:   { backgroundColor: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.4)' },
  claimBtnOther: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
  claimBtnText:      { fontSize: 11, fontWeight: '700', color: THEME.purpleLight },
  claimBtnTextYou:   { color: THEME.gold },
  claimBtnTextOther: { color: THEME.green },

  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    backgroundColor: 'rgba(30,24,56,0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: THEME.text,
  },
  addBtn: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: THEME.purpleLight },

  // ── Location + Parking ──
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: THEME.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
  },
  locationIcon:    { fontSize: 20, marginTop: 2 },
  locationName:    { fontSize: 14, fontWeight: '600', color: THEME.text },
  locationAddress: { fontSize: 12, color: THEME.textMuted, marginTop: 3, lineHeight: 17 },
  locationInput: {
    fontSize: 14,
    color: THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: THEME.purple,
    paddingBottom: 2,
  },
  parkingNotesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  parkingNotesInput: {
    fontSize: 13,
    color: THEME.text,
    backgroundColor: 'rgba(20,16,44,0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    padding: 10,
    lineHeight: 18,
    textAlignVertical: 'top',
  },

  // ── Confirm ──
  confirmBtn: {
    marginHorizontal: GUTTER,
    marginTop: 8,
    backgroundColor: THEME.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#1a1333' },
});
