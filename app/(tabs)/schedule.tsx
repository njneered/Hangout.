import HangoutHeader from '@/components/HangoutHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/themeprovider';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions, PanResponder, ScrollView,
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

const HOURS = [
  '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM',
];
const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GUTTER      = 20;
const WEEK_TIME_W = 44;
const WEEK_CELL_W = (SCREEN_WIDTH - GUTTER * 2 - WEEK_TIME_W) / 7;
const CELL_SIZE   = Math.floor((SCREEN_WIDTH - GUTTER * 2 - 12) / 7);

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function dateKey(year: number, month: number, day: number) { return `${year}-${month + 1}-${day}`; }
function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
}


export default function ScheduleScreen() {

  const today  = new Date();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [viewMode, setViewMode]   = useState<ViewMode>('monthly');
  const [month, setMonth]         = useState(today.getMonth());
  const [year, setYear]           = useState(today.getFullYear());
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayMap, setDayMap]       = useState<Record<string, DayData>>({});
  const [friendAvailability, setFriendAvailability] = useState<Record<string, Record<string, DayData>>>({});
  const [friendProfiles, setFriendProfiles] = useState<Record<string, { username: string; color: string }>>({});
  const [paintMode, setPaintMode] = useState(false);
  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const selectedKeyRef = useRef<string | null>(null);
  const { user } = useAuth();

  async function loadAvailability() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_availability')
      .select('date_key, busy_hours, all_day')
      .eq('user_id', user.id);

    if (error) throw error;

    const next: Record<string, DayData> = {};

    for (const row of data ?? []) {
      const hours = new Set<number>(
        (row.busy_hours ?? []).map((n: any) => Number(n))
      );

      next[row.date_key] = {
        state: row.all_day
          ? 'unavailable'
          : hours.size > 0
          ? 'partial'
          : 'free',
        busyHours: hours,
      };
    }

    setDayMap(next);
  }

  async function loadFriendAvailability() {
    if (!user?.id) return;

    const { data: friendRows, error: friendError } = await supabase
      .from('friends')
      .select('user_id, friend_id, status')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (friendError) throw friendError;

    const friendIds = (friendRows ?? []).map((row: any) =>
      row.user_id === user.id ? row.friend_id : row.user_id
    );

    if (friendIds.length === 0) {
      setFriendAvailability({});
      setFriendProfiles({});
      return;
    }

    const [{ data: availabilityRows, error: availabilityError }, { data: userRows, error: userError }] =
      await Promise.all([
        supabase
          .from('user_availability')
          .select('user_id, date_key, busy_hours, all_day')
          .in('user_id', friendIds),

        supabase
          .from('users')
          .select('id, username')
          .in('id', friendIds),
      ]);

    if (availabilityError) throw availabilityError;
    if (userError) throw userError;

    const nextAvailability: Record<string, Record<string, DayData>> = {};

    for (const row of availabilityRows ?? []) {
      if (!nextAvailability[row.user_id]) nextAvailability[row.user_id] = {};

      const hours = new Set<number>(
        (row.busy_hours ?? []).map((n: any) => Number(n))
      );

      nextAvailability[row.user_id][row.date_key] = {
        state: row.all_day
          ? 'unavailable'
          : hours.size > 0
          ? 'partial'
          : 'free',
        busyHours: hours,
      };
    }

    const palette = ['#facc15', '#c4b5fd', '#7ec8e3', '#fb7185', '#34d399', '#f97316'];

    const nextProfiles: Record<string, { username: string; color: string }> = {};
    (userRows ?? []).forEach((row: any, index: number) => {
      nextProfiles[row.id] = {
        username: row.username,
        color: palette[index % palette.length],
      };
    });

    setFriendAvailability(nextAvailability);
    setFriendProfiles(nextProfiles);
  }

  async function saveAvailabilityDay(key: string, data?: DayData) {
    if (!user?.id) return;

    const hours = Array.from(data?.busyHours ?? []).sort((a, b) => a - b);

    const shouldDelete =
      !data ||
      data.state === 'free' ||
      (data.state === 'partial' && hours.length === 0);

    if (shouldDelete) {
      const { error } = await supabase
        .from('user_availability')
        .delete()
        .eq('user_id', user.id)
        .eq('date_key', key);

      if (error) throw error;
      return;
    }

    const payload = {
      user_id: user.id,
      date_key: key,
      busy_hours: data.state === 'unavailable' ? [] : hours,
      all_day: data.state === 'unavailable',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_availability')
      .upsert(payload, { onConflict: 'user_id,date_key' });

    if (error) throw error;
  }

  useEffect(() => {
  dayMapRef.current = dayMap;
  }, [dayMap]);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      loadAvailability(),
      loadFriendAvailability(),
    ]).catch(err => {
      console.error('Load error:', err.message);
    });
  }, [user?.id]);

  const openPanel = (key: string, date: Date) => {
    selectedKeyRef.current = key;
    panelAnim.setValue(0);
    setSelectedKey(key); setSelectedDate(date);
    requestAnimationFrame(() => {
      Animated.spring(panelAnim, { toValue: 1, useNativeDriver: false, damping: 18, stiffness: 180 }).start();
    });
  };

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      selectedKeyRef.current = null; setSelectedKey(null); setSelectedDate(null);
    });
  };

  const paintingBusy   = useRef<boolean>(true);
  const weekScrollY    = useRef(0);
  const weekGridOrigin = useRef<{ x: number; y: number } | null>(null);
  const weekGridViewRef = useRef<View>(null);
  const paintModeRef   = useRef(false);
  const weekDatesRef   = useRef<Date[]>(getWeekDates(0));
  const dayMapRef      = useRef<Record<string, DayData>>({});
  const touchedKeysRef = useRef<Set<string>>(new Set());

  const handleSetPaintMode = async (val: boolean) => {
    if (!val) {
      await flushTouchedKeys();
    }

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
    const relX = pageX - gridX - WEEK_TIME_W; const relY = pageY - gridY + weekScrollY.current;
    if (relX < 0 || relY < 0) return null;
    const colIndex = Math.floor(relX / WEEK_CELL_W); const rowIndex = Math.floor(relY / 44);
    if (colIndex < 0 || colIndex > 6 || rowIndex < 0 || rowIndex >= HOURS.length) return null;
    const d = weekDatesRef.current[colIndex];
    return { key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()), hi: rowIndex };
  };

    async function flushTouchedKeys() {
    const keys = Array.from(touchedKeysRef.current);
    console.log('keys before clear', keys);
    console.log('dayMapRef snapshot', dayMapRef.current);

    touchedKeysRef.current.clear();

    for (const key of keys) {
      const data = dayMapRef.current[key];
      try {
        await saveAvailabilityDay(key, data);
      } catch (err: any) {
        console.error('Batch save error:', err.message);
      }
    }
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => paintModeRef.current,
    onMoveShouldSetPanResponder:  () => paintModeRef.current,
    onStartShouldSetPanResponderCapture: () => paintModeRef.current,
    onMoveShouldSetPanResponderCapture: () => paintModeRef.current,

    onPanResponderGrant: (e) => {
      const hit = getHitCell(e.nativeEvent.pageX, e.nativeEvent.pageY);
      if (!hit) return;
      const data = dayMapRef.current[hit.key];
      const isBusy = data?.state === 'unavailable' || (data?.state === 'partial' && data.busyHours?.has(hit.hi));
      paintingBusy.current = !isBusy; paintCell(hit.key, hit.hi, paintingBusy.current);
    },
    onPanResponderMove: (e) => { const hit = getHitCell(e.nativeEvent.pageX, e.nativeEvent.pageY); if (hit) paintCell(hit.key, hit.hi, paintingBusy.current); },
    onPanResponderRelease: async () => {
      //console.log('release');
      await flushTouchedKeys();
    },

    onPanResponderTerminate: async () => {
      //console.log('terminate');
      await flushTouchedKeys();
    },

    onPanResponderTerminationRequest: () => false,
  })).current;

  const isPastDate = (date: Date) => {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const t = new Date(today); t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const getBestNight = useCallback((): { key: string; date: Date } | null => {
    let best: { key: string; date: Date; score: number } | null = null;

    const friendIds = Object.keys(friendProfiles);

    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const key = dateKey(year, month, d);
      const candidateDate = new Date(year, month, d);

      if (isPastDate(candidateDate)) continue;

      const myDay = dayMap[key];
      let score = 0;

      if (!myDay || myDay.state === 'free') score += 1;
      else if (myDay.state === 'partial') score += 0.5;

      for (const friendId of friendIds) {
        const fDay = friendAvailability[friendId]?.[key];

        if (!fDay || fDay.state === 'free') score += 1;
        else if (fDay.state === 'partial') score += 0.5;
      }

      if (!best || score > best.score) {
        best = {
          key,
          date: candidateDate,
          score,
        };
      }
    }

    return best ? { key: best.key, date: best.date } : null;
  }, [dayMap, friendAvailability, friendProfiles, year, month]);

  const bestNight = getBestNight();

  const handleDayTap = async (key: string, date: Date) => {
    if (isPastDate(date)) return;

    if (selectedKey === key) {
      setDayMap(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });

      try {
        await saveAvailabilityDay(key, undefined);
      } catch (err: any) {
        console.error('Save error:', err.message);
      }

      closePanel();
    } else {
      const nextData: DayData = {
        state: 'unavailable',
        busyHours: new Set<number>(),
      };

      setDayMap(prev => ({
        ...prev,
        [key]: nextData,
      }));

      try {
        await saveAvailabilityDay(key, nextData);
      } catch (err: any) {
        console.error('Save error:', err.message);
      }

      openPanel(key, date);
    }
  };

  const paintCell = useCallback((key: string, hourIdx: number, toBusy: boolean) => {
    setDayMap(prev => {
      const current = prev[key] || {
        state: 'partial' as DayState,
        busyHours: new Set<number>(),
      };

      const hours = new Set(current.busyHours || []);

      if (toBusy) hours.add(hourIdx);
      else hours.delete(hourIdx);

      const nextDay: DayData = {
        state: hours.size > 0 ? 'partial' : 'unavailable',
        busyHours: hours,
      };

      const next = { ...prev, [key]: nextDay };
      dayMapRef.current = next;

      touchedKeysRef.current.add(key);

      return next;
    });
  }, []);

  // ── Build styles from theme ──
  const styles = makeStyles(theme);

  const renderMonthly = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: React.JSX.Element[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`empty-${i}`} style={styles.calCell} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d); const data = dayMap[key];
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isBest = bestNight?.key === key;
      const isUnavail = data?.state === 'unavailable';
      const isPartial = data?.state === 'partial' && (data.busyHours?.size ?? 0) > 0;
      const isSelected = selectedKey === key;
      const isPast = isPastDate(new Date(year, month, d));
      const cellStyle: any[] = [styles.calCell, styles.calCellBase];
      const dateStyle: any[] = [styles.calDate];
      let subLabel = '';
      if (isPast)                { cellStyle.push(styles.calCellPast); dateStyle.push(styles.calDatePast); }
      else if (isUnavail)        { cellStyle.push(styles.calCellUnavail); dateStyle.push(styles.calDateUnavail); subLabel = 'out'; }
      else if (isPartial)        { cellStyle.push(styles.calCellPartial); dateStyle.push(styles.calDatePartial); subLabel = 'partial'; }
      else if (isBest)           { cellStyle.push(styles.calCellBest); dateStyle.push(styles.calDateBest); subLabel = '✨ best'; }
      else if (isToday)          { cellStyle.push(styles.calCellToday); }
      if (isSelected && !isPast) { cellStyle.push(styles.calCellSelected); }
      cells.push(
        <TouchableOpacity key={key} style={cellStyle} onPress={() => !isPastDate(new Date(year, month, d)) && handleDayTap(key, new Date(year, month, d))} activeOpacity={0.7}>
          <Text style={dateStyle}>{d}</Text>
          {subLabel ? <Text style={styles.calSub}>{subLabel}</Text> : null}
        </TouchableOpacity>
      );
    }
    const panelData = selectedKey ? dayMap[selectedKey] : null;
    const allDay = panelData?.state === 'unavailable' && (panelData.busyHours?.size ?? 0) === 0;
    return (
      <View style={styles.monthGrid}>
        <View style={styles.dayHeaderRow}>{DAY_NAMES.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}</View>
        <View style={styles.calGrid}>{cells}</View>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.redDim, borderColor: theme.red, borderWidth: 1 }]} /><Text style={styles.legendText}>Tap = unavailable all day</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.goldDim, borderColor: theme.gold, borderWidth: 1 }]} /><Text style={styles.legendText}>Customize hours below</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.greenDim, borderColor: theme.green, borderWidth: 1 }]} /><Text style={styles.legendText}>Green = best night</Text></View>
        </View>
        {selectedKey && selectedDate && (
          <Animated.View style={[styles.hoursPanel, { opacity: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            <View style={styles.hoursPanelHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.hoursPanelTitle}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                <Text style={styles.hoursPanelSub}>Tap hours you're busy</Text>
              </View>
              <TouchableOpacity style={styles.hoursPanelClear} onPress={() => { setDayMap(prev => { const { [selectedKey]: _, ...rest } = prev; return rest; });   
                saveAvailabilityDay(selectedKey, undefined).catch(err => console.error('Save error:', err.message)); closePanel(); }}>
                <Text style={styles.hoursPanelClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hourGrid}>
              {Array.from({ length: 6 }, (_, row) => (
                <View key={row} style={styles.hourRow}>
                  {HOURS.slice(row * 4, row * 4 + 4).map((hour, col) => {
                    const hi = row * 4 + col;
                    const isBusy = allDay || (panelData?.busyHours?.has(hi) ?? false);
                    return (
                      <TouchableOpacity key={hi} style={[styles.hourCell, isBusy && styles.hourCellBusy]}
                        onPress={() => {
                          if (!selectedKey) return;
                          setDayMap(prev => {
                            const current = prev[selectedKey] || {
                              state: 'unavailable' as DayState,
                              busyHours: new Set<number>(),
                            };

                            const isAllDay = current.state === 'unavailable' && (current.busyHours?.size ?? 0) === 0;

                            const hours = isAllDay
                              ? new Set(HOURS.map((_, i) => i))
                              : new Set(current.busyHours || []);

                            if (hours.has(hi)) hours.delete(hi);
                            else hours.add(hi);

                            const nextDay: DayData = { state: hours.size > 0 ? 'partial' : 'unavailable', busyHours: hours, };

                            const next = {...prev, [selectedKey]: nextDay,};

                            saveAvailabilityDay(selectedKey, nextDay).catch(err => console.error('Save error:', err.message));

                            return next;
                          });
                        }} activeOpacity={0.75}>
                        <Text style={[styles.hourCellText, isBusy && styles.hourCellTextBusy]}>{hour}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
            {(() => {
              const busyCount = allDay ? 24 : (panelData?.busyHours?.size ?? 0);
              return (
                <View style={styles.panelSummary}>
                  <Text style={styles.panelSummaryText}>{busyCount === 0 ? 'Available all day' : busyCount === 24 ? 'Busy all day' : `${busyCount} hour${busyCount !== 1 ? 's' : ''} marked busy`}</Text>
                </View>
              );
            })()}
          </Animated.View>
        )}
      </View>
    );
  };

  const renderWeekly = () => (
    <View style={styles.weekContainer}>
      <TouchableOpacity style={[styles.paintBanner, paintMode && styles.paintBannerActive]} onPress={() => handleSetPaintMode(!paintMode)}>
        <Text style={[styles.paintBannerText, paintMode && styles.paintBannerTextActive]}>{paintMode ? '🎨 Drag mode ON — drag to mark busy · tap to exit' : 'Tap here to enter drag mode'}</Text>
      </TouchableOpacity>
      <View style={styles.weekHeader}>
        <View style={styles.weekTimeGutter} />
        {weekDates.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <View key={i} style={styles.weekDayCol}>
              <Text style={styles.weekDayName}>{DAY_NAMES[d.getDay()]}</Text>
              <View style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                <Text style={[styles.weekDayNumText, isToday && styles.weekDayNumTextToday]}>{d.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <ScrollView style={styles.weekScroll} scrollEnabled={!paintMode} showsVerticalScrollIndicator={false} onScroll={(e) => { weekScrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
        <View ref={weekGridViewRef} {...(paintMode ? panResponder.panHandlers : {})}
          onLayout={(e) => { e.target.measure((_x, _y, _w, _h, pageX, pageY) => { weekGridOrigin.current = { x: pageX, y: pageY }; }); }}>
          {HOURS.map((hour, hi) => (
            <View key={hi} style={styles.weekRow}>
              <Text style={styles.weekTimeLabel}>{hour}</Text>
              {weekDates.map((d, di) => {
                const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
                const data = dayMap[key];
                const isBusy = data?.state === 'unavailable' || (data?.state === 'partial' && data.busyHours?.has(hi));
                const availableFriendIds = Object.keys(friendProfiles).filter(friendId => {
                  const fDay = friendAvailability[friendId]?.[key];
                  if (!fDay || fDay.state === 'free') return true;
                  if (fDay.state === 'partial') return !fDay.busyHours?.has(hi);
                  return false;
                });
                return (
                  <View key={di} style={[styles.weekCell, isBusy && styles.weekCellBusy]}>
                    {!isBusy && availableFriendIds.length > 0 && (
                      <View style={styles.pipRow}>
                        {availableFriendIds.map(friendId => (
                      <View key={friendId} style={[styles.pip, { backgroundColor: friendProfiles[friendId]?.color ?? theme.gold }]} />
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
        {Object.entries(friendProfiles).map(([friendId, friend]) => (
          <View key={friendId} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: friend.color + '55', borderColor: friend.color, borderWidth: 1 }]} />
            <Text style={styles.legendText}>{friend.username}</Text>
          </View>
        ))}
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.redDim, borderColor: theme.red, borderWidth: 1 }]} /><Text style={styles.legendText}>You</Text></View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HangoutHeader />
      <ScrollView style={styles.scroll} scrollEnabled={!(paintMode && viewMode === 'weekly')} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find a time 🗓</Text>
          <Text style={styles.headerSub}>{viewMode === 'monthly' ? 'Tap a date · then tap your busy hours' : 'Tap to enter drag mode · drag to paint busy hours'}</Text>
        </View>
        {bestNight && (
          <View style={styles.bestBanner}>
            <View style={styles.bestBannerTop}>
              <Text style={styles.bestBannerEmoji}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bestBannerLabel}>Best night</Text>
                <Text style={styles.bestBannerDate}>{bestNight.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bestBannerBtn} onPress={() => router.push({pathname: 'hangouts', params: { date: bestNight.date.toISOString() }, } as any)}>
              <Text style={styles.bestBannerBtnText}>Lock it in →</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.toggleRow}>
          {(['monthly', 'weekly'] as ViewMode[]).map(v => (
            <TouchableOpacity key={v} style={[styles.toggleBtn, viewMode === v && styles.toggleBtnActive]} onPress={() => setViewMode(v)}>
              <Text style={[styles.toggleText, viewMode === v && styles.toggleTextActive]}>{v === 'monthly' ? '📅 Monthly' : '🗓 Weekly'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => viewMode === 'monthly' ? (month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)) : setWeekOffset(w => w - 1)}>
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navLabel}>{viewMode === 'monthly' ? `${MONTH_NAMES[month]} ${year}` : `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => viewMode === 'monthly' ? (month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)) : setWeekOffset(w => w + 1)}>
            <Text style={styles.navBtnText}>→</Text>
          </TouchableOpacity>
        </View>
        {viewMode === 'monthly' ? renderMonthly() : renderWeekly()}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { paddingTop: 12, paddingHorizontal: GUTTER, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: theme.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
    bestBanner: { marginHorizontal: GUTTER, marginBottom: 16, backgroundColor: theme.goldDim, borderRadius: 16, borderWidth: 1.5, borderColor: `${theme.gold}59`, padding: 16, flexDirection: 'column', gap: 12 },
    bestBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bestBannerEmoji: { fontSize: 22 },
    bestBannerLabel: { fontSize: 11, color: theme.gold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    bestBannerDate: { fontSize: 15, color: theme.text, fontWeight: '600', marginTop: 2 },
    bestBannerBtn: { backgroundColor: theme.gold, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
    bestBannerBtnText: { fontSize: 14, fontWeight: '700', color: theme.isDark ? '#1a1333' : '#fff' },
    toggleRow: { flexDirection: 'row', marginHorizontal: GUTTER, marginBottom: 14, backgroundColor: theme.purpleDim, borderRadius: 12, padding: 3, gap: 3 },
    toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: theme.gold },
    toggleText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    toggleTextActive: { color: theme.isDark ? '#1a1333' : '#fff' },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, marginBottom: 14 },
    navBtn: { backgroundColor: theme.purpleDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: `${theme.purple}40` },
    navBtnText: { fontSize: 14, color: theme.purpleLight },
    navLabel: { fontSize: 15, fontWeight: '600', color: theme.text },
    monthGrid: { paddingHorizontal: GUTTER },
    dayHeaderRow: { flexDirection: 'row', marginBottom: 6 },
    dayHeader: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: theme.textMuted, fontWeight: '600' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    calCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    calCellBase: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder },
    calCellUnavail: { backgroundColor: theme.redDim, borderColor: `${theme.red}59`, borderWidth: 1 },
    calCellPartial: { backgroundColor: theme.goldDim, borderColor: `${theme.gold}59`, borderWidth: 1 },
    calCellBest: { backgroundColor: theme.greenDim, borderColor: `${theme.green}66`, borderWidth: 1 },
    calCellToday: { borderColor: `${theme.gold}80`, borderWidth: 1.5 },
    calCellSelected: { borderColor: theme.purpleLight, borderWidth: 2 },
    calCellPast: { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', borderColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
    calDatePast: { color: theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)' },
    calDate: { fontSize: 14, fontWeight: '500', color: theme.text },
    calDateUnavail: { color: theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' },
    calDatePartial: { color: theme.gold },
    calDateBest: { color: theme.green },
    calSub: { fontSize: 8, color: theme.textMuted, marginTop: 1 },
    legend: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: theme.textMuted },
    hoursPanel: { marginTop: 16, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 8 },
    hoursPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
    hoursPanelTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
    hoursPanelSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    hoursPanelClear: { backgroundColor: theme.redDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${theme.red}4D` },
    hoursPanelClearText: { fontSize: 12, fontWeight: '600', color: theme.red },
    hourGrid: { flexDirection: 'column', gap: 5 },
    hourRow: { flexDirection: 'row', gap: 5 },
    hourCell: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.purpleDim, borderWidth: 1.5, borderColor: `${theme.purple}33` },
    hourCellBusy: { backgroundColor: theme.redDim, borderColor: `${theme.red}73` },
    hourCellText: { fontSize: 11, fontWeight: '600', color: theme.textSub, textAlign: 'center' },
    hourCellTextBusy: { fontSize: 11, fontWeight: '700', color: theme.red, textAlign: 'center' },
    panelSummary: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.purpleDim, borderRadius: 10, borderWidth: 1, borderColor: `${theme.purple}33`, alignItems: 'center' },
    panelSummaryText: { fontSize: 13, fontWeight: '600', color: theme.textSub },
    weekContainer: { paddingHorizontal: GUTTER },
    paintBanner: { backgroundColor: theme.purpleDim, borderWidth: 1, borderColor: `${theme.purple}33`, borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center' },
    paintBannerActive: { backgroundColor: theme.goldDim, borderColor: `${theme.gold}59` },
    paintBannerText: { fontSize: 12, color: theme.textMuted },
    paintBannerTextActive: { color: theme.gold, fontWeight: '600' },
    weekHeader: { flexDirection: 'row', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, borderBottomWidth: 0, backgroundColor: theme.bg },
    weekTimeGutter: { width: WEEK_TIME_W, height: 48 },
    weekDayCol: { width: WEEK_CELL_W, height: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 0.5, borderLeftColor: theme.cardBorder },
    weekDayName: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    weekDayNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    weekDayNumToday: { backgroundColor: theme.gold },
    weekDayNumText: { fontSize: 13, fontWeight: '600', color: theme.text },
    weekDayNumTextToday: { color: theme.isDark ? '#1a1333' : '#fff' },
    weekScroll: { maxHeight: 360, borderWidth: 1, borderTopWidth: 0, borderColor: theme.cardBorder, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    weekRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder },
    weekTimeLabel: { width: WEEK_TIME_W, height: 44, fontSize: 10, color: theme.textMuted, textAlign: 'right', paddingRight: 6, paddingTop: 4 },
    weekCell: { width: WEEK_CELL_W, height: 44, borderLeftWidth: 0.5, borderLeftColor: theme.cardBorder, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
    weekCellBusy: { backgroundColor: theme.redDim },
    pipRow: { flexDirection: 'row', gap: 2 },
    pip: { width: 4, height: 4, borderRadius: 2 },
    weekLegend: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  });
}