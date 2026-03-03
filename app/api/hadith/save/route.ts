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

    const body = (await req.json()) as { hadithId?: string; save?: boolean }

    if (!body.hadithId || typeof body.save !== 'boolean') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (body.save) {
      const { error } = await supabase.from('hadith_saves').upsert(
        {
          user_id: user.id,
          hadith_id: body.hadithId,
        },
        { onConflict: 'user_id,hadith_id' }
      )

      if (error) {
        return Response.json({ error: error.message }, { status: 400 })
      }

      const { error: readError } = await supabase.from('hadith_reads').insert({
        user_id: user.id,
        hadith_id: body.hadithId,
      })

      if (readError) {
        // read tracking is best-effort
        console.warn('hadith_reads insert failed:', readError.message)
      }

      return Response.json({ ok: true, saved: true })
    }

    const { error } = await supabase
      .from('hadith_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('hadith_id', body.hadithId)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ ok: true, saved: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Save action failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
