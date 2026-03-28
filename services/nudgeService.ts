import { supabase } from '../lib/supabase';
 
export type NudgePreference = {
  groupId: string;
  frequencyDays: number;
};
 
// ── READ: get all nudge preferences for a user ───────────────
export async function getNudgePreferences(userId: string): Promise<NudgePreference[]> {
  const { data, error } = await supabase
    .from('user_nudge_preferences')
    .select('group_id, frequency_days')
    .eq('user_id', userId);
 
  if (error) throw error;
 
  return (data ?? []).map((r: any) => ({
    groupId: r.group_id,
    frequencyDays: r.frequency_days,
  }));
}
 
// ── WRITE: save all preferences at once (bulk upsert) ────────
export async function setAllNudgePreferences(
  userId: string,
  preferences: NudgePreference[]
): Promise<void> {
  const rows = preferences.map(p => ({
    user_id:        userId,
    group_id:       p.groupId,
    frequency_days: p.frequencyDays,
    updated_at:     new Date().toISOString(),
  }));
 
  const { error } = await supabase
    .from('user_nudge_preferences')
    .upsert(rows, { onConflict: 'user_id,group_id' });
 
  if (error) throw error;
}
 
// ── CHECK: days since last hangout for a group ───────────────
export async function daysSinceLastHangout(groupId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('events')
    .select('start_time')
    .eq('group_id', groupId)
    .order('start_time', { ascending: false })
    .limit(1)
    .single();
 
  if (error || !data) return null;
 
  const lastDate = new Date(data.start_time);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
 
// ── REGISTER: save Expo push token to Supabase ───────────────
// Call this once after Expo.Notifications.getExpoPushTokenAsync()
export async function registerPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
 
  if (error) throw error;
}
 