// components/layout/Bottomnav.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Briefcase,
  BarChart2,
  Home,
  Zap
} from 'lucide-react'

import MarketTradeBar from '@/components/layout/MarketTradeBar'

const navItems = [
  {
    label: 'Feed',
    href: '/',
    icon: Home
  },
  {
    label: 'Markets',
    href: '/markets',
    icon: BarChart2
  },
  {
    label: 'Trade',
    href: '/trade',
    icon: Zap
  },
  {
    label: 'Wallet',
    href: '/wallet',
    icon: Briefcase
  }
]

export default function Bottomnav() {
  const pathname = usePathname()
  const isTradeMode = pathname === '/markets'

  const isActive = (href: string) => {
    if (href === '/markets') {
      return pathname === '/markets' || pathname.startsWith('/markets/')
    }
    if (href === '/trade') {
      return pathname === '/trade' || pathname.startsWith('/trade/')
    }
    return pathname === href
  }

  return (
    <>
      {/* Floating Buy/Sell bar — only on the Markets page. Floats ABOVE the
          bottom nav on mobile so the nav stays reachable everywhere. */}
      {isTradeMode && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl md:bottom-0"
        >
          <MarketTradeBar />
        </motion.div>
      )}

      {/* Persistent bottom navigation — always visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur-xl md:hidden" role="navigation" aria-label="Main navigation">
        <div className="grid h-[64px] grid-cols-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1.5 transition-colors gnex-touch-target-lg ${
                  active
                    ? 'text-brand'
                    : 'text-muted hover:text-secondary'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />

                <span className="text-caption font-medium tracking-wide">
                  {item.label}
                </span>
                {active && (
                  <span className="absolute top-0 left-0 right-0 h-0.5 bg-brand" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
