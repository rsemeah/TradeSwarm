import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type SavedJoinRow = {
  id: string
  saved_at: string
  hadith: {
    id: string
    collection_name: string
    hadith_number: number | null
    english_text: string | null
  }[] | {
    id: string
    collection_name: string
    hadith_number: number | null
    english_text: string | null
  } | null
}

export default async function HadithSavedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('hadith_saves')
    .select('id, saved_at, hadith:hadith_id (id, collection_name, hadith_number, english_text)')
    .eq('user_id', user?.id ?? '')
    .order('saved_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <section className="space-y-3">
      {((data ?? []) as SavedJoinRow[]).map((row) => {
        const hadith = Array.isArray(row.hadith) ? row.hadith[0] : row.hadith
        if (!hadith) return null
        return (
          <article key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">{hadith.collection_name} · #{hadith.hadith_number ?? 'n/a'}</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{hadith.english_text ?? 'No text'}</p>
            <Link href={`/modules/hadith/${hadith.id}`} className="underline text-sm">Open</Link>
          </article>
        )
      })}
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No saved hadith yet.</p>}
    </section>
  )
}
