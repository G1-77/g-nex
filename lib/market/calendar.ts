// lib/market/calendar.ts
// Zero-dependency economic-calendar aggregation from ForexFactory's public RSS.
// Served only through the /api/calendar route handler (server-side, avoids CORS).

export type CalendarImpact = 'Low' | 'Medium' | 'High'

export interface CalendarEvent {
  id: string
  title: string
  country: string
  date: string
  time: string
  impact: CalendarImpact
  forecast: string | null
  previous: string | null
  url: string
}

const CALENDAR_FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml'

const FETCH_HEADERS = {
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
    .replace(/&#8217;/g, '\u2019')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractField(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  return decodeEntities(match[1])
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function parseCalendarXml(xml: string): CalendarEvent[] {
  const blocks = xml.match(/<event>[\s\S]*?<\/event>/g) ?? []
  const events: CalendarEvent[] = []

  for (const block of blocks) {
    const title = extractField(block, 'title')
    const country = extractField(block, 'country')
    const date = extractField(block, 'date')
    const time = extractField(block, 'time')
    const impact = extractField(block, 'impact') || 'Low'
    const forecast = extractField(block, 'forecast') || null
    const previous = extractField(block, 'previous') || null
    const url = extractField(block, 'url')

    if (!title || !country || !date) continue

    events.push({
      id: `${slugify(country)}-${slugify(title)}-${date}`,
      title,
      country,
      date,
      time,
      impact: impact as CalendarImpact,
      forecast: forecast === '' ? null : forecast,
      previous: previous === '' ? null : previous,
      url,
    })
  }

  return events
}

export async function fetchCalendarEvents(limit = 15): Promise<CalendarEvent[]> {
  const res = await fetch(CALENDAR_FEED_URL, {
    headers: FETCH_HEADERS,
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Economic calendar returned ${res.status}`)

  const xml = await res.text()
  return parseCalendarXml(xml).slice(0, limit)
}