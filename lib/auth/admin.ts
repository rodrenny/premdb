import { createServerClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((v) => v.trim())
  if (user.email && adminEmails.includes(user.email)) return { user }

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Forbidden')
  return { user }
}
