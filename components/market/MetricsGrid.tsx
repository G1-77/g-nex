'use client'

interface MetricsGridProps {
  high24h: number | null
  low24h: number | null
  volume24h: number | null
  marketCap: number | null
}

export default function MetricsGrid({ high24h, low24h, volume24h, marketCap }: MetricsGridProps) {
  const formatLargeNumber = (num: number | null): string => {
    if (num == null) return '—'
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K'
    return '$' + num.toFixed(2)
  }

  const metrics = [
    { label: '24H HIGH', value: high24h == null ? '—' : '$' + high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: '24H LOW', value: low24h == null ? '—' : '$' + low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: '24H VOLUME', value: formatLargeNumber(volume24h) },
    { label: 'MKT CAP', value: formatLargeNumber(marketCap) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
      {metrics.map((metric) => (
        <div 
          key={metric.label}
          className="rounded-xl border border-slate-900/60 bg-slate-900/20 p-4 backdrop-blur-sm"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            {metric.label}
          </div>
          <div className="text-base md:text-lg font-black font-mono text-slate-100">
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  )
}
