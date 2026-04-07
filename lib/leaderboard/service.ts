import { createServerClient } from '@/lib/supabase/server'

export async function getLeaderboard() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('score_events')
    .select('user_id, points, profiles(username)')
  return data ?? []
}
