import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { syncUpcomingMovies } from '@/lib/tmdb/sync'

export async function POST() {
  await requireAdmin()
  await syncUpcomingMovies()
  return NextResponse.json({ ok: true })
}
