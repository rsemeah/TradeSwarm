'use client'

import { useState } from 'react'

export function SaveHadithButton({ hadithId, isSaved }: { hadithId: string; isSaved: boolean }) {
  const [saved, setSaved] = useState(isSaved)
  const [pending, setPending] = useState(false)

  const onClick = async () => {
    setPending(true)
    try {
      const response = await fetch('/api/hadith/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hadithId, save: !saved }),
      })

      if (!response.ok) {
        throw new Error('Failed to update save state')
      }

      setSaved(!saved)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-border px-3 py-1.5 text-xs"
    >
      {pending ? 'Saving...' : saved ? 'Saved' : 'Save'}
    </button>
  )
}
