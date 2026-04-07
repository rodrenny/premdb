import { createServerClient } from '@/lib/supabase/server'

export async function settleMovie(payload: {
  movieId: string
  officialRating: number
  officialNumVotes: number
  settlementSnapshotDate: string
  releaseDateUsed: string
  settlementNotes?: string
}) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('settle_movie', {
    p_movie_id: payload.movieId,
    p_official_rating: payload.officialRating,
    p_official_num_votes: payload.officialNumVotes,
    p_settlement_snapshot_date: payload.settlementSnapshotDate,
    p_release_date_used: payload.releaseDateUsed,
    p_settlement_notes: payload.settlementNotes ?? null,
  })
  if (error) throw error
  return data
}
