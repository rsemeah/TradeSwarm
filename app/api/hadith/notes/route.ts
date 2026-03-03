import { createClient } from '@/lib/supabase/server'

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
      hadithId?: string
      content?: string
    }

    if (!body.hadithId || !body.content?.trim()) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hadith_notes')
      .insert({
        user_id: user.id,
        hadith_id: body.hadithId,
        content: body.content.trim(),
      })
      .select('id, content, created_at')
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ ok: true, note: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notes action failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
