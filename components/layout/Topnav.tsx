'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  MessageCircle,
  Search,
  Wallet
} from 'lucide-react'
import Image from 'next/image'

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
    label: 'Groups',
    href: '/groups'
  }
]

export default function Topnav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-900/60 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6">
          
          {/* BRAND */}
          <Link
            href="/"
            className="text-lg font-black tracking-wider text-yellow-600 transition-opacity hover:opacity-90"
          >
            GNEX
          </Link>

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
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-yellow-600 shadow-[0_-2px_10px_rgba(202,138,4,0.4)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2.5">
          
          {/* PORTFOLIO SNAPSHOT */}
          <div className="hidden items-center gap-3 rounded-full border border-slate-800/60 bg-slate-900/30 px-3 py-1 lg:flex">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-yellow-600" />

              <span className="text-xs font-mono font-bold text-slate-200">
                $12,450.80
              </span>
            </div>

            <span className="rounded-md border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              +12.8%
            </span>
          </div>

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

          {/* USER AVATAR */}
          <button className="ml-1 h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-yellow-600/40 transition-all hover:ring-yellow-600">
            <Image
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
              alt="User Profile Avatar"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  )
}