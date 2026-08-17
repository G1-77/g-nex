import Image from 'next/image'

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

export default function TopTradersWidget() {
  return (
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
                style={{ width: '40px', height: '40px' }}
                className="shrink-0 rounded-full object-cover ring-1 ring-slate-800"
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

              <button className="cursor-pointer rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-300 transition-all hover:border-transparent hover:bg-yellow-600 hover:text-slate-950">
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}