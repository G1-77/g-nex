'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createChart, LineSeries, CandlestickSeries, ColorType, type UTCTimestamp } from 'lightweight-charts'
import { fetchOHLCData, generateMockIntradayData } from '@/lib/market/ohlc'
import type { OHLCData, Timeframe } from '@/lib/market/ohlc'
import type { AssetSymbol } from '@/lib/supabase/types'

interface TradingViewChartProps {
  symbol: AssetSymbol
  timeframe: Timeframe
  chartType: 'line' | 'candlestick'
  currentPrice: number
}

const SUPPORTED_SYMBOLS: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'XRP', 'USDT']

async function loadOHLC(symbol: AssetSymbol, timeframe: Timeframe, currentPrice: number): Promise<OHLCData[]> {
  if (SUPPORTED_SYMBOLS.includes(symbol)) {
    try {
      const data = await fetchOHLCData(symbol, timeframe)
      if (data.length > 0) return data
    } catch {
      // fall through to mock generator
    }
  }
  return generateMockIntradayData(currentPrice, timeframe)
}

export default function TradingViewChart({ symbol, timeframe, chartType, currentPrice }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ohlc', symbol, timeframe],
    queryFn: () => loadOHLC(symbol, timeframe, currentPrice),
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const container = containerRef.current
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.3)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.3)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(30, 41, 59, 0.6)',
      },
      timeScale: {
        borderColor: 'rgba(30, 41, 59, 0.6)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(148, 163, 184, 0.4)', labelBackgroundColor: '#1e293b' },
        horzLine: { color: 'rgba(148, 163, 184, 0.4)', labelBackgroundColor: '#1e293b' },
      },
    })

    const series =
      chartType === 'candlestick'
        ? chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderUpColor: '#10b981',
            borderDownColor: '#f43f5e',
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
          })
        : chart.addSeries(LineSeries, {
            color: '#f59e0b',
            lineWidth: 2,
          })

    series.setData(
      chartType === 'candlestick'
        ? data.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        : data.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
    )

    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [data, chartType, symbol])

  return (
    <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl overflow-hidden select-none">
      <div ref={containerRef} className="relative w-full h-80 md:h-125">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}