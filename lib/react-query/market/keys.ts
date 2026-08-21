/**
 *  Centralized TanStack Query Cache-Key Registry Dictionary for GNEX Market operations.
 * Enforces strict semantic tracking layers to allow targeted query invalidation sweeps.
 */
export const marketKeys = {
  all: ['market'] as const,
  // Tracks your upcoming CoinGecko + TradingView combined story card feeds
  stories: () => [...marketKeys.all, 'stories'] as const,
  // Cache slot for tracking the user's local KES currency wallet balance row
  wallet: (userId: string | null) => [...marketKeys.all, 'wallet', userId] as const,
  // Cache slot for tracking savings-style portfolio holdings rows
  holdings: (userId: string | null) => [...marketKeys.all, 'holdings', userId] as const,
  // Cache slot for tracking deposit/withdrawal funding requests
  requests: (userId: string | null) => [...marketKeys.all, 'requests', userId] as const,
  // Cache slot for tracking personalized asset watchlist arrays
  watchlist: (userId: string | null) => [...marketKeys.all, 'watchlist', userId] as const,
  // Cache slot for tracking active leverage positions ledger rows
  positions: (userId: string | null) => [...marketKeys.all, 'positions', userId] as const,
  // Cache slot for tracking executed market orders history
  orders: (userId: string | null) => [...marketKeys.all, 'orders', userId] as const,
  // Cache slot for tracking the financial ledger (buy/sell transactions)
  transactions: (userId: string | null) => [...marketKeys.all, 'transactions', userId] as const,
  // Cache slot for the user's permanent M-Pesa PayBill account number
  depositAccount: (userId: string | null) => [...marketKeys.all, 'deposit-account', userId] as const,
  // Cache slot for voluntary fund locks
  locks: (userId: string | null) => [...marketKeys.all, 'locks', userId] as const,
}
