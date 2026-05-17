import {
  BadgeCheck,
  MessageSquare,
  Share2,
  ThumbsUp
} from 'lucide-react'

const interactions = [
  {
    icon: ThumbsUp,
    label: 'Like'
  },
  {
    icon: MessageSquare,
    label: 'Comment'
  },
  {
    icon: Share2,
    label: 'Share'
  }
]

export default function TradeFeed() {
  return (
    <div className="space-y-6">
      
      {/* POST 1 - SOLANA */}
      <article className="rounded-2xl border border-slate-800/40 bg-slate-900/40 p-5 backdrop-blur-md">
        
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
              alt="Solana Samurai"
              className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-800"
            />

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-100">
                  @SolanaSamurai
                </span>

                <div className="flex items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5">
                  <BadgeCheck className="h-3 w-3 text-emerald-400" />

                  <span className="text-[10px] font-semibold text-emerald-400">
                    Top 5%
                  </span>
                </div>
              </div>

              <span className="mt-0.5 text-[11px] font-medium text-emerald-400">
                +42% Monthly ROI
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-500">
            2h ago
          </span>
        </div>

        {/* CONTENT */}
        <div className="mt-4">
          <p className="text-sm leading-7 text-slate-300">
            Just loaded up more{' '}
            <span className="font-semibold text-emerald-400">
              $SOL
            </span>{' '}
            on this dip. Looking at a clean breakout flag on the
            4H chart. Invalidation level below $138. Who is riding
            this wave with me? 🚀
          </p>
        </div>

        {/* TRADE TAG */}
        <div className="mt-5 rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-slate-900/40 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            
            {/* ASSET */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/10">
                <span className="text-sm font-black text-emerald-400">
                  SOL
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-100">
                  Solana
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    $142.20
                  </span>

                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    +5.1%
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950">
              Copy This Setup
            </button>
          </div>
        </div>

        {/* INTERACTIONS */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-4">
          {interactions.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.label}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800/40 hover:text-slate-200"
              >
                <Icon className="h-4 w-4 transition group-hover:scale-105" />

                {item.label}
              </button>
            )
          })}
        </div>
      </article>

      {/* POST 2 - GOLD */}
      <article className="rounded-2xl border border-slate-800/40 bg-slate-900/40 p-5 backdrop-blur-md">
        
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
              alt="Gold Theory"
              className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-800"
            />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">
                  @GoldTheory
                </span>

                <span className="rounded-full border border-yellow-600/10 bg-yellow-600/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-600">
                  Gold Specialist
                </span>
              </div>

              <span className="mt-0.5 text-[11px] text-slate-500">
                Macro Investor
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-500">
            5h ago
          </span>
        </div>

        {/* CONTENT */}
        <div className="mt-4">
          <p className="text-sm leading-7 text-slate-300">
            Macro environment is screaming safe-haven accumulation.
            Just added more physical gold allocation to the portfolio.
            It is the ultimate hedge against paper currency debasement.
            🧭✨
          </p>
        </div>

        {/* TRADE TAG */}
        <div className="mt-5 rounded-2xl border border-yellow-600/10 bg-gradient-to-br from-yellow-600/5 to-slate-900/40 p-4">
          
          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-600/10 ring-1 ring-yellow-600/10">
                <span className="text-sm font-black text-yellow-600">
                  XAU
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-100">
                  Spot Gold
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-yellow-600">
                    $2,345.50/oz
                  </span>

                  <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                    -0.3%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK BUY */}
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {['Buy $10', 'Buy $50', 'Buy $100'].map((amount) => (
                <button
                  key={amount}
                  className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-yellow-600/30 hover:bg-yellow-600/10 hover:text-yellow-600"
                >
                  {amount}
                </button>
              ))}
            </div>

            <button className="w-full rounded-xl bg-yellow-600 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-yellow-500">
              Accumulate Gold
            </button>
          </div>
        </div>

        {/* INTERACTIONS */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-4">
          {interactions.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.label}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800/40 hover:text-slate-200"
              >
                <Icon className="h-4 w-4 transition group-hover:scale-105" />

                {item.label}
              </button>
            )
          })}
        </div>
      </article>
    </div>
  )
}