// components/layout/Bottomnav.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Briefcase,
  BarChart2,
  Home,
  Users
} from 'lucide-react'

import MarketTradeBar from '@/components/layout/MarketTradeBar'

const navItems = [
  {
    label: 'Feed',
    href: '/',
    icon: Home
  },
  {
    label: 'Trade',
    href: '/markets',
    icon: BarChart2
  },
  {
    label: 'Groups',
    href: '/groups',
    icon: Users
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

  return (
    <nav
      className={`fixed bottom-0 left-0 z-50 w-full border-t border-slate-900/60 bg-slate-950/95 backdrop-blur-xl ${
        isTradeMode ? '' : 'md:hidden'
      }`}
    >
      {isTradeMode ? (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <MarketTradeBar />
        </motion.div>
      ) : (
        <div className="grid h-16 grid-cols-4">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-yellow-600'
                    : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />

                <span className="text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
