'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { marketKeys } from '@/lib/react-query/market/keys'
import type {
  ClosePositionResult,
  OrderRow,
  TradeExecutionResult,
  TradeMode,
  TradeQuote,
  TradeSide,
  TransactionRow,
} from '@/lib/supabase/market.types'
import type { AssetSymbol } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// CACHE INVALIDATION MAP
// Every successful execution touches the wallet, holdings, positions, orders
// and the ledger — so a single mutation invalidates all five channels.
// ---------------------------------------------------------------------------
function invalidateFinancialChannels(queryClient: ReturnType<typeof useQueryClient>, userId: string | null) {
  const targets = [
    marketKeys.wallet(userId),
    marketKeys.holdings(userId),
    marketKeys.positions(userId),
    marketKeys.orders(userId),
    marketKeys.transactions(userId),
  ]
  for (const key of targets) {
    void queryClient.invalidateQueries({ queryKey: key, exact: false, refetchType: 'active' })
  }
}

// ---------------------------------------------------------------------------
// ROW MAPPERS (raw DB snake_case -> typed camelCase, zero `any`)
// ---------------------------------------------------------------------------

interface OrderRowRaw {
  id: string
  user_id: string
  asset_id: string | null
  order_type: 'market' | 'limit' | 'stop_limit'
  side: TradeSide
  mode: TradeMode
  quantity: number
  price: number | null
  filled_quantity: number
  average_fill_price: number | null
  fee: number
  margin_kes: number
  status: 'open' | 'filled' | 'partial' | 'cancelled'
  idempotency_key: string | null
  created_at: string
  updated_at: string
}

interface TransactionRowRaw {
  id: string
  user_id: string
  asset_id: string | null
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal'
  amount: number
  price_at_time: number | null
  fee: number
  amount_kes: number | null
  status: string
  reference: string | null
  notes: string | null
  order_id: string | null
  created_at: string
  assets: { symbol: string } | null
}

function mapOrderRow(row: OrderRowRaw): OrderRow {
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id,
    orderType: row.order_type,
    side: row.side,
    mode: row.mode,
    quantity: Number(row.quantity),
    price: row.price === null ? null : Number(row.price),
    filledQuantity: Number(row.filled_quantity),
    averageFillPrice: row.average_fill_price === null ? null : Number(row.average_fill_price),
    fee: Number(row.fee),
    marginKes: Number(row.margin_kes),
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTransactionRow(row: TransactionRowRaw): TransactionRow {
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id,
    assetSymbol: (row.assets?.symbol as AssetSymbol | undefined) ?? null,
    type: row.type,
    amount: Number(row.amount),
    priceAtTime: row.price_at_time === null ? null : Number(row.price_at_time),
    fee: Number(row.fee),
    amountKes: row.amount_kes === null ? null : Number(row.amount_kes),
    status: row.status,
    reference: row.reference,
    notes: row.notes,
    orderId: row.order_id,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// EXECUTE TRADE (market order)
// ---------------------------------------------------------------------------

export interface ExecuteTradeInput {
  userId: string
  symbol: AssetSymbol
  side: TradeSide
  mode: TradeMode
  amountUsd: number
  leverage?: number
  idempotencyKey?: string
}

async function executeTrade(input: ExecuteTradeInput): Promise<TradeExecutionResult> {
  const res = await fetch('/api/orders/market', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: input.symbol,
      side: input.side,
      mode: input.mode,
      amountUsd: input.amountUsd,
      leverage: input.leverage ?? 1,
      idempotencyKey: input.idempotencyKey ?? null,
    }),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Trade failed')
  }

  return (await res.json()) as TradeExecutionResult
}

export function useExecuteTradeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: executeTrade,
    onSuccess: (_data, variables) => {
      invalidateFinancialChannels(queryClient, variables.userId)
    },
  })
}

// ---------------------------------------------------------------------------
// CLOSE POSITION (margin)
// ---------------------------------------------------------------------------

export interface ClosePositionInput {
  userId: string
  positionId: string
}

async function closePosition(input: ClosePositionInput): Promise<ClosePositionResult> {
  const res = await fetch('/api/orders/close-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionId: input.positionId }),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Close failed')
  }

  return (await res.json()) as ClosePositionResult
}

export function useClosePositionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: closePosition,
    onSuccess: (_data, variables) => {
      invalidateFinancialChannels(queryClient, variables.userId)
    },
  })
}

// ---------------------------------------------------------------------------
// SERVER-AUTHORITATIVE QUOTE PREVIEW
// ---------------------------------------------------------------------------

export interface TradeQuoteInput {
  symbol: AssetSymbol
  side: TradeSide
  mode: TradeMode
  amountUsd: number
  leverage?: number
}

async function fetchTradeQuote(input: TradeQuoteInput): Promise<TradeQuote> {
  const params = new URLSearchParams({
    symbol: input.symbol,
    side: input.side,
    mode: input.mode,
    amount: String(input.amountUsd),
  })
  if (input.mode === 'margin' && input.leverage) {
    params.set('leverage', String(input.leverage))
  }
  const res = await fetch(`/api/orders/quote?${params.toString()}`)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Quote unavailable')
  }
  return (await res.json()) as TradeQuote
}

export function useTradeQuoteQuery(input: TradeQuoteInput | null) {
  return useQuery({
    queryKey: ['orders', 'quote', input?.symbol, input?.side, input?.mode, input?.amountUsd, input?.leverage] as const,
    queryFn: () => fetchTradeQuote(input as TradeQuoteInput),
    enabled: Boolean(
      input &&
        Number.isFinite(input.amountUsd) &&
        input.amountUsd > 0
    ),
    staleTime: 1000 * 30,
    retry: 1,
  })
}

// ---------------------------------------------------------------------------
// READ CHANNELS
// ---------------------------------------------------------------------------

async function fetchUserOrders(userId: string | null): Promise<OrderRow[]> {
  if (!userId) return []
  const { data, error } = await supabase
    .from('orders')
    .select('id, user_id, asset_id, order_type, side, mode, quantity, price, filled_quantity, average_fill_price, fee, margin_kes, status, idempotency_key, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as OrderRowRaw[]).map(mapOrderRow)
}

export function useGetUserOrdersQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.orders(userId),
    queryFn: () => fetchUserOrders(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}

async function fetchUserTransactions(userId: string | null): Promise<TransactionRow[]> {
  if (!userId) return []
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, asset_id, type, amount, price_at_time, fee, amount_kes, status, reference, notes, order_id, created_at, assets(symbol)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as TransactionRowRaw[]).map(mapTransactionRow)
}

export function useGetUserTransactionsQuery(userId: string | null) {
  return useQuery({
    queryKey: marketKeys.transactions(userId),
    queryFn: () => fetchUserTransactions(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })
}