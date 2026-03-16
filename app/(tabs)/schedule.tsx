import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { PanResponder } from 'react-native';

import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type DayState = 'free' | 'unavailable' | 'partial';
type ViewMode = 'monthly' | 'weekly';

interface DayData {
  state: DayState;
  busyHours?: Set<number>;
}

const THEME = {
  bg: '#0f0a1f',
  bgSecondary: '#1a1333',
  card: 'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',
  gold: '#facc15',
  goldLight: '#fde68a',
  goldDim: 'rgba(250,204,21,0.15)',
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

const FRIENDS = [
  { name: 'Bryan', color: THEME.gold,        busyDays: [1, 3, 6] },
  { name: 'Mia',   color: THEME.purpleLight, busyDays: [0, 4, 5] },
  { name: 'Jake',  color: '#7ec8e3',         busyDays: [2, 5] },
];

const HOURS = [
  '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM',
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

// Panel hour row height — tall enough for easy finger targeting
// Width of the single busy column in the panel

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

  // ── Inline hours panel ──
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  const selectedKeyRef = useRef<string | null>(null);

  const openPanel = (key: string, date: Date) => {
    selectedKeyRef.current = key;
    panelAnim.setValue(0);
    setSelectedKey(key);
    setSelectedDate(date);
    requestAnimationFrame(() => {
      Animated.spring(panelAnim, {
        toValue: 1,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
      }).start();
    });
  };

  const closePanel = () => {
    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      selectedKeyRef.current = null;
      setSelectedKey(null);
      setSelectedDate(null);
    });
  };

  // ── Weekly PanResponder refs (unchanged) ──
  const paintingBusy    = useRef<boolean>(true);
  const weekScrollY     = useRef(0);
  const weekGridOrigin  = useRef<{ x: number; y: number } | null>(null);
  const weekGridViewRef = useRef<View>(null);
  const paintModeRef    = useRef(false);
  const weekDatesRef    = useRef<Date[]>(getWeekDates(0));
  const dayMapRef       = useRef<Record<string, DayData>>({});

  const handleSetPaintMode = (val: boolean) => {
    paintModeRef.current = val;
    setPaintMode(val);
    if (val && weekGridViewRef.current) {
      weekGridViewRef.current.measure((_x, _y, _w, _h, pageX, pageY) => {
        weekGridOrigin.current = { x: pageX, y: pageY };
      });
    }
  };

  const weekDates = getWeekDates(weekOffset);
  weekDatesRef.current = weekDates;

  const getHitCell = (pageX: number, pageY: number) => {
    if (!weekGridOrigin.current) return null;
    const { x: gridX, y: gridY } = weekGridOrigin.current;
    const relX = pageX - gridX - WEEK_TIME_W;
    const relY = pageY - gridY + weekScrollY.current;
    if (relX < 0 || relY < 0) return null;
    const colIndex = Math.floor(relX / WEEK_CELL_W);
    const rowIndex = Math.floor(relY / 44);
    if (colIndex < 0 || colIndex > 6) return null;
    if (rowIndex < 0 || rowIndex >= HOURS.length) return null;
    const d = weekDatesRef.current[colIndex];
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    return { key, hi: rowIndex };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => paintModeRef.current,
      onMoveShouldSetPanResponder:  () => paintModeRef.current,
      onPanResponderGrant: (e) => {
        const hit = getHitCell(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (!hit) return;
        const data = dayMapRef.current[hit.key];
        const isBusy =
          data?.state === 'unavailable' ||
          (data?.state === 'partial' && data.busyHours?.has(hit.hi));
        paintingBusy.current = !isBusy;
        paintCell(hit.key, hit.hi, paintingBusy.current);
      },
      onPanResponderMove: (e) => {
        const hit = getHitCell(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (hit) paintCell(hit.key, hit.hi, paintingBusy.current);
      },
    })
  ).current;

  // ── Helpers ──
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

  const handleDayTap = (key: string, date: Date) => {
    if (selectedKey === key) {
      setDayMap(prev => { const { [key]: _, ...rest } = prev; return rest; });
      closePanel();
    } else {
      setDayMap(prev => ({
        ...prev,
        [key]: { state: 'unavailable', busyHours: new Set<number>() },
      }));
      openPanel(key, date);
    }
  };

  const paintCell = useCallback((key: string, hourIdx: number, toBusy: boolean) => {
    setDayMap(prev => {
      const current = prev[key] || { state: 'partial' as DayState, busyHours: new Set<number>() };
      const hours = new Set(current.busyHours || []);
      if (toBusy) hours.add(hourIdx); else hours.delete(hourIdx);
      const next = {
        ...prev,
        [key]: { state: (hours.size > 0 ? 'partial' : 'free') as DayState, busyHours: hours },
      };
      dayMapRef.current = next;
      return next;
    });
  }, []);

  // ── Monthly view ──
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
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isBest    = bestNight?.key === key;
      const isUnavail = data?.state === 'unavailable';
      const isPartial = data?.state === 'partial' && (data.busyHours?.size ?? 0) > 0;
      const isSelected = selectedKey === key;

      const cellStyle: any[] = [styles.calCell, styles.calCellBase];
      const dateStyle: any[] = [styles.calDate];
      let subLabel = '';

      if (isUnavail)       { cellStyle.push(styles.calCellUnavail); dateStyle.push(styles.calDateUnavail); subLabel = 'out'; }
      else if (isPartial)  { cellStyle.push(styles.calCellPartial); dateStyle.push(styles.calDatePartial); subLabel = 'partial'; }
      else if (isBest)     { cellStyle.push(styles.calCellBest);    dateStyle.push(styles.calDateBest);    subLabel = '✨ best'; }
      else if (isToday)    { cellStyle.push(styles.calCellToday); }
      if (isSelected)      { cellStyle.push(styles.calCellSelected); }

      cells.push(
        <TouchableOpacity
          key={key}
          style={cellStyle}
          onPress={() => handleDayTap(key, new Date(year, month, d))}
          activeOpacity={0.7}
        >
          <Text style={dateStyle}>{d}</Text>
          {subLabel ? <Text style={styles.calSub}>{subLabel}</Text> : null}
        </TouchableOpacity>
      );
    }

    // Build the panel's busy hours data
    const panelData = selectedKey ? dayMap[selectedKey] : null;
    const allDay = panelData?.state === 'unavailable' && (panelData.busyHours?.size ?? 0) === 0;

    return (
      <View style={styles.monthGrid}>
        <View style={styles.dayHeaderRow}>
          {DAY_NAMES.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
        </View>
        <View style={styles.calGrid}>{cells}</View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.redDim, borderColor: THEME.red, borderWidth: 1 }]} />
            <Text style={styles.legendText}>Tap = unavailable all day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: THEME.gold, borderWidth: 1 }]} />
            <Text style={styles.legendText}>Customize hours below</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.greenDim, borderColor: THEME.green, borderWidth: 1 }]} />
            <Text style={styles.legendText}>Green = best night</Text>
          </View>
        </View>

        {/* ── Inline drag-to-paint hours panel ── */}
        {selectedKey && selectedDate && (
          <Animated.View style={[styles.hoursPanel, {
            opacity: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }]}>

            {/* Panel header */}
            <View style={styles.hoursPanelHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.hoursPanelTitle}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.hoursPanelSub}>
                  Tap hours you're busy
                </Text>
              </View>
              <TouchableOpacity
                style={styles.hoursPanelClear}
                onPress={() => {
                  setDayMap(prev => { const { [selectedKey]: _, ...rest } = prev; return rest; });
                  closePanel();
                }}
              >
                <Text style={styles.hoursPanelClearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* 4-col hour grid — rows of exactly 4, works on any screen */}
            <View style={styles.hourGrid}>
              {Array.from({ length: 6 }, (_, row) => (
                <View key={row} style={styles.hourRow}>
                  {HOURS.slice(row * 4, row * 4 + 4).map((hour, col) => {
                    const hi = row * 4 + col;
                    const isBusy = allDay || (panelData?.busyHours?.has(hi) ?? false);
                    return (
                      <TouchableOpacity
                        key={hi}
                        style={[styles.hourCell, isBusy && styles.hourCellBusy]}
                        onPress={() => {
                          if (!selectedKey) return;
                          setDayMap(prev => {
                            const current = prev[selectedKey] || { state: 'unavailable' as DayState, busyHours: new Set<number>() };
                            const isAllDay = current.state === 'unavailable' && (current.busyHours?.size ?? 0) === 0;
                            const hours = isAllDay
                              ? new Set(HOURS.map((_, i) => i))
                              : new Set(current.busyHours || []);
                            if (hours.has(hi)) hours.delete(hi); else hours.add(hi);
                            return { ...prev, [selectedKey]: { state: hours.size > 0 ? 'partial' : 'unavailable', busyHours: hours } };
                          });
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.hourCellText, isBusy && styles.hourCellTextBusy]}>{hour}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Summary */}
            {(() => {
              const busyCount = allDay ? 24 : (panelData?.busyHours?.size ?? 0);
              return (
                <View style={styles.panelSummary}>
                  <Text style={styles.panelSummaryText}>
                    {busyCount === 0
                      ? 'Available all day'
                      : busyCount === 24
                      ? 'Busy all day'
                      : `${busyCount} hour${busyCount !== 1 ? 's' : ''} marked busy`}
                  </Text>
                </View>
              );
            })()}

          </Animated.View>
        )}
      </View>
    );
  };

  // ── Weekly view (unchanged) ──
  const renderWeekly = () => (
    <View style={styles.weekContainer}>
      <TouchableOpacity
        style={[styles.paintBanner, paintMode && styles.paintBannerActive]}
        onPress={() => handleSetPaintMode(!paintMode)}
      >
        <Text style={[styles.paintBannerText, paintMode && styles.paintBannerTextActive]}>
          {paintMode
            ? '🎨 Drag mode ON — drag to mark busy · tap to exit'
            : 'Tap here to enter drag mode'}
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
        onScroll={(e) => { weekScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View
          ref={weekGridViewRef}
          {...(paintMode ? panResponder.panHandlers : {})}
          onLayout={(e) => {
            e.target.measure((_x, _y, _w, _h, pageX, pageY) => {
              weekGridOrigin.current = { x: pageX, y: pageY };
            });
          }}
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
                  <View key={di} style={[styles.weekCell, isBusy && styles.weekCellBusy]}>
                    {!isBusy && friendPips.length > 0 && (
                      <View style={styles.pipRow}>
                        {friendPips.map(f => (
                          <View key={f.name} style={[styles.pip, { backgroundColor: f.color }]} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
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

  // ── Root render ──
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find a time 🗓</Text>
          <Text style={styles.headerSub}>
            {viewMode === 'monthly'
              ? 'Tap a date · then tap your busy hours'
              : 'Tap to enter drag mode · drag to paint busy hours'}
          </Text>
        </View>

        {bestNight && (
          <View style={styles.bestBanner}>
            <View style={styles.bestBannerLeft}>
              <Text style={styles.bestBannerEmoji}>✨</Text>
              <View>
                <Text style={styles.bestBannerLabel}>Best night for everyone</Text>
                <Text style={styles.bestBannerDate}>
                  {bestNight.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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

// ── Styles ──
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: THEME.text, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: THEME.textMuted, marginTop: 4 },

  bestBanner: {
    marginHorizontal: GUTTER,
    marginBottom: 16,
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.35)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bestBannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  bestBannerEmoji:   { fontSize: 24 },
  bestBannerLabel:   { fontSize: 11, color: THEME.gold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 1 },
  bestBannerDate:    { fontSize: 15, color: THEME.text, fontWeight: '600', marginTop: 2, flexShrink: 1 },
  bestBannerBtn:     { backgroundColor: THEME.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  bestBannerBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1333' },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginBottom: 14,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  toggleBtn:        { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive:  { backgroundColor: THEME.gold },
  toggleText:       { fontSize: 13, fontWeight: '600', color: THEME.textMuted },
  toggleTextActive: { color: '#1a1333' },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    marginBottom: 14,
  },
  navBtn: {
    backgroundColor: THEME.purpleDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  navBtnText: { fontSize: 14, color: THEME.purpleLight },
  navLabel:   { fontSize: 15, fontWeight: '600', color: THEME.text },

  // ── Monthly grid ──
  monthGrid:    { paddingHorizontal: GUTTER },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  dayHeader:    { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: THEME.textMuted, fontWeight: '600' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },

  calCell:         { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calCellBase:     { backgroundColor: 'rgba(30,24,56,0.5)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' },
  calCellUnavail:  { backgroundColor: THEME.redDim, borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1 },
  calCellPartial:  { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.35)', borderWidth: 1 },
  calCellBest:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', borderWidth: 1 },
  calCellToday:    { borderColor: 'rgba(250,204,21,0.5)', borderWidth: 1.5 },
  calCellSelected: { borderColor: THEME.purpleLight, borderWidth: 2 },

  calDate:        { fontSize: 14, fontWeight: '500', color: THEME.text },
  calDateUnavail: { color: 'rgba(255,255,255,0.3)' },
  calDatePartial: { color: THEME.gold },
  calDateBest:    { color: THEME.green },
  calSub:         { fontSize: 8, color: THEME.textMuted, marginTop: 1 },

  legend:     { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: THEME.textMuted },

  // ── Inline hours panel ──
  hoursPanel: {
    marginTop: 16,
    backgroundColor: 'rgba(30,24,56,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: 14,
    marginBottom: 8,
  },
  hoursPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  hoursPanelTitle:     { fontSize: 14, fontWeight: '700', color: THEME.text },
  hoursPanelSub:       { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  hoursPanelClear:     { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  hoursPanelClearText: { fontSize: 12, fontWeight: '600', color: THEME.red },

  // 4-col hour grid — flex-based, no pixel math, works on any screen
  hourGrid: {
    flexDirection: 'column',
    gap: 5,
  },
  hourRow: {
    flexDirection: 'row',
    gap: 5,
  },
  hourCell: {
    flex: 1,          // each cell takes equal share of the row
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,31,74,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  hourCellBusy: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.45)',
  },
  hourCellText:     { fontSize: 11, fontWeight: '600', color: THEME.textSub, textAlign: 'center' },
  hourCellTextBusy: { fontSize: 11, fontWeight: '700', color: '#fca5a5', textAlign: 'center' },

  panelSummary: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
  },
  panelSummaryText: { fontSize: 13, fontWeight: '600', color: THEME.textSub },

  // ── Weekly grid ──
  weekContainer: { paddingHorizontal: GUTTER },

  paintBanner: {
    backgroundColor: THEME.purpleDim,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  paintBannerActive:     { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.35)' },
  paintBannerText:       { fontSize: 12, color: THEME.textMuted },
  paintBannerTextActive: { color: THEME.gold, fontWeight: '600' },

  weekHeader: {
    flexDirection: 'row',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
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
    borderLeftColor: 'rgba(139,92,246,0.12)',
  },
  weekDayName:         { fontSize: 10, color: THEME.textMuted, fontWeight: '600' },
  weekDayNum:          { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weekDayNumToday:     { backgroundColor: THEME.gold },
  weekDayNumText:      { fontSize: 13, fontWeight: '600', color: THEME.text },
  weekDayNumTextToday: { color: '#1a1333' },

  weekScroll: {
    maxHeight: 360,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(139,92,246,0.15)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  weekRow:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: 'rgba(139,92,246,0.08)' },
  weekTimeLabel: { width: WEEK_TIME_W, height: 44, fontSize: 10, color: THEME.textMuted, textAlign: 'right', paddingRight: 6, paddingTop: 4 },
  weekCell: {
    width: WEEK_CELL_W,
    height: 44,
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  weekCellBusy: { backgroundColor: THEME.redDim },
  pipRow: { flexDirection: 'row', gap: 2 },
  pip:    { width: 4, height: 4, borderRadius: 2 },
  weekLegend: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
});
