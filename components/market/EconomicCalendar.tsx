'use client'

import { CalendarDays } from 'lucide-react'
import { useEconomicCalendar } from '@/lib/react-query/market/queries.calendar'
import type { CalendarEvent, CalendarImpact } from '@/lib/market/calendar'

const COUNTRY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CAD: '🇨🇦',
  AUD: '🇦🇺',
  NZD: '🇳🇿',
  CNY: '🇨🇳',
  CHF: '🇨🇭',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
  DKK: '🇩🇰',
  KRW: '🇰🇷',
  INR: '🇮🇳',
  BRL: '🇧🇷',
  MXN: '🇲🇽',
  ZAR: '🇿🇦',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  PLN: '🇵🇱',
  TRY: '🇹🇷',
  RUB: '🇷🇺',
}

const IMPACT_STYLE: Record<CalendarImpact, string> = {
  Low: 'bg-slate-500',
  Medium: 'bg-amber-400',
  High: 'bg-rose-500',
}

function flagFor(country: string): string {
  return COUNTRY_FLAGS[country] ?? '🌐'
}

function formatCalendarTime(date: string, time: string): string {
  const [month, day, year] = date.split('-').map(Number)
  if (!month || !day || !year) return `${date} ${time}`.trim()

  const dt = new Date(year, month - 1, day)
  const dayLabel = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${dayLabel} · ${time}`
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs font-bold tabular-nums text-slate-200">
        {value}
      </p>
    </div>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0"
    >
      <span className="mt-0.5 text-xl leading-none">{flagFor(event.country)}</span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-300">
            <CalendarDays className="h-3 w-3 text-amber-400" />
            {formatCalendarTime(event.date, event.time)}
          </span>

          <span className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_STYLE[event.impact]}`} />
            {event.impact}
          </span>
        </div>

        <p className="mt-1.5 text-sm font-bold leading-snug text-slate-100 transition-colors group-hover:text-slate-50">
          {event.title}
        </p>

        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-2">
          <Metric label="Actual" value="—" />
          <Metric label="Forecast" value={event.forecast ?? '—'} />
          <Metric label="Prior" value={event.previous ?? '—'} />
        </div>
      </div>
    </a>
  )
}

export default function EconomicCalendar() {
  const { data: events, isLoading, isError } = useEconomicCalendar()

  const title = (
    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
      Economic Calendar <span className="text-slate-600">&gt;</span>
    </h2>
  )

  if (isLoading) {
    return (
      <div>
        {title}
        <div className="mt-2 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-slate-900/60 bg-slate-900/20"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !events || events.length === 0) {
    return (
      <div>
        {title}
        <p className="mt-3 font-mono text-xs text-slate-500">
          No economic events available right now.
        </p>
      </div>
    )
  }

  return (
    <div>
      {title}
      <div className="mt-2 divide-y divide-slate-900/60 rounded-xl border border-slate-900/60 bg-slate-900/20 px-4 py-1">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}