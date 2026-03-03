import { createClient } from '@/lib/supabase/server'
import { searchHadith } from '@/src/lib/hadith/queries'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      q?: string
      collection?: string
      topic?: string
      limit?: number
    }

    const rows = await searchHadith(supabase, body)
    return Response.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
