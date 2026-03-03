import type { SupabaseClient } from '@supabase/supabase-js'
import type { HadithRow } from '@/src/lib/hadith/types'

export async function searchHadith(
  supabase: SupabaseClient,
  filters: {
    q?: string
    collection?: string
    topic?: string
    limit?: number
  }
): Promise<HadithRow[]> {
  const { q, collection, topic, limit = 50 } = filters

  let query = supabase
    .from('hadith')
    .select(
      'id, collection_slug, collection_name, book_number, book_name, chapter_number, chapter_title, hadith_number, hadith_key, arabic_text, english_text, topic_tags, reference, created_at'
    )
    .order('hadith_number', { ascending: true })
    .limit(limit)

  if (collection) {
    query = query.ilike('collection_slug', `%${collection}%`)
  }

  if (topic) {
    query = query.contains('topic_tags', [topic])
  }

  if (q) {
    query = query.or(
      `english_text.ilike.%${q}%,arabic_text.ilike.%${q}%,chapter_title.ilike.%${q}%,collection_name.ilike.%${q}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Hadith search failed: ${error.message}`)
  }

  return (data ?? []) as HadithRow[]
}

export async function getHadithById(supabase: SupabaseClient, id: string): Promise<HadithRow | null> {
  const { data, error } = await supabase
    .from('hadith')
    .select(
      'id, collection_slug, collection_name, book_number, book_name, chapter_number, chapter_title, hadith_number, hadith_key, arabic_text, english_text, topic_tags, reference, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Hadith lookup failed: ${error.message}`)
  }

  return (data as HadithRow | null) ?? null
}
