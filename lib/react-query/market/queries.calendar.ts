'use client'

import { useQuery } from '@tanstack/react-query'
import type { CalendarEvent } from '@/lib/market/calendar'

interface CalendarResponse {
  events: CalendarEvent[]
}

export function useEconomicCalendar() {
  return useQuery({
    queryKey: ['economic-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/calendar')
      if (!res.ok) throw new Error('Failed to fetch calendar')
      const json: CalendarResponse = await res.json()
      return json.events ?? []
    },
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 10,
  })
}