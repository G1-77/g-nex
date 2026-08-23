// components/layout/Sidebar.tsx
// Permanent desktop left sidebar (GNEX 2.0 shell — brief §5/§7). Rendered at
// lg+ by app/(main)/layout.tsx; mobile uses the hamburger drawer mirroring the
// same NAV_GROUPS.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NAV_GROUPS, type NavItem } from '@/lib/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  const inner = (
    <>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-brand-bg' : 'bg-surface group-hover:bg-surface-hover'
        }`}
      >
        <Icon
          className={`h-4 w-4 transition-colors ${
            active ? 'text-brand' : 'text-text-secondary group-hover:text-brand'
          }`}
        />
      </div>

      <span className="flex-1 truncate">{item.label}</span>

      {item.soon && (
        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Soon
        </span>
      )}

      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
    </>
  )

  if (item.href === null || item.soon) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="group flex w-full cursor-default items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-muted"
      >
        {inner}
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors gnex-hover-bg ${
        active ? 'text-brand' : 'text-text-secondary hover:text-text-primary'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {inner}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="sticky top-[56px] hidden h-[calc(100vh-56px)] w-60 shrink-0 flex-col gap-6 overflow-y-auto py-6 pr-2 lg:flex no-scrollbar">
      {NAV_GROUPS.map((group, index) => (
        <nav key={group.title} className="space-y-1" aria-label={`${group.title} navigation`}>
          <p className="mb-2 px-3 text-caption font-bold uppercase tracking-wider text-muted">
            {group.title}
          </p>

          {group.items.map((item) => {
            const resolved: NavItem =
              item.label === 'Profile'
                ? { ...item, href: `/user/${profile?.username ?? ''}`, soon: !profile?.username }
                : item

            return (
              <SidebarLink key={item.label} item={resolved} active={!!resolved.href && !resolved.soon && isActive(resolved.href)} />
            )
          })}

          {index < NAV_GROUPS.length - 1 && <div className="mt-6 border-t border-border-subtle" />}
        </nav>
      ))}
    </aside>
  )
}
