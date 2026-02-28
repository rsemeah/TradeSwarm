export const TICKER_RSS = (ticker: string) => `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`
export const YAHOO_GLOBAL_RSS = 'https://finance.yahoo.com/news/rssindex'
export const GOOGLE_NEWS_REUTERS_AP =
  'https://news.google.com/rss/search?q=(Reuters%20OR%20AP)%20when:1d&hl=en-US&gl=US&ceid=US:en'
