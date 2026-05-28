import Image from 'next/image'
import {
  Bookmark,
  // Camera,
  ChevronRight,
  GraduationCap,
  LineChart,
  // Sparkles,
} from 'lucide-react'
// import TradeFeed from '@/components/feed/TradeFeed'
import FeedList from '@/components/feed/FeedList'

const watchlistAssets = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: '$64,250.00',
    change: '+3.4%',
    positive: true
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    price: '$142.20',
    change: '+5.1%',
    positive: true
  },
  {
    symbol: 'XAU',
    name: 'Spot Gold',
    price: '$2,345.50/oz',
    change: '-0.3%',
    positive: false
  }
]

const traders = [
  {
    username: '@AlphaQuants',
    specialty: 'Crypto',
    roi: '+184% ROI',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop'
  },
  {
    username: '@GoldTheory',
    specialty: 'Gold',
    roi: '+142% ROI',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop'
  },
  {
    username: '@MacroFlow',
    specialty: 'Crypto',
    roi: '+119% ROI',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop'
  }
]

const trendingSignals = [
  '#BitcoinHalving',
  '#GoldStandard',
  '#SolanaBreakout',
  '#EthereumETF',
  '#SafeHavenAssets'
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 antialiased selection:bg-yellow-600/20 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3 lg:grid-cols-4">
          
          {/* LEFT SIDEBAR */}
          <aside className="sticky top-24 hidden flex-col gap-6 lg:flex">
            
            {/* QUICK ACCESS */}
            <div className="space-y-1">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Explore
              </p>

              {[
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
              ].map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900/60 hover:text-slate-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 transition-colors group-hover:bg-slate-800">
                      <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-yellow-600" />
                    </div>

                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* WATCHLIST */}
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Markets Watch
                </h2>

                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>

              <div className="space-y-1.5">
                {watchlistAssets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-2.5 transition-colors hover:border-slate-800/40 hover:bg-slate-900/40"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white">
                        {asset.symbol}
                      </span>

                      <span className="text-[11px] text-slate-500">
                        {asset.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-xs font-mono font-semibold ${
                          asset.symbol === 'XAU'
                            ? 'text-yellow-600'
                            : 'text-slate-200'
                        }`}
                      >
                        {asset.price}
                      </p>

                      <p
                        className={`text-[10px] font-mono font-medium ${
                          asset.positive
                            ? 'text-emerald-400'
                            : 'text-rose-500'
                        }`}
                      >
                        {asset.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* CENTER FEED */}
          <main className="col-span-1 grid gap-6 md:col-span-2 lg:col-span-2">
            
            <FeedList />
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="col-span-1 hidden flex-col gap-6 md:flex sticky top-24 h-fit">
            
            {/* TOP TRADERS */}
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Top Traders
              </h2>

              <div className="space-y-3.5">
                {traders.map((trader) => (
                  <div
                    key={trader.username}
                    className="group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={trader.image}
                        alt={trader.username}
                        width={40}
                        height={40}
                        style={{ width: "40px", height: "40px" }}
                        className="rounded-full object-cover shrink-0 ring-1 ring-slate-800"
                      />

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 transition-colors group-hover:text-white">
                          {trader.username}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          {trader.specialty} Specialist
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-emerald-500/10 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                        {trader.roi}
                      </span>

                      <button className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-300 transition-all hover:border-transparent hover:bg-yellow-600 hover:text-slate-950 cursor-pointer">
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRENDING */}
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4 backdrop-blur-md">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Trending Assets
              </h2>

              <div className="space-y-1">
                {trendingSignals.map((tag) => (
                  <div
                    key={tag}
                    className="group flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-900/30 hover:text-slate-200"
                  >
                    <span className="font-medium">
                      {tag}
                    </span>

                    <ChevronRight className="h-3 w-3 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}