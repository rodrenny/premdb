'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string>()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    setStatus(error ? error.message : 'Magic link sent. Check your inbox.')
    if (!error) window.location.href = '/verify-request'
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded bg-zinc-900 p-2" />
        <button className="rounded bg-emerald-600 px-4 py-2">Send magic link</button>
      </form>
      {status && <p className="mt-3 text-sm">{status}</p>}
    </main>
  )
}
