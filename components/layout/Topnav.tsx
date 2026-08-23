'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Menu,
  MessageCircle,
  Search,
  Wallet,
  X
} from 'lucide-react'
import AvatarDropdown from './AvatarDropdown'
import MobileMenuDrawer from './MobileMenuDrawer'
import SearchComponent from './Search'
import { useAuth } from '@/components/providers/AuthProvider'
import { usePortfolioSummary } from '@/lib/react-query/market/queries.market'
import { formatKes } from '@/lib/market/wallet-utils'

const navItems = [
  {
    label: 'Home',
    href: '/'
  },
  {
    label: 'Markets',
    href: '/markets'
  },
  {
    label: 'Trade',
    href: '/trade'
  },
  {
    label: 'Feed',
    href: '/feed'
  }
]

export default function Topnav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { user } = useAuth()
  const { totalKes, growthPct } = usePortfolioSummary(user?.id ?? null)

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-4 px-page">
          
          {/* LEFT SECTION */}
          <div className="flex items-center gap-4">
            
            {/* MOBILE MENU + BRAND */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface/40 transition-colors hover:bg-surface-hover md:hidden gnex-touch-target"
              >
                <Menu className="h-5 w-5 text-text-secondary" />
              </button>

              <Link
                href="/"
                className="text-xl font-black tracking-wider text-brand transition-opacity hover:opacity-90"
              >
                GNEX
              </Link>
            </div>

            {/* SEARCH */}
            <div className="hidden sm:flex">
              <SearchComponent />
            </div>
          </div>

          {/* CENTER NAVIGATION */}
          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = pathname === item.href

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative flex h-full items-center px-4 text-sm font-semibold tracking-wide transition-colors duration-200 gnex-touch-target ${
                    active
                      ? 'text-brand bg-surface-hover'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-2">
            
            {/* PORTFOLIO SNAPSHOT */}
            <Link
              href="/wallet"
              className="hidden items-center gap-3 rounded-full bg-surface/40 px-4 py-2 transition-colors hover:bg-surface-hover lg:flex gnex-touch-target"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-brand" />

                <span className="text-sm font-mono font-bold text-text-primary">
                  KES {formatKes(totalKes)}
                </span>
              </div>

              <span
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${
                  growthPct === null
                    ? 'text-text-muted'
                    : growthPct >= 0
                      ? 'bg-success-bg text-success'
                      : 'bg-danger-bg text-danger'
                }`}
              >
                {growthPct === null ? 'Demo' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
              </span>
            </Link>

            {/* MOBILE SEARCH */}
            <button
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface/40 transition-colors hover:bg-surface-hover sm:hidden gnex-touch-target"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-text-secondary" />
            </button>

            {/* MESSAGES */}
            <button className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface/40 transition-colors hover:bg-surface-hover gnex-touch-target">
              <MessageCircle className="h-4 w-4 text-text-secondary" />

              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            </button>

            {/* NOTIFICATIONS */}
            <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface/40 transition-colors hover:bg-surface-hover gnex-touch-target">
              <Bell className="h-4 w-4 text-text-secondary" />
            </button>

            {/* User Avatar */}
            <AvatarDropdown />
          </div>
        </div>
      </header>

      {/* Rendered outside the <header> — backdrop-blur on the header creates a
          containing block that would trap the drawer's position:fixed */}
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Mobile Search Modal */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[70] sm:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSearchOpen(false)} />
          <div className="fixed top-0 left-0 right-0 z-[71] bg-background border-b border-border p-4 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/40 text-text-secondary transition-colors hover:bg-surface-hover"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
              <SearchComponent autoFocus />
            </div>
          </div>
        </div>
      )}
    </>
  )
}