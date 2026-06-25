'use client'

import { useState, useMemo } from 'react'
import { Landmark, ShieldAlert, Zap } from 'lucide-react'
import type { AssetSymbol } from '@/lib/supabase/types'

interface ExecutionPanelProps {
  symbol: AssetSymbol
}

type TradeType = 'BUY' | 'SELL'
type OrderType = 'Market' | 'Limit' | 'Stop'

export default function ExecutionPanel({ symbol }: ExecutionPanelProps) {
  const [tradeMode, setTradeMode] = useState<TradeType>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('Market')
  const [amountUsd, setAmountUsd] = useState<string>('1000')

  // 🟢 DUAL-CURRENCY CALCULATION MATRIX
  // Automatically computes the local KES transaction footprint behind the scenes
  const estimatedKesConversion = useMemo(() => {
    const parsedAmount = parseFloat(amountUsd) || 0
    return parsedAmount * 134.50 // Fixed reference baseline USD/KES FX multiplier rate
  }, [amountUsd])

  const handlePercentageClick = (fraction: number) => {
    // Simulates dynamic portfolio percentage allocations sizing triggers
    const calculatedBase = fraction * 2500
    setAmountUsd(calculatedBase.toString())
  }

  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-slate-950 border-l border-slate-900 p-4 justify-between h-[calc(100vh-4rem)] sticky top-16 select-none z-20">
      <div className="space-y-5 flex flex-col w-full">
        
        {/* BUY / SELL RADICAL TOGGLE TABS */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
          {(['BUY', 'SELL'] as TradeType[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTradeMode(mode)}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none outline-none ${
                tradeMode === mode 
                  ? mode === 'BUY' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                    : 'bg-rose-500 text-slate-100 shadow-md shadow-rose-500/10'
                  : 'text-slate-500 hover:text-slate-300 bg-transparent'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* ORDER TYPE ADVANCED ROUTING FILTERS */}
        <div className="flex justify-between bg-slate-900/20 p-1 rounded-lg border border-slate-900/60">
          {(['Market', 'Limit', 'Stop'] as OrderType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all border-none cursor-pointer outline-none ${
                orderType === type ? 'bg-slate-900 text-slate-200' : 'text-slate-600 hover:text-slate-400 bg-transparent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* PRICE ENTRY INPUT FORM DECK BOX */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3.5 space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans">
            <span>Amount</span>
            <span>USD</span>
          </div>
          <div className="relative flex items-baseline w-full">
            <span className="text-slate-400 font-mono text-lg font-black mr-1">$</span>
            <input
              type="number"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="w-full bg-transparent border-none text-slate-100 font-mono text-xl font-black focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono font-bold pt-2 border-t border-slate-900/40 flex items-center justify-between">
            <span className="text-slate-500 font-sans font-medium">Estimated Cost</span>
            <span className="text-slate-300 font-black">
              ~ {estimatedKesConversion.toLocaleString(undefined, { minimumFractionDigits: 2 })} KES
            </span>
          </div>
        </div>

        {/* FRACTION PERCENTAGE CONFIGURATION SHORTCUT CHIPS */}
        <div className="grid grid-cols-4 gap-1.5 font-mono">
          {[
            { label: '24%', fraction: 0.25 },
            { label: '50%', fraction: 0.50 },
            { label: '75%', fraction: 0.75 },
            { label: 'MAX', fraction: 1.00 }
          ].map((pct) => (
            <button
              key={pct.label}
              type="button"
              onClick={() => handlePercentageClick(pct.fraction)}
              className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer transition-colors outline-none"
            >
              {pct.label}
            </button>
          ))}
        </div>

        {/* PRIMARY TRANSACTION CONVERSION SEED BUTTON */}
        <div className="space-y-2.5 pt-2">
          <button 
            type="button" 
            onClick={() => alert(`Order Successfully Initiated: ${tradeMode} ${amountUsd} USD worth of ${symbol}`)}
            className={`w-full font-sans text-xs font-black uppercase tracking-wider py-3 rounded-xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer border-none outline-none ${
              tradeMode === 'BUY'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/10 hover:bg-emerald-400'
                : 'bg-rose-500 text-slate-100 shadow-rose-500/10 hover:bg-rose-400'
            }`}
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>Execute {tradeMode} {symbol}</span>
          </button>
          
          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono justify-center">
            <Landmark className="h-3 w-3" />
            <span>Settle margins directly from KES account balances</span>
          </div>
        </div>

      </div>

      {/* MACRO RISK VOLATILITY ALERTS WARNING HEADER FLAG */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-3 flex items-start gap-2.5 shadow-md">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-sans">Liquidity Safety Alert</span>
          <span className="text-[10px] text-slate-400 font-mono font-bold truncate mt-0.5">Slippage protection locked at 0.5%</span>
        </div>
      </div>
    </aside>
  )
}
