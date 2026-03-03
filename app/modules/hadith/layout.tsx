import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HadithLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <main className="min-h-screen p-6 space-y-4">
      <header className="rounded-xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">Hadith Module</h1>
        <p className="text-sm text-muted-foreground">Isolated learning vertical under /modules/hadith.</p>
        <nav className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/modules/hadith/dashboard">Dashboard</Link>
          <Link className="underline" href="/modules/hadith/search">Search</Link>
          <Link className="underline" href="/modules/hadith/saved">Saved</Link>
          <Link className="underline" href="/modules/hadith/notes">Notes</Link>
          <Link className="underline" href="/modules/hadith/stats">Stats</Link>
        </nav>
      </header>
      {children}
    </main>
  )
}
