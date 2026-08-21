'use client'

import { useSyncExternalStore } from 'react'
import type { AssetSymbol } from '@/lib/supabase/types'

export interface BinanceTicker {
  symbol: AssetSymbol
  priceUsd: number
  change24h: number
  high24h: number
  low24h: number
  /** Exchange event time — can be skewed vs the local clock. */
  lastUpdated: number
  /** Local receipt time — the skew-proof freshness signal. */
  receivedAt: number
}

const WS_URL = 'wss://stream.binance.com:9443/stream?streams='

// Only pairs where the quote asset is genuinely USD-pegged. USDT itself has no
// honest Binance USD pair (usdcusdt is a different instrument), so it stays on
// the REST baseline instead of being overlaid with a wrong-asset price.
const PAIR_MAP: Partial<Record<AssetSymbol, string>> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  SOL: 'solusdt',
  XRP: 'xrpusdt',
}

const STREAM_SYMBOL_MAP: Record<string, AssetSymbol> = {
  btcusdt: 'BTC',
  ethusdt: 'ETH',
  solusdt: 'SOL',
  xrpusdt: 'XRP',
}

const LIVE_SYMBOLS = Object.keys(PAIR_MAP) as AssetSymbol[]

interface CombinedStreamMessage {
  stream: string
  data?: {
    s?: string
    c?: string
    P?: string
    h?: string
    l?: string
    E?: number
  }
}

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let subscribers = 0

let tickers = new Map<AssetSymbol, BinanceTicker>()
const EMPTY_SNAPSHOT: ReadonlyMap<AssetSymbol, BinanceTicker> = new Map()
const listeners = new Set<() => void>()

const MAX_HISTORY_POINTS = 40
let priceHistory = new Map<AssetSymbol, readonly number[]>()
const EMPTY_HISTORY: readonly number[] = []

function getPriceHistory(symbol: AssetSymbol): readonly number[] {
  return priceHistory.get(symbol) ?? EMPTY_HISTORY
}

function snapshot(): ReadonlyMap<AssetSymbol, BinanceTicker> {
  return tickers
}

function serverSnapshot(): ReadonlyMap<AssetSymbol, BinanceTicker> {
  return EMPTY_SNAPSHOT
}

function emit() {
  listeners.forEach((listener) => listener())
}

function connect() {
  if (socket || typeof window === 'undefined') return

  const streams = LIVE_SYMBOLS.map((sym) => `${PAIR_MAP[sym]}@miniTicker`)
  socket = new WebSocket(WS_URL + streams.join('/'))

  socket.onopen = () => {
    reconnectAttempts = 0
  }

  socket.onmessage = (event: MessageEvent<string>) => {
    try {
      const raw: CombinedStreamMessage = JSON.parse(event.data)
      const data = raw.data
      if (!data?.s) return

      const symbol = STREAM_SYMBOL_MAP[data.s.toLowerCase()]
      if (!symbol || data.c === undefined || data.P === undefined) return

      const ticker: BinanceTicker = {
        symbol,
        priceUsd: parseFloat(data.c),
        change24h: parseFloat(data.P),
        high24h: parseFloat(data.h ?? '0'),
        low24h: parseFloat(data.l ?? '0'),
        lastUpdated: data.E ?? Date.now(),
        receivedAt: Date.now(),
      }

      // Create a new Map reference so useSyncExternalStore detects the change
      tickers = new Map(tickers).set(symbol, ticker)
      priceHistory = new Map(priceHistory).set(
        symbol,
        [...(priceHistory.get(symbol) ?? []), ticker.priceUsd].slice(-MAX_HISTORY_POINTS)
      )
      emit()
    } catch {
      // ignore malformed frames
    }
  }

  socket.onclose = () => {
    socket = null
    scheduleReconnect()
  }

  socket.onerror = () => {
    socket?.close()
  }
}

function scheduleReconnect() {
  if (subscribers === 0 || reconnectTimer) return
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
  reconnectAttempts += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  subscribers += 1
  connect()
  return () => {
    listeners.delete(listener)
    subscribers -= 1
    if (subscribers === 0) {
      socket?.close()
      socket = null
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }
  }
}

export function useBinanceRealtime(): ReadonlyMap<AssetSymbol, BinanceTicker> {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

export function usePriceHistory(symbol: AssetSymbol): readonly number[] {
  return useSyncExternalStore(
    subscribe,
    () => getPriceHistory(symbol),
    () => EMPTY_HISTORY
  )
}
