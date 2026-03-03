import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HadithDashboardPage() {
  const supabase = await createClient()
  const [{ count: hadithCount }, { count: savedCount }, { count: noteCount }] = await Promise.all([
    supabase.from('hadith').select('*', { head: true, count: 'exact' }),
    supabase.from('hadith_saves').select('*', { head: true, count: 'exact' }),
    supabase.from('hadith_notes').select('*', { head: true, count: 'exact' }),
  ])

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Hadith Records</p>
          <p className="text-2xl font-semibold">{hadithCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saved</p>
          <p className="text-2xl font-semibold">{savedCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-2xl font-semibold">{noteCount ?? 0}</p>
        </article>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p>Start by searching hadith records and opening a detail page to save/note/export context.</p>
        <Link href="/modules/hadith/search" className="mt-2 inline-block underline">Go to search</Link>
      </div>
    </section>
  )
}
