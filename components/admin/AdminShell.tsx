"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ExternalLink, Bell } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { GNEXLogo } from "@/components/brand/GNEXLogo"
import { NAV_SECTIONS } from "./status"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { PermissionCode } from "@/lib/admin/permissions"

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const { profile, role, permissions, isLoading } = useAuth()

  const can = (permission: string | null) =>
    permission === null || (permissions as PermissionCode[]).includes(permission as PermissionCode)

  const pageTitle = useMemo(() => {
    const flat = NAV_SECTIONS.flatMap((s) => s.items)
    const match = flat.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    )
    return match?.label ?? "Overview"
  }, [pathname])

  // Close the mobile drawer after navigation completes (deferred to avoid a
  // synchronous setState-in-effect cascade).
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawerOpen(false))
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    document.documentElement.dataset.admin = "true"
    return () => {
      delete document.documentElement.dataset.admin
    }
  }, [])

  const nav = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0)

  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? "AD"

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--admin-bg-elevated)]">
      <div className="flex h-16 items-center border-b border-[var(--admin-border)] px-5">
        <Link href="/" className="text-slate-100">
          <GNEXLogo height={26} />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {nav.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      active
                        ? "bg-[var(--admin-green)]/10 text-[var(--admin-green)]"
                        : "text-[var(--admin-text-dim)] hover:bg-white/5 hover:text-[var(--admin-text)]"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--admin-border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-slate-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-100">@{profile?.username ?? "admin"}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--admin-text-dim)]">
              {role?.replace("_", " ") ?? "staff"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--admin-border)] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] shadow-2xl">
            <button
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1 text-[var(--admin-text-dim)] hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/90 px-4 backdrop-blur">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-[var(--admin-text-dim)] hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-100">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/notifications"
              className="rounded-lg p-2 text-[var(--admin-text-dim)] hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--admin-text-dim)] hover:text-slate-100 sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-green)]/15 text-[10px] font-black text-[var(--admin-green)]">
                {initials}
              </div>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}