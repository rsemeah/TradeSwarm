import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type NoteJoinRow = {
  id: string
  content: string
  created_at: string
  hadith: {
    id: string
    collection_name: string
    hadith_number: number | null
  }[] | {
    id: string
    collection_name: string
    hadith_number: number | null
  } | null
}

export default async function HadithNotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('hadith_notes')
    .select('id, content, created_at, hadith:hadith_id (id, collection_name, hadith_number)')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <section className="space-y-3">
      {((data ?? []) as NoteJoinRow[]).map((row) => {
        const hadith = Array.isArray(row.hadith) ? row.hadith[0] : row.hadith
        return (
          <article key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {hadith?.collection_name ?? 'Unknown'} · #{hadith?.hadith_number ?? 'n/a'}
            </p>
            <p className="text-sm whitespace-pre-wrap">{row.content}</p>
            {hadith?.id && <Link href={`/modules/hadith/${hadith.id}`} className="underline text-sm">Open hadith</Link>}
          </article>
        )
      })}
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
    </section>
  )
}
