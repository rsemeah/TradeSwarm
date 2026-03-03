export type HadithRow = {
  id: string
  collection_slug: string
  collection_name: string
  book_number: number | null
  book_name: string | null
  chapter_number: number | null
  chapter_title: string | null
  hadith_number: number | null
  hadith_key: string | null
  arabic_text: string | null
  english_text: string | null
  topic_tags: string[] | null
  reference: string | null
  created_at: string
}

export type HadithSaveRow = {
  id: string
  user_id: string
  hadith_id: string
  saved_at: string
}

export type HadithNoteRow = {
  id: string
  user_id: string
  hadith_id: string
  content: string
  created_at: string
}
