import Link from 'next/link'

const ruleText = 'This movie settles at the first daily IMDb snapshot taken on or after 14 days post-release where it has at least 5,000 votes.'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-4xl font-bold">PreMDB</h1>
      <p>Predict IMDb ratings for unreleased movies and compete globally.</p>
      <blockquote className="border-l-4 border-emerald-500 pl-4 text-sm text-zinc-300">“{ruleText}”</blockquote>
      <Link href="/login" className="inline-block rounded bg-emerald-600 px-4 py-2">Log in with magic link</Link>
    </main>
  )
}
