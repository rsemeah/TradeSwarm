import { createClient } from '@/lib/supabase/server'

export default async function HadithStatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ count: readCount }, { count: saveCount }, { count: noteCount }] = await Promise.all([
    supabase.from('hadith_reads').select('*', { head: true, count: 'exact' }).eq('user_id', user?.id ?? ''),
    supabase.from('hadith_saves').select('*', { head: true, count: 'exact' }).eq('user_id', user?.id ?? ''),
    supabase.from('hadith_notes').select('*', { head: true, count: 'exact' }).eq('user_id', user?.id ?? ''),
  ])

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Read events</p>
        <p className="text-2xl font-semibold">{readCount ?? 0}</p>
      </article>
      <article className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Saved hadith</p>
        <p className="text-2xl font-semibold">{saveCount ?? 0}</p>
      </article>
      <article className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Notes created</p>
        <p className="text-2xl font-semibold">{noteCount ?? 0}</p>
      </article>
    </section>
  )
}
