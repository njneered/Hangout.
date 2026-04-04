/**
 * CalendarSync.tsx

 *
 * HOW IT WORKS:
 *   - Apple Calendar: requests permission, reads all events for next 60 days,
 *     converts busy times into the dayMap format the schedule screen uses,
 *     saves to Supabase so teammates can see your availability.
 *   - CSV Import: user picks a .csv file exported from Google Calendar or
 *     any other calendar app, parses it, and does the same thing.
 *
 * CSV FORMAT EXPECTED (Google Calendar export format):
 *   Subject, Start Date, Start Time, End Date, End Time, All Day Event
 *   Game Night, 04/15/2026, 7:00 PM, 04/15/2026, 9:00 PM, False
 */

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import * as Calendar from 'expo-calendar';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  redDim: 'rgba(239,68,68,0.12)',
};

// How many days ahead to import
const DAYS_AHEAD = 60;

type BusyBlock = {
  date: string;   // 'YYYY-M-D' key matching schedule.tsx dateKey format
  hours: number[]; // 0-23 hours that are busy
  allDay: boolean;
};

// ── Helpers ───────────────────────────────────────────────────

function normalizeCalendarDate(value: string | Date, allDay: boolean): Date {
  if (!allDay) return new Date(value);

  if (typeof value === 'string') {
    return new Date(value.split('T')[0]);
  }

  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function hoursInRange(start: Date, end: Date): number[] {
  const hours: number[] = [];
  const s = new Date(start);
  s.setMinutes(0, 0, 0);
  while (s < end && s.getHours() < 24) {
    hours.push(s.getHours());
    s.setHours(s.getHours() + 1);
  }
  return hours;
}

// ── Save busy blocks to Supabase ──────────────────────────────
// Stores availability so the schedule screen + best night algo can use it.
// Table: user_availability (create via SQL below if it doesn't exist)
//
// SQL to run in Supabase:
// CREATE TABLE user_availability (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   date_key text NOT NULL,
//   busy_hours integer[] NOT NULL DEFAULT '{}',
//   all_day boolean NOT NULL DEFAULT false,
//   updated_at timestamp with time zone DEFAULT now(),
//   UNIQUE(user_id, date_key)
// );
// ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users manage own availability"
//   ON user_availability FOR ALL
//   USING (auth.uid() = user_id)
//   WITH CHECK (auth.uid() = user_id);

async function saveBusyBlocks(userId: string, blocks: BusyBlock[]) {
  if (blocks.length === 0) return;

  const rows = blocks.map(b => ({
    user_id:    userId,
    date_key:   b.date,
    busy_hours: b.hours,
    all_day:    b.allDay,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_availability')
    .upsert(rows, { onConflict: 'user_id,date_key' });

  if (error) throw error;
}

// ── Parse CSV ─────────────────────────────────────────────────
function parseCSV(text: string): BusyBlock[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Find header indices
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const idx = {
    startDate: headers.findIndex(h => h === 'start date'),
    startTime: headers.findIndex(h => h === 'start time'),
    endDate:   headers.findIndex(h => h === 'end date'),
    endTime:   headers.findIndex(h => h === 'end time'),
    allDay:    headers.findIndex(h => h === 'all day event'),
  };

  if (idx.startDate === -1) {
    throw new Error('CSV must have a "Start Date" column. Export from Google Calendar or Apple Calendar.');
  }

  const blocks: BusyBlock[] = [];
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() + DAYS_AHEAD);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;

    try {
      const startDateStr = cols[idx.startDate];
      const startTimeStr = idx.startTime >= 0 ? cols[idx.startTime] : '12:00 AM';
      const endDateStr   = idx.endDate >= 0 ? cols[idx.endDate] : startDateStr;
      const endTimeStr   = idx.endTime >= 0 ? cols[idx.endTime] : '11:59 PM';
      const isAllDay     = idx.allDay >= 0 ? cols[idx.allDay].toLowerCase() === 'true' : false;

      const start = new Date(`${startDateStr} ${startTimeStr}`);
      const end   = new Date(`${endDateStr} ${endTimeStr}`);

      if (isNaN(start.getTime()) || start < now || start > cutoff) continue;

      if (isAllDay) {
        blocks.push({ date: dateKey(start), hours: [], allDay: true });
      } else {
        blocks.push({ date: dateKey(start), hours: hoursInRange(start, end), allDay: false });
      }
    } catch {
      continue;
    }
  }

  return blocks;
}

// ── Main Screen ───────────────────────────────────────────────
export default function CalendarSyncScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [syncingApple, setSyncingApple] = useState(false);
  const [importingCSV, setImportingCSV] = useState(false);
  const [lastSync, setLastSync]         = useState<string | null>(null);
  const [blocksImported, setBlocksImported] = useState<number | null>(null);

  // ── Apple Calendar sync ──
  async function handleAppleSync() {
    if (!userId) return;
    setSyncingApple(true);

    try {
      // Request permission
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Hangout needs calendar access to read your busy times. Enable it in Settings > Hangout > Calendars.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get all calendars
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(c => c.id);
      

      // Fetch events for next 60 days
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + DAYS_AHEAD);

      const events = await Calendar.getEventsAsync(calendarIds, now, future);

      // Convert to busy blocks
      const blockMap: Record<string, BusyBlock> = {};

      for (const event of events) {
        const allDay  = event.allDay ?? false;
        const start = normalizeCalendarDate(event.startDate, allDay);
        const end = normalizeCalendarDate(event.endDate, allDay);
        const key     = dateKey(start);

        if (!blockMap[key]) {
          blockMap[key] = { date: key, hours: [], allDay: false };
        }

        if (allDay) {
          blockMap[key].allDay = true;
          blockMap[key].hours  = [];
        } else if (!blockMap[key].allDay) {
          const newHours = hoursInRange(start, end);
          blockMap[key].hours = [
            ...new Set([...blockMap[key].hours, ...newHours])
          ];
        }
      }
      //console.log('calendarIds:', calendarIds);
      //console.log('events found:', events.length);
      //console.log('raw events:', events);
      //console.log('blocks built:', Object.values(blockMap));

      const blocks = Object.values(blockMap);
      await saveBusyBlocks(userId, blocks);

      setBlocksImported(blocks.length);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

      Alert.alert(
        'Calendar Synced! 🎉',
        `Imported busy times from ${blocks.length} day${blocks.length !== 1 ? 's' : ''} over the next ${DAYS_AHEAD} days.`,
        [{ text: 'Done' }]
      );
    } catch (err: any) {
      Alert.alert('Sync failed', err.message ?? 'Unknown error');
    } finally {
      setSyncingApple(false);
    }

    
  }

  // ── CSV import ──
  async function handleCSVImport() {
    if (!userId) return;
    setImportingCSV(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setImportingCSV(false);
        return;
      }

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();

      const blocks = parseCSV(text);

      if (blocks.length === 0) {
        Alert.alert(
          'No events found',
          'Make sure your CSV has "Start Date", "Start Time", "End Date", "End Time" columns. Try exporting directly from Google Calendar.'
        );
        return;
      }

      await saveBusyBlocks(userId, blocks);

      setBlocksImported(blocks.length);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

      Alert.alert(
        'CSV Imported! 🎉',
        `Imported busy times from ${blocks.length} day${blocks.length !== 1 ? 's' : ''}.`,
        [{ text: 'Done' }]
      );
    } catch (err: any) {
      Alert.alert('Import failed', err.message ?? 'Unknown error');
    } finally {
      setImportingCSV(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar Sync</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Explainer */}
        <View style={styles.explainerCard}>
          <Text style={styles.explainerTitle}>📅 Auto-block your busy times</Text>
          <Text style={styles.explainerText}>
            Import your calendar so Hangout can automatically mark when you're busy.
            Your friends will see your availability without you manually blocking every day.
          </Text>
        </View>

        {/* Last sync status */}
        {lastSync && (
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>✅</Text>
            <View>
              <Text style={styles.statusTitle}>Last synced at {lastSync}</Text>
              <Text style={styles.statusSub}>
                {blocksImported} day{blocksImported !== 1 ? 's' : ''} of busy time imported
              </Text>
            </View>
          </View>
        )}

        {/* Apple Calendar */}
        <Text style={styles.sectionLabel}>APPLE CALENDAR</Text>
        <View style={styles.optionCard}>
          <View style={styles.optionLeft}>
            <Text style={styles.optionIcon}>🗓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Sync from Device</Text>
              <Text style={styles.optionSub}>
                Reads all calendars on this iPhone for the next {DAYS_AHEAD} days
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, syncingApple && styles.syncBtnLoading]}
            onPress={handleAppleSync}
            disabled={syncingApple || importingCSV}
            activeOpacity={0.8}
          >
            {syncingApple
              ? <ActivityIndicator size="small" color="#1a1333" />
              : <Text style={styles.syncBtnText}>Sync</Text>
            }
          </TouchableOpacity>
        </View>

        {/* CSV Import */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>GOOGLE CALENDAR / OTHER</Text>
        <View style={styles.optionCard}>
          <View style={styles.optionLeft}>
            <Text style={styles.optionIcon}>📂</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Import CSV File</Text>
              <Text style={styles.optionSub}>
                Export from Google Calendar or any app and import here
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, styles.syncBtnSecondary, importingCSV && styles.syncBtnLoading]}
            onPress={handleCSVImport}
            disabled={syncingApple || importingCSV}
            activeOpacity={0.8}
          >
            {importingCSV
              ? <ActivityIndicator size="small" color={THEME.purpleLight} />
              : <Text style={[styles.syncBtnText, styles.syncBtnTextSecondary]}>Import</Text>
            }
          </TouchableOpacity>
        </View>

        {/* CSV instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to export from Google Calendar:</Text>
          <Text style={styles.instructionsStep}>1. Go to calendar.google.com on a computer</Text>
          <Text style={styles.instructionsStep}>2. Click Settings ⚙️ → Settings</Text>
          <Text style={styles.instructionsStep}>3. Click "Import & Export" → Export</Text>
          <Text style={styles.instructionsStep}>4. Unzip the downloaded file</Text>
          <Text style={styles.instructionsStep}>5. AirDrop the .ics file to your phone... wait</Text>
          <Text style={styles.instructionsNote}>
            💡 Actually for Google Calendar, export as CSV from a third-party tool like{' '}
            <Text style={{ color: THEME.purpleLight }}>gcal2csv.com</Text> for best compatibility.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.12)',
  },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: THEME.text },
  backBtn:      { width: 60 },
  backBtnText:  { fontSize: 14, fontWeight: '600', color: THEME.purpleLight },

  explainerCard: {
    margin: 20,
    marginBottom: 16,
    backgroundColor: THEME.purpleDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
  },
  explainerTitle: { fontSize: 15, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  explainerText:  { fontSize: 13, color: THEME.purpleLight, lineHeight: 19 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: THEME.greenDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    padding: 14,
  },
  statusIcon:  { fontSize: 20 },
  statusTitle: { fontSize: 14, fontWeight: '600', color: THEME.green },
  statusSub:   { fontSize: 12, color: THEME.textMuted, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: THEME.textMuted,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
    gap: 12,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexShrink: 1 },
  optionIcon:  { fontSize: 28 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: THEME.text, marginBottom: 3, flexShrink: 1 },
  optionSub:   { fontSize: 12, color: THEME.textMuted, lineHeight: 17, flexShrink: 1 },

  syncBtn: {
    backgroundColor: THEME.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 64,
    alignItems: 'center',
  },
  syncBtnSecondary: {
    backgroundColor: THEME.purpleActive,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  syncBtnLoading:       { opacity: 0.6 },
  syncBtnText:          { fontSize: 13, fontWeight: '800', color: '#1a1333' },
  syncBtnTextSecondary: { color: THEME.purpleLight },

  instructionsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.1)',
    padding: 16,
  },
  instructionsTitle: { fontSize: 13, fontWeight: '700', color: THEME.textMuted, marginBottom: 10 },
  instructionsStep:  { fontSize: 12, color: THEME.textMuted, marginBottom: 5, lineHeight: 18 },
  instructionsNote:  { fontSize: 12, color: THEME.textMuted, marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
});