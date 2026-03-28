/**
 * supabase/functions/send-nudges/index.ts — FINAL (real schema)
 * ─────────────────────────────────────────────────────────────
 * Supabase Edge Function — run daily via cron to send push
 * notifications when a user hasn't hung out with a group in X days.
 *
 * DEPLOY STEPS (run in your terminal):
 *   1. supabase functions deploy send-nudges
 *   2. In Supabase Dashboard → Edge Functions → send-nudges → Schedules
 *      Add cron: "0 9 * * *"  (fires every day at 9am UTC)
 *
 * Tables used:
 *   user_nudge_preferences  (user_id, group_id, frequency_days)
 *   events                  (group_id, start_time)
 *   groups                  (id, name)
 *   push_tokens             (user_id, token)
 */
// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Fetch all active preferences (frequency_days > 0)
  const { data: prefs, error: prefsError } = await supabase
    .from('user_nudge_preferences')
    .select('user_id, group_id, frequency_days')
    .gt('frequency_days', 0);

  if (prefsError) {
    console.error('Failed to fetch preferences:', prefsError.message);
    return new Response('Error fetching preferences', { status: 500 });
  }

  const notifications: { to: string; title: string; body: string }[] = [];

  for (const pref of prefs ?? []) {
    const { user_id, group_id, frequency_days } = pref;

    // 2. Find last event for this group
    const { data: lastEvent } = await supabase
      .from('events')
      .select('start_time')
      .eq('group_id', group_id)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    const lastDate = lastEvent ? new Date(lastEvent.start_time) : null;
    const now = new Date();
    const daysSince = lastDate
      ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    // 3. Skip if not overdue yet
    if (daysSince < frequency_days) continue;

    // 4. Get group name
    const { data: groupRow } = await supabase
      .from('groups')
      .select('name')
      .eq('id', group_id)
      .single();

    const groupName = groupRow?.name ?? 'your group';

    // 5. Get user's push token
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)
      .single();

    if (!tokenRow?.token) continue;

    const daysLabel = daysSince === Infinity
      ? 'a while'
      : `${daysSince} day${daysSince === 1 ? '' : 's'}`;

    notifications.push({
      to:    tokenRow.token,
      title: '👋 Time to hang out!',
      body:  `It's been ${daysLabel} since you hung out with ${groupName}. Plan something?`,
    });
  }

  if (notifications.length === 0) {
    console.log('No nudges needed today.');
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 6. Send to Expo Push API (max 100 per request — batching for safety)
  const BATCH_SIZE = 100;
  let totalSent = 0;

  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const result = await res.json();
    console.log(`Batch ${i / BATCH_SIZE + 1} sent:`, result);
    totalSent += batch.length;
  }

  return new Response(JSON.stringify({ sent: totalSent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});