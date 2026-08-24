// components/layout/Bottomnav.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart2,
  Briefcase,
  Home,
  Newspaper,
  Zap
} from 'lucide-react'

import MarketTradeBar from '@/components/layout/MarketTradeBar'

const navItems = [
  {
    label: 'Home',
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
    icon: Zap,
    emphasized: true
  },
  {
    label: 'Discover',
    href: '/feed',
    icon: Newspaper
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
    if (href === '/') return pathname === '/'
    if (href === '/markets') {
      return pathname.startsWith('/markets')
    }
    return pathname === href || pathname.startsWith(`${href}/`)
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

      {/* Persistent bottom navigation — always visible on mobile.
          Five core-loop destinations; Trade carries stronger visual emphasis
          because execution is the primary financial action (brief §9). */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur-xl md:hidden" role="navigation" aria-label="Main navigation">
        <div className="grid h-[64px] grid-cols-5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1.5 transition-colors gnex-touch-target-lg ${
                  active ? 'text-brand' : 'text-muted hover:text-secondary'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.emphasized ? (
                  <span
                    className={`flex items-center justify-center rounded-full px-3.5 py-1 transition-colors ${
                      active ? 'bg-brand text-background' : 'bg-brand-bg text-brand'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : (
                  <Icon className="h-6 w-6" aria-hidden="true" />
                )}

                <span className="text-caption font-medium tracking-wide">
                  {item.label}
                </span>
                {active && !item.emphasized && (
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
