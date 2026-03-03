import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHadithById } from '@/src/lib/hadith/queries'
import { SaveHadithButton } from '@/src/components/hadith/SaveHadithButton'
import { AddHadithNoteForm } from '@/src/components/hadith/AddHadithNoteForm'

type Params = Promise<{ id: string }>

export default async function HadithDetailPage(props: { params: Params }) {
  const params = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const hadith = await getHadithById(supabase, params.id)
  if (!hadith) {
    notFound()
  }

  const [{ data: saved }, { data: notes }] = await Promise.all([
    supabase
      .from('hadith_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('hadith_id', hadith.id)
      .maybeSingle(),
    supabase
      .from('hadith_notes')
      .select('id, content, created_at')
      .eq('user_id', user.id)
      .eq('hadith_id', hadith.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {hadith.collection_name} · Book {hadith.book_number ?? 'n/a'} · Hadith #{hadith.hadith_number ?? 'n/a'}
        </p>
        {hadith.arabic_text && <p className="text-right leading-8">{hadith.arabic_text}</p>}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hadith.english_text ?? 'No English text available.'}</p>
        <SaveHadithButton hadithId={hadith.id} isSaved={Boolean(saved)} />
      </article>

      <article className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add Note</h2>
        <AddHadithNoteForm hadithId={hadith.id} />
      </article>

      <article className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold">My Notes</h2>
        {(notes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {(notes ?? []).map((note) => (
              <li key={note.id} className="rounded-md border border-border p-3 text-sm">
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
