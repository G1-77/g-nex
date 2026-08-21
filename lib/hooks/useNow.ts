'use client'

// lib/hooks/useNow.ts
// Render-safe clock. React's purity rules forbid Date.now() during render;
// components that need wall-clock time (freshness pills, "N s ago" labels)
// subscribe here instead. Starts at 0 (treated as "unknown") and settles on
// the first effect pass, then ticks at the requested interval.

import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const id = setInterval(update, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
