'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { fetchOHLCData, generateMockIntradayData, getIntervalMs } from '@/lib/market/ohlc'
import type { OHLCData, Timeframe } from '@/lib/market/ohlc'
import type { AssetSymbol } from '@/lib/supabase/types'

interface TradingViewChartProps {
  symbol: AssetSymbol
  timeframe: Timeframe
  chartType: 'line' | 'candlestick'
  currentPrice: number
}

const SUPPORTED_SYMBOLS: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'XRP', 'USDT']

const VISIBLE_BARS = 80

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
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null)
  const lastCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ohlc', symbol, timeframe],
    queryFn: () => loadOHLC(symbol, timeframe, currentPrice),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // slow baseline refresh; live ticks stream below
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
        secondsVisible: true,
        rightOffset: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
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

    const last = data[data.length - 1]
    if (last) {
      lastCandleRef.current = { time: last.time, open: last.open, high: last.high, low: last.low, close: last.close }
    }

    // Pin to the right edge showing only recent bars (like Binance/TradingView).
    // fitContent() would zoom out to all history and hide live movement.
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, data.length - VISIBLE_BARS),
      to: data.length + 5,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chartRef.current = null
      seriesRef.current = null
      chart.remove()
    }
  }, [data, chartType, symbol])

  // Live streaming: push the current price into the series on every tick
  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series || !data || data.length === 0) return

    const intervalSec = getIntervalMs(timeframe) / 1000
    const nowSec = Math.floor(Date.now() / 1000)
    const candleTime = Math.floor(nowSec / intervalSec) * intervalSec

    if (chartType === 'line') {
      const lineSeries = series as ISeriesApi<'Line'>
      // Always update at the current second so the timestamp is never older
      // than the last data point (monotonic streaming).
      lineSeries.update({ time: nowSec as UTCTimestamp, value: currentPrice })
    } else {
      const candleSeries = series as ISeriesApi<'Candlestick'>
      const last = lastCandleRef.current

      if (last && last.time === candleTime) {
        // Same forming candle: high/low/close move in place
        candleSeries.update({
          time: last.time as UTCTimestamp,
          open: last.open,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          close: currentPrice,
        })
      } else if (last && candleTime < last.time) {
        // Data inconsistency (mock rows end at "now"): never go backwards,
        // update the existing candle in place instead.
        candleSeries.update({
          time: last.time as UTCTimestamp,
          open: last.open,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          close: currentPrice,
        })
      } else {
        // New candle period: roll a fresh candle, open = previous close.
        // Ensure the new time is strictly ahead of the last data point.
        const open = last ? last.close : currentPrice
        const newTime = last ? Math.max(candleTime, last.time + intervalSec) : candleTime
        candleSeries.update({
          time: newTime as UTCTimestamp,
          open,
          high: Math.max(open, currentPrice),
          low: Math.min(open, currentPrice),
          close: currentPrice,
        })
        lastCandleRef.current = { time: newTime, open, high: currentPrice, low: currentPrice, close: currentPrice }
      }
    }

    chart.timeScale().scrollToRealTime()
  }, [currentPrice, chartType, timeframe, data])

  return (
    <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl overflow-hidden select-none">
      <div ref={containerRef} className="relative w-full h-[300px] sm:h-[380px] md:h-[480px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 border-4 border-slate-800 border-t-yellow-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}