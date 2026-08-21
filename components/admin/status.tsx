import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, BookOpenText, Boxes, Flag, Star, ShieldCheck, Settings, ScrollText, ClipboardCheck } from "lucide-react"

export type StatusTone = "green" | "amber" | "red" | "gray" | "blue" | "violet"

const TONE_CLASSES: Record<StatusTone, string> = {
  green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  red: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  gray: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  blue: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
}

const DOT_CLASSES: Record<StatusTone, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-rose-400",
  gray: "bg-slate-400",
  blue: "bg-sky-400",
  violet: "bg-violet-400",
}

export function StatusBadge({ status, tone }: { status: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE_CLASSES[tone]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      {status.replace(/_/g, " ")}
    </span>
  )
}

export const NAV_SECTIONS: {
  title: string
  items: { href: string; label: string; icon: ReactNode; permission: string | null }[]
}[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, permission: null }],
  },
  {
    title: "Users",
    items: [{ href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" />, permission: "users.read" }],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/finance/deposits", label: "Deposits", icon: <ArrowDownToLine className="h-4 w-4" />, permission: "deposits.read" },
      { href: "/admin/finance/withdrawals", label: "Withdrawals", icon: <ArrowUpFromLine className="h-4 w-4" />, permission: "withdrawals.read" },
      { href: "/admin/finance/transactions", label: "Transactions", icon: <BookOpenText className="h-4 w-4" />, permission: "transactions.read" },
      { href: "/admin/finance/orders", label: "Orders", icon: <Boxes className="h-4 w-4" />, permission: "orders.read" },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/community/reports", label: "Reports", icon: <Flag className="h-4 w-4" />, permission: "community.report_review" },
      { href: "/admin/community/editorial", label: "Editorial", icon: <Star className="h-4 w-4" />, permission: "content.manage" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/approvals", label: "Approvals", icon: <ClipboardCheck className="h-4 w-4" />, permission: "approvals.review" },
      { href: "/admin/administration/roles", label: "Admin Users", icon: <ShieldCheck className="h-4 w-4" />, permission: "admins.manage" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/system/settings", label: "Settings", icon: <Settings className="h-4 w-4" />, permission: "settings.manage" },
      { href: "/admin/audit", label: "Audit Log", icon: <ScrollText className="h-4 w-4" />, permission: "audit.read" },
    ],
  },
]