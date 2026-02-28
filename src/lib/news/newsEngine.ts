import type { NewsImpact } from '@/src/lib/scanner/types'
import { TICKER_RSS } from './sources'
import { fetchRss } from './rss'
import { fetchGoogleFallbackHeadlines } from './googleNews'
import { fetchGlobalHeadlines } from './globalNews'
import { keywordSentiment } from './sentiment'
import { macroPenalty } from './calendar'

export async function getNewsImpact(ticker: string): Promise<NewsImpact> {
  const [tickerItems, global, googleFallback] = await Promise.all([
    fetchRss(TICKER_RSS(ticker)),
    fetchGlobalHeadlines(),
    fetchGoogleFallbackHeadlines(),
  ])

  const headlines = [...tickerItems.map((i) => i.title), ...global.slice(0, 3), ...googleFallback.slice(0, 2)]
  const sentiment = keywordSentiment(headlines)
  const negativePenalty = sentiment < 0 ? Math.min(0.1, Math.abs(sentiment) * 0.1) : 0

  const macro = macroPenalty()
  return {
    sentiment,
    penalty: Math.min(0.1, negativePenalty),
    macroFlags: {
      fomc: macro.fomc,
      cpi: macro.cpi,
      nfp: macro.nfp,
      earnings: false,
    },
    headlines: headlines.slice(0, 6),
  }
}
