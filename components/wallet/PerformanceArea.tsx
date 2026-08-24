'use client'

import { useMemo } from 'react'
import { buildWavyCurve } from '@/lib/market/sparkline-curve'

export interface PerformancePoint {
  timestamp: string
  valueKes: number
}

interface PerformanceAreaProps {
  endValue: number
  data?: PerformancePoint[]
}

export default function PerformanceArea({
  endValue: _endValue,
  data,
}: PerformanceAreaProps) {
  void _endValue
  const values = useMemo(() => {
    if (data && data.length >= 2) {
      return data.map((d) => Math.max(0, d.valueKes))
    }
    return null
  }, [data])

  const curve = useMemo(() => {
    if (!values || values.length < 2) return null

    return buildWavyCurve(values, {
      width: 320,
      height: 96,
      padX: 0,
      padY: 6,
      ripple: (96 - 12) * 0.06,
      samples: 5,
    })
  }, [values])

  if (!curve) {
    return null
  }

  const areaPath = `M 0 96 ${curve.path} L 320 96 Z`

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
      <path d={areaPath} fill="url(#perfFill)" />
      <path
        d={curve.path}
        fill="none"
        stroke="#8DFF45"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={curve.headX}
        cy={curve.headY}
        r="3"
        fill="#8DFF45"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}