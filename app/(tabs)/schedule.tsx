import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type DayState = 'free' | 'unavailable' | 'partial';
type ViewMode = 'monthly' | 'weekly';

interface DayData {
  state: DayState;
  busyHours?: Set<number>;
}

const THEME = {
  bg: '#0d0d18',
  card: '#12112a',
  cardBorder: 'rgba(255,255,255,0.07)',
  gold: '#ffc84a',
  goldDim: 'rgba(255,200,74,0.15)',
  pink: '#ff85e8',
  blue: '#7ec8e3',
  red: 'rgba(255,80,80,0.8)',
  redDim: 'rgba(255,80,80,0.18)',
  green: '#64dc96',
  greenDim: 'rgba(100,220,150,0.15)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.35)',
  textDim: 'rgba(255,255,255,0.55)',
};

const FRIENDS = [
  { name: 'Bryan', color: THEME.gold, busyDays: [1, 3, 6] },
  { name: 'Mia', color: THEME.pink, busyDays: [0, 4, 5] },
  { name: 'Jake', color: THEME.blue, busyDays: [2, 5] },
];

const HOURS = [
  '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
  '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM', '10 PM',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GUTTER = 20;
const WEEK_TIME_W = 44;
const WEEK_CELL_W = (SCREEN_WIDTH - GUTTER * 2 - WEEK_TIME_W) / 7;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GUTTER * 2 - 12) / 7);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`;
}

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

export default function ScheduleScreen() {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayMap, setDayMap] = useState<Record<string, DayData>>({});
  const [paintMode, setPaintMode] = useState(false);

  const getBestNight = useCallback((): { key: string; date: Date } | null => {
    if (Object.keys(dayMap).length === 0) return null;
    let best: { key: string; date: Date; score: number } | null = null;
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const key = dateKey(year, month, d);
      const data = dayMap[key];
      if (data?.state === 'unavailable') continue;
      const dayOfWeek = new Date(year, month, d).getDay();
      let score = FRIENDS.length;
      FRIENDS.forEach(f => { if (f.busyDays.includes(dayOfWeek)) score -= 1; });
      if (data?.state === 'partial') score -= 0.5;
      if (!best || score > best.score) {
        best = { key, date: new Date(year, month, d), score };
      }
    }
    return best ? { key: best.key, date: best.date } : null;
  }, [dayMap, year, month]);

  const bestNight = getBestNight();

  const toggleDay = (key: string) => {
    setDayMap(prev => {
      const current = prev[key];
      if (!current || current.state === 'free') {
        return { ...prev, [key]: { state: 'unavailable', busyHours: new Set() } };
      } else {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  const paintCell = useCallback((key: string, hourIdx: number, toBusy: boolean) => {
    setDayMap(prev => {
      const current = prev[key] || { state: 'partial', busyHours: new Set<number>() };
      const hours = new Set(current.busyHours || []);
      if (toBusy) hours.add(hourIdx);
      else hours.delete(hourIdx);
      return {
        ...prev,
        [key]: { state: hours.size > 0 ? 'partial' : 'free', busyHours: hours },
      };
    });
  }, []);

  const renderMonthly = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: React.JSX.Element[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calCell} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      const data = dayMap[key];
      const isToday =
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
      const isBest = bestNight?.key === key;
      const isUnavail = data?.state === 'unavailable';
      const isPartial = data?.state === 'partial' && (data.busyHours?.size ?? 0) > 0;

      const cellStyle: any[] = [styles.calCell, styles.calCellBase];
      const dateStyle: any[] = [styles.calDate];
      let subLabel = '';

      if (isUnavail) {
        cellStyle.push(styles.calCellUnavail);
        dateStyle.push(styles.calDateUnavail);
        subLabel = 'out';
      } else if (isPartial) {
        cellStyle.push(styles.calCellPartial);
        dateStyle.push(styles.calDatePartial);
        subLabel = 'partial';
      } else if (isBest) {
        cellStyle.push(styles.calCellBest);
        dateStyle.push(styles.calDateBest);
        subLabel = '✨ best';
      } else if (isToday) {
        cellStyle.push(styles.calCellToday);
      }

      cells.push(
        <TouchableOpacity
          key={key}
          style={cellStyle}
          onPress={() => toggleDay(key)}
          activeOpacity={0.7}
        >
          <Text style={dateStyle}>{d}</Text>
          {subLabel ? <Text style={styles.calSub}>{subLabel}</Text> : null}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.monthGrid}>
        <View style={styles.dayHeaderRow}>
          {DAY_NAMES.map(d => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>{cells}</View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.redDim, borderColor: THEME.red, borderWidth: 1 }]} />
            <Text style={styles.legendText}>Tap = unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.greenDim, borderColor: THEME.green, borderWidth: 1 }]} />
            <Text style={styles.legendText}>Green = best night</Text>
          </View>
        </View>
      </View>
    );
  };

  const weekDates = getWeekDates(weekOffset);

  const renderWeekly = () => (
    <View style={styles.weekContainer}>
      <TouchableOpacity
        style={[styles.paintBanner, paintMode && styles.paintBannerActive]}
        onPress={() => setPaintMode(p => !p)}
      >
        <Text style={[styles.paintBannerText, paintMode && styles.paintBannerTextActive]}>
          {paintMode
            ? '🎨 Drag mode ON — tap cells to mark busy · tap here to exit'
            : 'Hold a cell to enter drag mode'}
        </Text>
      </TouchableOpacity>

      <View style={styles.weekHeader}>
        <View style={styles.weekTimeGutter} />
        {weekDates.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <View key={i} style={styles.weekDayCol}>
              <Text style={styles.weekDayName}>{DAY_NAMES[d.getDay()]}</Text>
              <View style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                <Text style={[styles.weekDayNumText, isToday && styles.weekDayNumTextToday]}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.weekScroll}
        scrollEnabled={!paintMode}
        showsVerticalScrollIndicator={false}
      >
        {HOURS.map((hour, hi) => (
          <View key={hi} style={styles.weekRow}>
            <Text style={styles.weekTimeLabel}>{hour}</Text>
            {weekDates.map((d, di) => {
              const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
              const data = dayMap[key];
              const isBusy =
                data?.state === 'unavailable' ||
                (data?.state === 'partial' && data.busyHours?.has(hi));
              const friendPips = FRIENDS.filter(f => f.busyDays.includes(di));

              return (
                <TouchableOpacity
                  key={di}
                  style={[styles.weekCell, isBusy && styles.weekCellBusy]}
                  onPress={() => { if (paintMode) paintCell(key, hi, !isBusy); }}
                  onLongPress={() => {
                    setPaintMode(true);
                    paintCell(key, hi, !isBusy);
                  }}
                  activeOpacity={paintMode ? 0.6 : 1}
                  delayLongPress={400}
                >
                  {!isBusy && friendPips.length > 0 && (
                    <View style={styles.pipRow}>
                      {friendPips.map(f => (
                        <View key={f.name} style={[styles.pip, { backgroundColor: f.color }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.weekLegend}>
        {FRIENDS.map(f => (
          <View key={f.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: f.color + '55', borderColor: f.color, borderWidth: 1 }]} />
            <Text style={styles.legendText}>{f.name}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.redDim, borderColor: THEME.red, borderWidth: 1 }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find a night 🌙</Text>
          <Text style={styles.headerSub}>
            {viewMode === 'monthly'
              ? "Tap a day you're unavailable"
              : 'Hold a cell + drag to paint your busy hours'}
          </Text>
        </View>

        {bestNight && (
          <View style={styles.bestBanner}>
            <View style={styles.bestBannerLeft}>
              <Text style={styles.bestBannerEmoji}>✨</Text>
              <View>
                <Text style={styles.bestBannerLabel}>Best night for everyone</Text>
                <Text style={styles.bestBannerDate}>
                  {bestNight.date.toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bestBannerBtn}>
              <Text style={styles.bestBannerBtnText}>Lock it in →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.toggleRow}>
          {(['monthly', 'weekly'] as ViewMode[]).map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, viewMode === v && styles.toggleBtnActive]}
              onPress={() => setViewMode(v)}
            >
              <Text style={[styles.toggleText, viewMode === v && styles.toggleTextActive]}>
                {v === 'monthly' ? '📅 Monthly' : '🗓 Weekly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => viewMode === 'monthly'
              ? (month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1))
              : setWeekOffset(w => w - 1)
            }
          >
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navLabel}>
            {viewMode === 'monthly'
              ? `${MONTH_NAMES[month]} ${year}`
              : `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            }
          </Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => viewMode === 'monthly'
              ? (month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1))
              : setWeekOffset(w => w + 1)
            }
          >
            <Text style={styles.navBtnText}>→</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'monthly' ? renderMonthly() : renderWeekly()}
      </ScrollView>
    </View>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1, flexGrow: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: THEME.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 4 },
  bestBanner: {
    marginHorizontal: GUTTER,
    marginBottom: 16,
    backgroundColor: THEME.greenDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.green + '55',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bestBannerEmoji: { fontSize: 24 },
  bestBannerLabel: { fontSize: 11, color: THEME.green, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  bestBannerDate: { fontSize: 15, color: THEME.text, fontWeight: '600', marginTop: 2 },
  bestBannerBtn: { backgroundColor: THEME.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  bestBannerBtnText: { fontSize: 13, fontWeight: '700', color: '#0d0d18' },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: THEME.gold },
  toggleText: { fontSize: 13, fontWeight: '600', color: THEME.textMuted },
  toggleTextActive: { color: '#1a1530' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    marginBottom: 14,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navBtnText: { fontSize: 14, color: THEME.textDim },
  navLabel: { fontSize: 15, fontWeight: '600', color: THEME.text },
  monthGrid: { paddingHorizontal: GUTTER },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { 
    width: CELL_SIZE, 
    textAlign: 'center', 
    fontSize: 11, 
    color: THEME.textMuted, 
    fontWeight: '600' 
  },  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  calCell: { 
    width: CELL_SIZE, 
    height: CELL_SIZE, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
  },

calCellBase: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: THEME.cardBorder },
  calCellUnavail: { backgroundColor: THEME.redDim, borderColor: 'rgba(255,80,80,0.4)' },
  calCellPartial: { backgroundColor: 'rgba(255,200,74,0.1)', borderColor: 'rgba(255,200,74,0.35)' },
  calCellBest: { backgroundColor: THEME.greenDim, borderColor: THEME.green + '55' },
  calCellToday: { borderColor: 'rgba(255,200,74,0.5)', borderWidth: 1.5 },
  calDate: { fontSize: 14, fontWeight: '500', color: THEME.text },
  calDateUnavail: { color: 'rgba(255,255,255,0.3)' },
  calDatePartial: { color: THEME.gold },
  calDateBest: { color: THEME.green },
  calSub: { fontSize: 8, color: THEME.textMuted, marginTop: 1 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: THEME.textMuted },
  weekContainer: { paddingHorizontal: GUTTER },
  paintBanner: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  paintBannerActive: { backgroundColor: 'rgba(255,200,74,0.1)', borderColor: 'rgba(255,200,74,0.35)' },
  paintBannerText: { fontSize: 12, color: THEME.textMuted },
  paintBannerTextActive: { color: THEME.gold, fontWeight: '600' },
  weekHeader: {
    flexDirection: 'row',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    backgroundColor: THEME.bg,
  },
  weekTimeGutter: { width: WEEK_TIME_W, height: 48 },
  weekDayCol: {
    width: WEEK_CELL_W,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  weekDayName: { fontSize: 10, color: THEME.textMuted, fontWeight: '600' },
  weekDayNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weekDayNumToday: { backgroundColor: THEME.gold },
  weekDayNumText: { fontSize: 13, fontWeight: '600', color: THEME.text },
  weekDayNumTextToday: { color: '#1a1530' },
  weekScroll: {
    maxHeight: 360,
    borderWidth: 0.5,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  weekRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  weekTimeLabel: { width: WEEK_TIME_W, height: 44, fontSize: 10, color: THEME.textMuted, textAlign: 'right', paddingRight: 6, paddingTop: 4 },
  weekCell: {
    width: WEEK_CELL_W,
    height: 44,
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  weekCellBusy: { backgroundColor: 'rgba(255,80,80,0.2)' },
  pipRow: { flexDirection: 'row', gap: 2 },
  pip: { width: 4, height: 4, borderRadius: 2 },
  weekLegend: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
});