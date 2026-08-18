// lib/market/sparkline-curve.ts
// Shared smooth-curve generator for all sparklines. Produces a wavy "thread"
// path from raw data using Catmull-Rom interpolation + a subtle organic ripple.

export interface WavyCurve {
  /** Smooth cubic-bezier path (d attribute) through the sampled points */
  path: string
  /** Closed area path for a soft fill under the line (or null) */
  area: string | null
  /** True head position (last data point, anchored — not rippled) */
  headX: number
  headY: number
}

export interface BuildCurveOptions {
  width: number
  height: number
  padX?: number
  padY?: number
  /** Vertical ripple amplitude in user units (0 disables the wave) */
  ripple?: number
  /** Sampling density multiplier per source segment */
  samples?: number
}

/** Catmull-Rom → cubic bezier smooth path through the given points */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const prev = points[i - 2] ?? p0
    const next = points[i + 1] ?? p1

    const c1x = p0.x + (p1.x - prev.x) / 6
    const c1y = p0.y + (p1.y - prev.y) / 6
    const c2x = p1.x - (next.x - p0.x) / 6
    const c2y = p1.y - (next.y - p0.y) / 6

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
  }

  return d
}

export function buildWavyCurve(data: number[], options: BuildCurveOptions): WavyCurve {
  const { width, height, padX = width * 0.08, padY = height * 0.14, ripple = 0, samples = 5 } = options

  const n = data.length
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min === 0 ? 1 : max - min

  const xAt = (i: number) => padX + (i / (n - 1)) * (width - padX * 2)
  const yAt = (value: number) => padY + (1 - (value - min) / range) * (height - padY * 2)

  const anchors = data.map((value, i) => ({ x: xAt(i), y: yAt(value) }))

  // Dense Catmull-Rom sampling so the curve flows instead of segmenting
  const sampleCount = (n - 1) * samples
  const sampled: { x: number; y: number }[] = []

  for (let s = 0; s <= sampleCount; s++) {
    const t = s / sampleCount
    const seg = t * (n - 1)
    const i = Math.min(n - 2, Math.floor(seg))
    const local = seg - i

    const p0 = anchors[Math.max(0, i - 1)]
    const p1 = anchors[i]
    const p2 = anchors[i + 1]
    const p3 = anchors[Math.min(n - 1, i + 2)]

    const t2 = local * local
    const t3 = t2 * local

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * local +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * local +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

    // Subtle organic ripple, enveloped to zero at both ends so the
    // head (and start) stay true to the real values
    const envelope = Math.sin(t * Math.PI)
    const oscillation = Math.sin(t * Math.PI * 4)
    const waveY = y + ripple * envelope * oscillation

    sampled.push({ x, y: waveY })
  }

  const path = smoothPath(sampled)
  const first = sampled[0]
  const last = sampled[sampled.length - 1]
  const area = `${path} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`

  return {
    path,
    area,
    headX: anchors[n - 1].x,
    headY: anchors[n - 1].y,
  }
}