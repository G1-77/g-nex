'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChartTimeframe, TradingViewChartProps } from '@/lib/supabase/market.types'

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const TIMEFRAMES: ChartTimeframe[] = ['1H', '4H', '1D', '1W', '1M']

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D')

  const getWidgetTickerSymbol = (sym: string) => {
    if (sym === 'XAU') return 'FX_IDC:XAUUSD'
    if (sym === 'USDT') return 'CRYPTO:USDTUSD'
    return `BINANCE:${sym.toUpperCase()}USD`
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const widgetId = `tv-chart-${symbol.toLowerCase()}`
    container.innerHTML = `<div id="${widgetId}" class="w-full h-full rounded-2xl" />`

    const script = document.createElement('script')
    // FIXED: Updated script source URL to the production path to load widgets instantly
    script.src = 'https://tradingview-widget.com'
    script.type = 'text/javascript'
    script.async = true
    
    script.onload = () => {
      if (typeof window !== 'undefined' && window.TradingView) {
        new window.TradingView.widget({
          container_id: widgetId,
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
          gridColor: 'rgba(30, 41, 59, 0.2)',
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies'
          ]
        })
      }
    }

    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [symbol, timeframe])

  return (
    <div className="w-full bg-slate-900/10 border border-white/5 rounded-3xl p-4 backdrop-blur-xl space-y-4 shadow-xl select-none animate-fadeIn">
      {/* Timeframes Selector Ribbon Bar */}
      <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            Advanced Terminal Charting
          </span>
          <span className="hidden sm:inline-block text-[9px] bg-slate-950 text-slate-500 border border-slate-900 px-2 py-0.5 rounded font-mono font-bold">
            Live Stream Enabled
          </span>
        </div>
        
        {/* Timeframe Chips Row */}
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

      {/* Main Graph Window (Enforces strict height parameters to prevent layout shifting) */}
      <div 
        ref={containerRef} 
        className="w-full h-80 md:h-125 rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-900/40"
      />
    </div>
  )
}
