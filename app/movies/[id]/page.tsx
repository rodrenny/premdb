const ruleText = 'This movie settles at the first daily IMDb snapshot taken on or after 14 days post-release where it has at least 5,000 votes.'

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="mx-auto max-w-4xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Movie {id}</h1>
      <p className="rounded border border-zinc-800 p-3 text-sm">{ruleText}</p>
    </main>
  )
}
