'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Menu,
  MessageCircle,
  Search,
  Wallet
} from 'lucide-react'
import AvatarDropdown from './AvatarDropdown'
import MobileMenuDrawer from './MobileMenuDrawer'
import { useAuth } from '@/components/providers/AuthProvider'
import { usePortfolioSummary } from '@/lib/react-query/market/queries.market'
import { formatKes } from '@/lib/market/wallet-utils'

const navItems = [
  {
    label: 'Feed',
    href: '/'
  },
  {
    label: 'Markets',
    href: '/markets'
  },
  {
    label: 'Trade',
    href: '/trade'
  }
]

export default function Topnav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { totalKes, growthPct } = usePortfolioSummary(user?.id ?? null)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-900/60 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6">
          
          {/* MOBILE MENU + BRAND */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900 md:hidden"
            >
              <Menu className="h-4 w-4 text-slate-400" />
            </button>

            <Link
              href="/"
              className="text-lg font-black tracking-wider text-yellow-600 transition-opacity hover:opacity-90"
            >
              GNEX
            </Link>
          </div>

          {/* SEARCH */}
          <div className="hidden sm:flex">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-800/80 bg-slate-900/40 px-3.5 py-1.5 transition-all duration-200 focus-within:border-yellow-600/40 focus-within:ring-1 focus-within:ring-yellow-600/20">
              <Search className="h-3.5 w-3.5 text-slate-500" />

              <input
                type="text"
                placeholder="Search crypto, gold, traders..."
                className="w-56 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* CENTER NAVIGATION */}
        <nav className="hidden h-full items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex h-full items-center px-4 text-xs font-semibold tracking-wide transition-colors duration-200 ${
                  active
                    ? 'text-yellow-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}

                {active && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-yellow-600 shadow-[0_-2px_10px_rgba(202,138,4,0.4)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2.5">
          
          {/* PORTFOLIO SNAPSHOT */}
          <Link
            href="/wallet"
            className="hidden items-center gap-3 rounded-full border border-slate-800/60 bg-slate-900/30 px-3 py-1 transition-colors hover:border-slate-700 lg:flex"
          >
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-yellow-600" />

              <span className="text-xs font-mono font-bold text-slate-200">
                KES {formatKes(totalKes)}
              </span>
            </div>

            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                growthPct === null
                  ? 'border-slate-700 bg-slate-800/40 text-slate-400'
                  : growthPct >= 0
                    ? 'border-[#8DFF45]/10 bg-[#8DFF45]/5 text-[#8DFF45]'
                    : 'border-[#FF5A5A]/10 bg-[#FF5A5A]/5 text-[#FF5A5A]'
              }`}
            >
              {growthPct === null ? 'Demo' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
            </span>
          </Link>

          {/* MOBILE SEARCH */}
          <button className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900 sm:hidden">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* MESSAGES */}
          <button className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900">
            <MessageCircle className="h-3.5 w-3.5 text-slate-400" />

            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-600" />
          </button>

          {/* NOTIFICATIONS */}
          <button className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900">
            <Bell className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* User Avatar */}
          <AvatarDropdown />
        </div>
      </div>
      </header>

      {/* Rendered outside the <header> — backdrop-blur on the header creates a
          containing block that would trap the drawer's position:fixed */}
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}