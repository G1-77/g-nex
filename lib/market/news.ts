// lib/market/news.ts
// Zero-dependency RSS aggregation for the Markets → News hub.
// Served only through the /api/news route handler (server-side, avoids CORS).

export type NewsCategory = 'crypto' | 'gold'

export interface NewsArticle {
  id: string
  title: string
  url: string
  publishedAt: string | null
  source: string
  category: NewsCategory
  description?: string
  image?: string
}

export interface NewsFeedSource {
  source: string
  category: NewsCategory
  url: string
}

export const NEWS_FEEDS: NewsFeedSource[] = [
  {
    source: 'Cointelegraph',
    category: 'crypto',
    url: 'https://cointelegraph.com/rss',
  },
  {
    source: 'Bitcoin News',
    category: 'crypto',
    url: 'https://news.bitcoin.com/feed/',
  },
  {
    source: 'Mining.com',
    category: 'gold',
    url: 'https://www.mining.com/feed/',
  },
]

const RSS_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  Accept: 'application/rss+xml, application/xml, text/xml, */*',
}

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '\u2013')
}

function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function extractField(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  return decodeEntities(match[1]).trim()
}

function extractImage(block: string): string | undefined {
  const mediaMatch = block.match(/media:content\s+url="([^"]+)"/)
  if (mediaMatch) return mediaMatch[1]

  const enclosureMatch = block.match(/<enclosure\s+[^>]*url="([^"]+)"/i)
  if (enclosureMatch) return enclosureMatch[1]

  const imgMatch = block.match(/<img[^>]*src="([^"]+)"/i)
  if (imgMatch) return imgMatch[1]

  return undefined
}

function parseRssFeed(xml: string, source: string, category: NewsCategory): NewsArticle[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
  const articles: NewsArticle[] = []

  for (const block of items) {
    const title = extractField(block, 'title')
    const url =
      extractField(block, 'link') ||
      extractField(block, 'guid')
    if (!title || !url) continue

    const rawDate = extractField(block, 'pubDate')
    const publishedAt = rawDate ? new Date(rawDate).toISOString() : null
    const description = stripHtml(extractField(block, 'description')).slice(0, 280)

    articles.push({
      id: url,
      title: stripHtml(title),
      url,
      publishedAt,
      source,
      category,
      description: description || undefined,
      image: extractImage(block),
    })
  }

  return articles
}

export async function fetchNewsArticles(limit = 20): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map((feed) =>
      fetch(feed.url, { headers: RSS_FETCH_HEADERS, cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`${feed.source} returned ${res.status}`)
          return res.text()
        })
        .then((xml) => parseRssFeed(xml, feed.source, feed.category))
    )
  )

  const articles = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  )

  return articles
    .sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return tb - ta
    })
    .slice(0, limit)
}