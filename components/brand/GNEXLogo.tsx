import { cn } from "@/lib/utils"

interface GNEXLogoProps {
  className?: string
  /** Height of the wordmark in px (font scales proportionally). */
  height?: number
}

/**
 * GNEX wordmark — bold uppercase letters with the E in brand green.
 * Inherits `currentColor` for the G, N and X so it adapts to any surface.
 */
export function GNEXLogo({ className, height = 28 }: GNEXLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-baseline font-black tracking-tight",
        className
      )}
      style={{ fontSize: height * 0.72, lineHeight: 1 }}
      aria-label="GNEX"
    >
      <span className="text-inherit">GN</span>
      <span style={{ color: "#8dff45" }}>E</span>
      <span className="text-inherit">X</span>
    </span>
  )
}