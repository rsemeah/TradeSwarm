'use client'

import { useState } from 'react'

export function AddHadithNoteForm({ hadithId }: { hadithId: string }) {
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return

    setPending(true)
    try {
      const response = await fetch('/api/hadith/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hadithId, content }),
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      setContent('')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Add reflection or note"
        className="w-full min-h-24 rounded-md border border-border bg-background p-3 text-sm"
      />
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-black">
        {pending ? 'Saving...' : 'Add Note'}
      </button>
    </form>
  )
}
