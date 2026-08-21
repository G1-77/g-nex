"use client"

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

/** Glass panel — the base card surface across the admin centre. */
export function AdminPanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn("admin-panel", className)}>{children}</div>
}

/** Page-level heading with an optional subtitle line. */
export function AdminPageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-100">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--admin-text-dim)]">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  )
}

/** Uppercase micro-label used above sections and grouped fields. */
export function AdminSectionLabel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-bold uppercase tracking-widest text-[var(--admin-text-dim)]",
        className
      )}
    >
      {children}
    </p>
  )
}

/** Search input with a leading icon. */
export function AdminSearch({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-text-faint)]" />
      <input type="text" className="admin-input w-full pl-9" {...props} />
    </div>
  )
}

/** Styled select (used by transactions and roles filters). */
export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("admin-input cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  )
}

/** Segmented control wrapper for filter groups. */
export function AdminTabs({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn("admin-tabs", className)}>{children}</div>
}

/** A single segment inside an AdminTabs group. */
export function AdminTab({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("admin-tab", active && "admin-tab-active", className)}
    >
      {children}
    </button>
  )
}

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "subtle" | "danger"
}

/** Themed button. Defaults to the subtle glass variant. */
export function AdminButton({
  variant = "subtle",
  className,
  type = "button",
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "admin-btn",
        variant === "primary" && "admin-btn-primary",
        variant === "subtle" && "admin-btn-subtle",
        variant === "danger" && "admin-btn-danger",
        className
      )}
      {...props}
    />
  )
}

/** Square icon-only button for dense table action cells. Pair with `title`. */
export function AdminIconButton({
  variant = "subtle",
  className,
  type = "button",
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border text-[var(--admin-text-dim)] transition-all duration-150 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "subtle" &&
          "border-[var(--admin-border)] bg-[var(--admin-panel)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-panel-hover)]",
        variant === "danger" &&
          "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-500/60 hover:bg-rose-500/20 hover:text-rose-200",
        variant === "primary" &&
          "border-transparent bg-[rgba(141,255,69,0.15)] text-[var(--admin-green)] hover:bg-[rgba(141,255,69,0.25)]",
        className
      )}
      {...props}
    />
  )
}