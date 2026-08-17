'use client'

import { X, AlertCircle, Wallet } from 'lucide-react'
import type { AssetSymbol } from '@/lib/supabase/types'

interface InsufficientBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: AssetSymbol
  requiredAmount: number
  availableBalance: number
  onDeposit: () => void
  onAdjustAmount: () => void
}

export default function InsufficientBalanceModal({
  isOpen,
  onClose,
  symbol,
  requiredAmount,
  availableBalance,
  onDeposit,
  onAdjustAmount,
}: InsufficientBalanceModalProps) {
  if (!isOpen) return null

  const shortfall = requiredAmount - availableBalance

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-slate-950 border border-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100">Insufficient Balance</h3>
                <p className="text-xs text-slate-500">You need more funds to complete this trade</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 pt-2">
            {/* Balance Info */}
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Available Balance</span>
                <span className="text-sm font-mono font-bold text-slate-300">
                  KES {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Required Amount</span>
                <span className="text-sm font-mono font-bold text-slate-100">
                  KES {requiredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-300">You Need</span>
                  <span className="text-lg font-black font-mono text-rose-500">
                    KES {shortfall.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/40">
              <Wallet className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-slate-400">
                Trying to buy <span className="font-bold text-slate-300">{symbol}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onDeposit}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all active:scale-95 shadow-sm"
            >
              Deposit KES {shortfall.toLocaleString('en-US', { maximumFractionDigits: 0 })} Now
            </button>
            
            <button
              onClick={onAdjustAmount}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold py-3 rounded-xl transition-all active:scale-95"
            >
              Adjust Trade Amount
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-300 font-bold py-2 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
