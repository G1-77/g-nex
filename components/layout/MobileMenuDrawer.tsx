'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, GraduationCap, LineChart, X } from 'lucide-react'

import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopTradersWidget from '@/components/feed/TopTradersWidget'

const exploreItems = [
  {
    icon: Bookmark,
    label: 'Saved Strategies',
    href: null
  },
  {
    icon: LineChart,
    label: 'Leaderboards',
    href: '/leaderboard'
  },
  {
    icon: GraduationCap,
    label: 'GNEX Academy',
    href: null
  }
]

interface MobileMenuDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
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
            className="fixed left-0 top-0 z-[60] flex h-full w-[min(85vw,320px)] flex-col overflow-y-auto border-r border-border bg-background no-scrollbar md:hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-lg font-black tracking-wider text-brand">
                GNEX
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/40 text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary gnex-touch-target"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-4">
              {/* SECTION 1 - EXPLORE + MARKETS WATCH (left sidebar) */}
              <div className="space-y-1">
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Explore
                </p>

                {exploreItems.map((item) => {
                  const Icon = item.icon

                  const inner = (
                    <>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface transition-colors group-hover:bg-surface-hover">
                        <Icon className="h-4 w-4 text-text-secondary transition-colors group-hover:text-brand" />
                      </div>

                      {item.label}
                    </>
                  )

                  const className =
                    'group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface/60 hover:text-text-primary gnex-touch-target'

                  return item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={className}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button key={item.label} type="button" className={className}>
                      {inner}
                    </button>
                  )
                })}
              </div>

              <MarketsWatchWidget />

              {/* BOUNDARY DIVIDER */}
              <div className="border-t border-border" />

              {/* SECTION 2 - TOP TRADERS + TOP MOVERS (right sidebar) */}
              <TopTradersWidget />
              <TopMoversWidget />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}