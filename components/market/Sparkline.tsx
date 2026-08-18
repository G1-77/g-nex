'use client'

import { useEffect, useRef, useState } from 'react'
import { buildWavyCurve } from '@/lib/market/sparkline-curve'

interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
  className?: string
  preserveAspectRatio?: string
}

export default function Sparkline({
  data,
  color,
  width = 64,
  height = 20,
  className,
  preserveAspectRatio,
}: SparklineProps) {
  const [animKey, setAnimKey] = useState(0)
  const prevDataRef = useRef(data)

  useEffect(() => {
    if (prevDataRef.current !== data) {
      prevDataRef.current = data
      setAnimKey((key) => key + 1)
    }
  }, [data])

  if (data.length < 2) return null

  const curve = buildWavyCurve(data, {
    width,
    height,
    ripple: (height - height * 0.15 * 2) * 0.06,
    samples: 5,
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      aria-hidden="true"
    >
      <path
        key={animKey}
        className="sparkline-draw"
        d={curve.path}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Head dot */}
      <circle
        cx={curve.headX}
        cy={curve.headY}
        r={1.4}
        fill={color}
        style={{ transition: 'cx 0.5s ease, cy 0.5s ease' }}
      />
    </svg>
  )
}