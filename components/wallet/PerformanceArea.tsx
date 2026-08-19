'use client'

import { useMemo } from 'react'

interface PerformanceAreaProps {
  endValue: number
  seed?: string
  points?: number
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function PerformanceArea({ endValue, seed = 'gnex', points = 30 }: PerformanceAreaProps) {
  const chart = useMemo(() => {
    const rand = mulberry32(
      Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 7)
    )
    const start = Math.max(1, endValue * (0.9 + rand() * 0.06))
    const values: number[] = []
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1)
      const target = start + (endValue - start) * progress
      const noise = (rand() - 0.5) * endValue * 0.012
      values.push(Math.max(0, target + noise))
    }
    values[values.length - 1] = endValue

    const width = 320
    const height = 96
    const padY = 6
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1, max - min)

    const coords = values.map((v, i) => {
      const x = (i / (points - 1)) * width
      const y = padY + (1 - (v - min) / span) * (height - padY * 2)
      return [x, y] as const
    })

    const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `0,${height} ${line} ${width},${height}`
    const mid = coords[Math.floor(coords.length / 2)]

    return { line, area, maxLabel: max, minLabel: min, midX: mid[0], midY: mid[1] }
  }, [endValue, seed, points])

  return (
    <svg
      viewBox="0 0 320 96"
      preserveAspectRatio="none"
      className="h-24 w-full"
      role="img"
      aria-label="Portfolio performance this month"
    >
      <defs>
        <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8DFF45" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8DFF45" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={chart.area} fill="url(#perfFill)" />
      <polyline
        points={chart.line}
        fill="none"
        stroke="#8DFF45"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={chart.midX}
        cy={chart.midY}
        r="3"
        fill="#8DFF45"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}