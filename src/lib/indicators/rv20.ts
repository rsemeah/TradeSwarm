const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

function stdev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export async function fetchRv20(symbol: string): Promise<{ rv20: number | null; insufficient: boolean }> {
  const res = await fetch(`${CHART_URL}/${encodeURIComponent(symbol)}?range=3mo&interval=1d`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!res.ok) return { rv20: null, insufficient: true }
  const json = await res.json()
  const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((n: unknown) => typeof n === 'number') ?? []

  if (closes.length < 21) return { rv20: null, insufficient: true }

  const returns: number[] = []
  for (let i = closes.length - 20; i < closes.length; i += 1) {
    const prev = closes[i - 1]
    const cur = closes[i]
    returns.push(Math.log(cur / prev))
  }

  return { rv20: stdev(returns) * Math.sqrt(252), insufficient: false }
}
