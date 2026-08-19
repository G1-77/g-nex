import { cn } from "@/lib/utils"

interface GNEXLogoProps {
  className?: string
  /** Height of the wordmark in px (width scales proportionally). */
  height?: number
}

/**
 * GNEX wordmark — the E is drawn as three vertical green bars, matching the
 * platform brand. Renders as inline SVG so it works anywhere (nav, admin shell).
 */
export function GNEXLogo({ className, height = 28 }: GNEXLogoProps) {
  const barW = height * 0.12
  const gap = height * 0.08
  const barH = height * 0.56
  const startX = height * 1.06

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 select-none", className)}
      style={{ height }}
      aria-label="GNEX"
    >
      <svg
        width={height * 4.6}
        height={height}
        viewBox={`0 0 ${height * 4.6} ${height}`}
        fill="none"
        aria-hidden
      >
        {/* G */}
        <path
          d={`M ${height * 0.02} ${height * 0.2}
              L ${height * 0.02} ${height * 0.8}
              L ${height * 0.38} ${height * 0.8}
              L ${height * 0.38} ${height * 0.52}
              L ${height * 0.18} ${height * 0.52}`}
          stroke="currentColor"
          strokeWidth={height * 0.14}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* N */}
        <path
          d={`M ${height * 0.48} ${height * 0.2}
              L ${height * 0.48} ${height * 0.8}
              L ${height * 0.78} ${height * 0.2}
              L ${height * 0.78} ${height * 0.8}`}
          stroke="currentColor"
          strokeWidth={height * 0.14}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* E = three green bars */}
        <rect x={startX} y={height * 0.22} width={barW} height={barH} rx={barW / 2} fill="#8DFF45" />
        <rect x={startX + barW + gap} y={height * 0.22} width={barW} height={barH} rx={barW / 2} fill="#8DFF45" />
        <rect x={startX + (barW + gap) * 2} y={height * 0.22} width={barW} height={barH} rx={barW / 2} fill="#8DFF45" />
        {/* X */}
        <path
          d={`M ${height * 0.9} ${height * 0.22}
              L ${height * 1.22} ${height * 0.78}
              M ${height * 1.22} ${height * 0.22}
              L ${height * 0.9} ${height * 0.78}`}
          stroke="currentColor"
          strokeWidth={height * 0.14}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  )
}