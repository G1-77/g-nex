import { reputationMeta } from "@/lib/admin/reputation"
import { cn } from "@/lib/utils"

/**
 * Community reputation badge (display-only — never an authorization signal).
 * Shown on profile headers and setup cards.
 */
export function ReputationBadge({
  status,
  score,
}: {
  status?: string | null
  score?: number | null
}) {
  const meta = reputationMeta(status ?? "new_trader")
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
        meta.chip
      )}
    >
      {meta.label}
      {typeof score === "number" && Number.isFinite(score) && (
        <span className="opacity-70">· {Math.round(score)}</span>
      )}
    </span>
  )
}