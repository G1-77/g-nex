'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { buildWavyCurve } from '@/lib/market/sparkline-curve'

interface SparklineAreaProps {
  data: number[]
  color: string
  height?: number
  className?: string
}

export default function SparklineArea({
  data,
  color,
  height = 48,
  className,
}: SparklineAreaProps) {
  const areaGradientId = useId()
  const trailGradientId = useId()

  const [animKey, setAnimKey] = useState(0)
  const prevDataRef = useRef(data)

  // Re-trigger the draw-in sweep whenever a fresh series arrives (live ticks, mounts, filter switches)
  useEffect(() => {
    if (prevDataRef.current !== data) {
      prevDataRef.current = data
      setAnimKey((key) => key + 1)
    }
  }, [data])

  if (data.length < 2) {
    return <div className={className} />
  }

  const H = height
  const PAD_X = 6
  const PAD_Y = H * 0.14

  const curve = buildWavyCurve(data, {
    width: 100,
    height: H,
    padX: PAD_X,
    padY: PAD_Y,
    ripple: (H - PAD_Y * 2) * 0.06,
    samples: 5,
  })

  const headXPct = curve.headX
  const headYPct = (curve.headY / H) * 100

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <svg
          viewBox={`0 0 100 ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={trailGradientId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={100}
              y2={0}
            >
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="45%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {curve.area && (
            <path d={curve.area} fill={`url(#${areaGradientId})`} />
          )}

          <path
            key={animKey}
            className="sparkline-draw"
            d={curve.path}
            pathLength={1}
            fill="none"
            stroke={`url(#${trailGradientId})`}
            strokeWidth={1}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Head dot — HTML overlay so it stays perfectly round despite the stretched SVG */}
        <span
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${headXPct}%`,
            top: `${headYPct}%`,
            backgroundColor: color,
            boxShadow: `0 0 5px 1px ${color}88`,
            transition: 'left 0.5s ease, top 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}