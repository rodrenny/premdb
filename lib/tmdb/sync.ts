import { createServerClient } from '@/lib/supabase/server'
import { tmdbFetch } from './client'

export async function syncUpcomingMovies() {
  const supabase = await createServerClient()
  for (let page = 1; page <= 3; page++) {
    const upcoming = await tmdbFetch<{ results: Array<{ id: number }> }>(`/movie/upcoming?page=${page}`)
    for (const item of upcoming.results) {
      const details = await tmdbFetch<any>(`/movie/${item.id}`)
      const credits = await tmdbFetch<any>(`/movie/${item.id}/credits`)
      const videos = await tmdbFetch<any>(`/movie/${item.id}/videos`)
      const director = credits.crew?.find((c: any) => c.job === 'Director')?.name ?? null
      const cast = (credits.cast ?? []).slice(0, 5).map((c: any) => ({ id: c.id, name: c.name, character: c.character }))
      const trailer = (videos.results ?? []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')?.key ?? null
      const releaseDate = details.release_date || null
      await supabase.from('movies').upsert({
        tmdb_id: details.id,
        imdb_id: details.imdb_id,
        title: details.title,
        original_title: details.original_title,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        release_date: releaseDate,
        prediction_locks_at: releaseDate ? `${releaseDate}T00:00:00Z` : null,
        runtime: details.runtime,
        genres: details.genres ?? [],
        director_name: director,
        cast_preview: cast,
        trailer_youtube_key: trailer,
      }, { onConflict: 'tmdb_id' })
    }
  }
}
