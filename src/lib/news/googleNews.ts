import { GOOGLE_NEWS_REUTERS_AP } from './sources'
import { fetchRss } from './rss'

export async function fetchGoogleFallbackHeadlines(): Promise<string[]> {
  const items = await fetchRss(GOOGLE_NEWS_REUTERS_AP)
  return items.map((i) => i.title)
}
