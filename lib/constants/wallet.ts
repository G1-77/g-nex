// GNEX wallet: platform-level deposit / withdrawal / lock configuration.
// The M-Pesa PayBill number is a placeholder until the platform shortcode is issued.

export const WALLET_CONFIG = {
  // M-Pesa PayBill business number (set when the platform account is live).
  MPESA_PAYBILL_NUMBER: '000000',
  // Airtel send-to-number (Phase 1 — number-based until Airtel API integration).
  AIRTEL_PAYIN_NUMBER: '0733 000 000',
  // Share of every confirmed deposit moved to the silent platform reserve.
  RESERVE_RATE: 0.1,
  // Maximum share of the visible account (cash + locked + holdings) a user
  // may withdraw at any time — this is an investment platform.
  MAX_WITHDRAW_PCT: 0.7,
  // Cooling-off window for voluntary unlocks.
  LOCK_UNLOCK_HOURS: 24,
  // Duplicate-submit guard window for provisional deposits (in ms).
  DEPOSIT_DUPLICATE_WINDOW_MS: 1000 * 60 * 15,
} as const

export const QUICK_DEPOSIT_AMOUNTS = [500, 1000, 5000, 10000]

// Withdrawal charge: flat 2% of the withdrawn amount (no min / max floor).
export const WITHDRAWAL_FEE_RATE = 0.02

export function withdrawalFee(amountKes: number, rate: number = WITHDRAWAL_FEE_RATE): number {
  if (!Number.isFinite(amountKes) || amountKes <= 0) return 0
  if (!Number.isFinite(rate) || rate < 0) return 0
  return Math.round(amountKes * rate)
}

// Demo mode: when NEXT_PUBLIC_DEMO_MODE=true the wallet simulates admin
// verification/payout so the full deposit → withdraw lifecycle can be
// demonstrated to investors without the (future) admin panel.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Delay (ms) before the demo simulator advances pending rows, so the amber
// "verifying" state is visible before it flips to confirmed/paid.
export const DEMO_VERIFY_DELAY_MS = 6000