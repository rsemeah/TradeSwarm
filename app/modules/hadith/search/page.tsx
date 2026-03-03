import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HadithSearchForm } from '@/src/components/hadith/HadithSearchForm'
import { searchHadith } from '@/src/lib/hadith/queries'

type SearchParams = Promise<{
  q?: string
  collection?: string
  topic?: string
}>

export default async function HadithSearchPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const q = searchParams.q?.trim()
  const collection = searchParams.collection?.trim()
  const topic = searchParams.topic?.trim()

  const supabase = await createClient()
  const rows = await searchHadith(supabase, {
    q,
    collection,
    topic,
    limit: 100,
  })

  return (
    <section className="space-y-4">
      <HadithSearchForm q={q} collection={collection} topic={topic} />
      <p className="text-xs text-muted-foreground">{rows.length} result(s)</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {row.collection_name} · #{row.hadith_number ?? 'n/a'}
            </p>
            {row.arabic_text && <p className="text-right leading-8">{row.arabic_text}</p>}
            <p className="text-sm text-muted-foreground line-clamp-4">{row.english_text ?? 'No English text'}</p>
            <Link className="underline text-sm" href={`/modules/hadith/${row.id}`}>Open detail</Link>
          </article>
        ))}
      </div>
    </section>
  )
}
