const NEGATIVE = ['downgrade', 'miss', 'lawsuit', 'fraud', 'recall', 'cuts guidance', 'probe', 'plunge']
const POSITIVE = ['beats', 'upgrade', 'surge', 'record high', 'raises guidance']

export function keywordSentiment(headlines: string[]): number {
  if (headlines.length === 0) return 0

  let score = 0
  for (const h of headlines) {
    const t = h.toLowerCase()
    if (NEGATIVE.some((k) => t.includes(k))) score -= 1
    if (POSITIVE.some((k) => t.includes(k))) score += 0.5
  }

  return Math.max(-1, Math.min(1, score / Math.max(1, headlines.length / 2)))
}
