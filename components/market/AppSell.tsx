'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, BarChart3, Trophy, MessageSquare, Briefcase, Settings, Wallet, ArrowUpRight 
} from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
}

const SIDEBAR_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Markets', icon: BarChart3 },
  { href: '/leaderboard', label: 'Leaderboards', icon: Trophy },
  { href: '/discussions', label: 'Discussions', icon: MessageSquare },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500/20">
      
      {/* PERSISTENT LEFT SIDEBAR NAVIGATION RAIL (DESKTOP ONLY) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-900/60 bg-slate-950 p-5 justify-between h-screen sticky top-0 select-none">
        <div className="space-y-7 flex flex-col">
          <div className="flex items-center gap-2 px-3">
            <span className="text-xl font-black tracking-tighter text-amber-500 font-mono">GNEX</span>
            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">PRO</span>
          </div>

          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href === '/market' && pathname?.startsWith('/market'))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* ACCOUNTING METRICS BALANCE CONTAINER */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-4 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 h-24 w-24 bg-amber-500/[0.02] rounded-full blur-2xl" />
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <Wallet className="h-3.5 w-3.5" />
            <span>Available Wallet</span>
          </div>
          <div className="text-base font-black font-mono text-slate-100 mt-1">
            KES 74,500.00
          </div>
          <button
            type="button"
            className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 py-2.5 text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Deposit Balance</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
          </button>
        </div>
      </aside>

      {/* DYNAMIC SCREEN COMPILER AREA */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

    </div>
  )
}
