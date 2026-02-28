import { YAHOO_GLOBAL_RSS } from './sources'
import { fetchRss } from './rss'

export async function fetchGlobalHeadlines(): Promise<string[]> {
  const items = await fetchRss(YAHOO_GLOBAL_RSS)
  return items.map((i) => i.title)
}
