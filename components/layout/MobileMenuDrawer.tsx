// components/layout/MobileMenuDrawer.tsx
// Hamburger sidebar (brief §8) — overlays the current page, closes without
// losing context, mirrors the desktop sidebar's NAV_GROUPS.

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopTradersWidget from '@/components/feed/TopTradersWidget'
import { NAV_GROUPS, type NavItem } from '@/lib/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

interface MobileMenuDrawerProps {
  open: boolean
  onClose: () => void
}

function DrawerLink({
  item,
  onClose
}: {
  item: NavItem
  onClose: () => void
}) {
  const Icon = item.icon

  const inner = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface transition-colors group-hover:bg-surface-hover">
        <Icon className="h-4 w-4 text-text-secondary transition-colors group-hover:text-brand" />
      </div>

      <span className="flex-1 truncate">{item.label}</span>

      {item.soon && (
        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Soon
        </span>
      )}
    </>
  )

  const className =
    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium gnex-touch-target'

  if (item.href === null || item.soon) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${className} cursor-default text-text-muted`}
      >
        {inner}
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`${className} text-text-secondary hover:bg-surface/60 hover:text-text-primary`}
    >
      {inner}
    </Link>
  )
}

export default function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const { profile } = useAuth()

  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] cursor-pointer bg-black/60 backdrop-blur-sm md:hidden"
          />

          <motion.div
            key="panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-label="Navigation menu"
            className="fixed left-0 top-0 z-[60] flex h-full w-[min(85vw,320px)] flex-col overflow-y-auto bg-background no-scrollbar md:hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-lg font-black tracking-wider text-brand">
                GNEX
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface/40 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary gnex-touch-target"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-4">
              {/* SECTION 1 - NAVIGATION (mirrors desktop sidebar groups) */}
              {NAV_GROUPS.map((group) => (
                <nav key={group.title} className="space-y-1" aria-label={`${group.title} navigation`}>
                  <p className="mb-2 px-3 text-caption font-bold uppercase tracking-wider text-text-muted">
                    {group.title}
                  </p>

                  {group.items.map((item) => {
                    const resolved: NavItem =
                      item.label === 'Profile'
                        ? { ...item, href: `/user/${profile?.username ?? ''}`, soon: !profile?.username }
                        : item

                    return <DrawerLink key={item.label} item={resolved} onClose={onClose} />
                  })}
                </nav>
              ))}

              {/* BOUNDARY DIVIDER */}
              <div className="border-t border-border" />

              {/* SECTION 2 - MARKET CONTEXT WIDGETS */}
              <MarketsWatchWidget />
              <TopTradersWidget />
              <TopMoversWidget />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
