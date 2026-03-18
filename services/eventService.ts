import { supabase } from '@/lib/supabase';

export async function getEventsForUser(userId: string) {
    return supabase
        .from('events')
        .select('*')
        .eq('owner_id', userId);
}