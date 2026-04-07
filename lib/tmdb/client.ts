const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function tmdbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`TMDb error: ${res.status}`)
  return res.json()
}
