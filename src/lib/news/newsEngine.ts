import type { NewsResult } from '@/lib/types/proof-bundle'

const EMPTY_NEWS: NewsResult = {
  sentiment: 0,
  confidence: 'None',
  sources_used: [],
  headlines: [],
}

export async function getTickerNews(_ticker: string, _hours = 48): Promise<NewsResult> {
  return EMPTY_NEWS
}

export async function getMacroNews(_hours = 48): Promise<NewsResult> {
  return EMPTY_NEWS
}
