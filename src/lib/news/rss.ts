export interface RssItem {
  title: string
  link: string
  pubDate?: string
}

const pick = (xml: string, tag: string) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m?.[1]?.trim() ?? ''
}

export async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const text = await res.text()
  const chunks = text.match(/<item>[\s\S]*?<\/item>/gi) ?? []
  return chunks.slice(0, 10).map((item) => ({
    title: pick(item, 'title'),
    link: pick(item, 'link'),
    pubDate: pick(item, 'pubDate'),
  }))
}
