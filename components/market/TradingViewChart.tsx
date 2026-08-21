'use client'

// components/market/TradingViewChart.tsx
// Real-OHLC candlestick/line chart. The chart instance is created ONCE per
// mount and mutated in place: setData on timeframe/asset changes, series.update
// for live ticks, and a persistent current-price line kept in sync via
// applyOptions. No synthetic fallback — provider failure renders an explicit
// unavailable state.

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface TradingViewChartProps {
  symbol: string
  timeframe: string
  chartType: 'line' | 'candlestick'
  currentPrice: number
}

const VISIBLE_BARS = 80

interface OhlcResponse {
  candles: OHLCData[]
}

async function loadOHLC(symbol: string, timeframe: string): Promise<OHLCData[]> {
  const res = await fetch(`/api/market/ohlc?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Chart data unavailable')
  }
  const payload = (await res.json()) as OhlcResponse
  return payload.candles
}

export default function TradingViewChart({ symbol, timeframe, chartType, currentPrice }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null)
  const priceLineRef = useRef<IPriceLine | null>(null)
  const lastCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ohlc', symbol, timeframe],
    queryFn: () => loadOHLC(symbol, timeframe),
    staleTime: 1000 * 20,
    retry: 1,
    refetchInterval: 1000 * 60, // slow baseline refresh; live ticks stream below
  })

  // ---- Chart lifecycle: create once per mount, dispose cleanly. autoSize
  // binds the canvas to the container so ResizeObserver handling is built in.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      autoSize: true,
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
        rightOffset: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(148, 163, 184, 0.4)', labelBackgroundColor: '#1e293b' },
        horzLine: { color: 'rgba(148, 163, 184, 0.4)', labelBackgroundColor: '#1e293b' },
      },
    })

    chartRef.current = chart

    return () => {
      priceLineRef.current = null
      seriesRef.current = null
      lastCandleRef.current = null
      chartRef.current = null
      chart.remove()
    }
  }, [])

  // ---- Series lifecycle: swap the series only when the chart type changes.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (seriesRef.current) {
      priceLineRef.current = null
      chart.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

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

    seriesRef.current = series
  }, [chartType])

  // ---- Data lifecycle: push fetched candles into the existing series.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !data || data.length === 0) return

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
    lastCandleRef.current = last
      ? { time: last.time, open: last.open, high: last.high, low: last.low, close: last.close }
      : null

    // Pin to the right edge showing only recent bars (like Binance/TradingView).
    // fitContent() would zoom out to all history and hide live movement.
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, data.length - VISIBLE_BARS),
      to: data.length + 5,
    })
  }, [data, chartType])

  // ---- Current-price marker: persistent line + axis label, updated in place.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !Number.isFinite(currentPrice) || currentPrice <= 0) return

    if (!priceLineRef.current) {
      priceLineRef.current = series.createPriceLine({
        price: currentPrice,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      })
    } else {
      priceLineRef.current.applyOptions({ price: currentPrice })
    }
  }, [currentPrice, data, chartType])

  // ---- Live streaming: fold the current price into the forming candle.
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !data || data.length === 0) return
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return

    const intervalSecMap: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '1H': 3600,
      '4H': 14400, '1D': 86400, '1W': 604800, '1M': 2592000,
    }
    const intervalSec = intervalSecMap[timeframe] ?? 86400
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

      if (last && candleTime <= last.time) {
        // Same forming candle (or out-of-order data): move in place.
        candleSeries.update({
          time: last.time as UTCTimestamp,
          open: last.open,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          close: currentPrice,
        })
        lastCandleRef.current = {
          ...last,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          close: currentPrice,
        }
      } else {
        // New candle period: roll a fresh candle, open = previous close.
        const open = last ? last.close : currentPrice
        const newTime = last ? Math.max(candleTime, last.time + intervalSec) : candleTime
        candleSeries.update({
          time: newTime as UTCTimestamp,
          open,
          high: Math.max(open, currentPrice),
          low: Math.min(open, currentPrice),
          close: currentPrice,
        })
        lastCandleRef.current = { time: newTime, open, high: Math.max(open, currentPrice), low: Math.min(open, currentPrice), close: currentPrice }
      }
    }

    chartRef.current?.timeScale().scrollToRealTime()
  }, [currentPrice, chartType, timeframe, data])

  return (
    <div className="rounded-3xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl overflow-hidden select-none">
      <div ref={containerRef} className="relative h-[280px] w-full sm:h-[380px] md:h-[480px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 border-4 border-slate-800 border-t-yellow-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Loading chart data...</p>
            </div>
          </div>
        )}
        {isError && !isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center space-y-2 px-6">
              <p className="text-sm font-semibold text-slate-300">Chart data unavailable</p>
              <p className="text-xs text-slate-500 font-mono">
                Live {symbol} history could not be loaded. Price quotes remain active.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
