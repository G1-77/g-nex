// /app/api/calendar/route.ts

import { fetchCalendarEvents } from '@/lib/market/calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const events = await fetchCalendarEvents(15)
    return Response.json({ events })
  } catch (error) {
    return Response.json(
      {
        events: [],
        error: error instanceof Error ? error.message : 'Calendar fetch failed',
      },
      { status: 500 }
    )
  }
}