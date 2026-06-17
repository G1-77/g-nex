'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, Trophy, MessageSquare, Briefcase, Settings, Wallet } from 'lucide-react'

const TERMINAL_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/market/dashboard' },
  { label: 'Markets', icon: BarChart3, href: '/market' },
  { label: 'Leaderboards', icon: Trophy, href: '/market/leaderboards' },
  { label: 'Discussions', icon: MessageSquare, href: '/market/discussions' },
  { label: 'Portfolio', icon: Briefcase, href: '/market/portfolio' },
  { label: 'Settings', icon: Settings, href: '/market/settings' },
]

export default function MarketSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-900 bg-slate-950 p-4 justify-between h-[calc(100vh-4rem)] sticky top-16 select-none z-20">
      
      {/* Upper Navigation Options Links Grid Tree */}
      <div className="space-y-1.5 flex flex-col w-full">
        {TERMINAL_NAV.map((item) => {
          // Accurate active path checking to highlight current anchor position
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <button
              key={item.label}
              type="button"
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Local KES Currency Wallet Account Balance Card Widget */}
      <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 relative overflow-hidden group w-full">
        <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-full blur-xl transition-all duration-300 group-hover:scale-125" />
        <div className="flex items-center gap-2 text-emerald-400">
          <Wallet className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black tracking-widest uppercase">Liquidity Account</span>
        </div>
        <div className="text-base font-black font-mono mt-1.5 text-slate-100">
          KES 74,500.00
        </div>
        
        <button
          type="button"
          className="w-full mt-3 rounded-xl bg-amber-500 text-slate-950 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-amber-400 active:scale-[0.97] transition-all shadow-sm cursor-pointer"
        >
          Deposit
        </button>
      </div>

    </aside>
  )
}
