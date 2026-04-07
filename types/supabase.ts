export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { id: string; username: string | null; role: 'user' | 'admin'; created_at: string; updated_at: string } }
      movies: { Row: { id: string; tmdb_id: number; imdb_id: string | null; title: string; status: string; release_date: string | null; prediction_locks_at: string | null } }
      predictions: { Row: { id: string; user_id: string; movie_id: string; predicted_value: number } }
      settlements: { Row: { id: string; movie_id: string; official_rating: number; official_num_votes: number } }
      score_events: { Row: { id: string; user_id: string; movie_id: string; points: number } }
    }
  }
}
