'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import type { ChartTimeframe, TradingViewChartProps } from '@/lib/supabase/market.types'

const TIMEFRAMES: ChartTimeframe[] = ['1H', '4H', '1D', '1W', '1M']

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D')
  const [isScriptReady, setIsScriptReady] = useState(false)
  
  const containerId = `tv_chart_container_${symbol.toLowerCase()}`

  const getWidgetTickerSymbol = (sym: string) => {
    if (sym === 'XAU') return 'FX_IDC:XAUUSD'
    if (sym === 'USDT') return 'CRYPTO:USDTUSD'
    return `BINANCE:${sym.toUpperCase()}USD`
  }

  useEffect(() => {
    const initWidget = () => {
      const element = document.getElementById(containerId)
      
      const sdk = typeof window !== 'undefined' ? (window as any).TradingView : null

      if (element && sdk && sdk.widget) {
        new sdk.widget({
          container_id: containerId,
          width: '100%',
          height: '100%',
          symbol: getWidgetTickerSymbol(symbol),
          interval: timeframe === '1H' ? '60' : timeframe === '4H' ? '240' : 'D',
          timezone: 'Africa/Nairobi',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          save_image: false,
          backgroundColor: '#020617',
          gridColor: 'rgba(30, 41, 59, 0.1)',
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies']
        })
      }
    }

    // Direct loop trigger that continues checking every 200ms until the script is fully present on disk
    const interval = setInterval(() => {
      const sdk = typeof window !== 'undefined' ? (window as any).TradingView : null
      if (sdk && sdk.widget) {
        initWidget()
        clearInterval(interval)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [symbol, timeframe, containerId])

  return (
    <div className="w-full bg-slate-900/10 border border-white/5 rounded-3xl p-4 backdrop-blur-xl space-y-4 shadow-xl select-none animate-fadeIn">
      
      {/* Explicit script load to force dynamic script delivery */}
      <Script
        src="https://tradingview.com"
        strategy="lazyOnload"
        onLoad={() => setIsScriptReady(true)}
      />

      <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          Advanced Chart
        </span>
        
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: timeframe === tf ? '#f59e0b' : '#020617',
                color: timeframe === tf ? '#020617' : '#94a3b8',
                borderColor: timeframe === tf ? '#d97706' : '#1e293b'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div 
        id={containerId} 
        className="w-full h-80 md:h-125 rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-900/40"
      />
    </div>
  )
}
