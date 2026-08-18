'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, GraduationCap, LineChart, X } from 'lucide-react'

import MarketsWatchWidget from '@/components/feed/MarketsWatchWidget'
import TopMoversWidget from '@/components/feed/TopMoversWidget'
import TopTradersWidget from '@/components/feed/TopTradersWidget'

const exploreItems = [
  {
    icon: Bookmark,
    label: 'Saved Strategies'
  },
  {
    icon: LineChart,
    label: 'Leaderboards'
  },
  {
    icon: GraduationCap,
    label: 'GNEX Academy'
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
            className="fixed left-0 top-0 z-[60] flex h-full w-[min(85vw,320px)] flex-col overflow-y-auto border-r border-slate-900 bg-slate-950 md:hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-900/60 px-4 py-4">
              <span className="text-lg font-black tracking-wider text-yellow-600">
                GNEX
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-4">
              {/* SECTION 1 - EXPLORE + MARKETS WATCH (left sidebar) */}
              <div className="space-y-1">
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Explore
                </p>

                {exploreItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-100"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 transition-colors group-hover:bg-slate-800">
                        <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-yellow-600" />
                      </div>

                      {item.label}
                    </button>
                  )
                })}
              </div>

              <MarketsWatchWidget />

              {/* BOUNDARY DIVIDER */}
              <div className="border-t border-slate-900" />

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