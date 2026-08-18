'use client'

import { BarChart3, TrendingUp } from 'lucide-react'

interface ChartTypeToggleProps {
  chartType: 'line' | 'candlestick'
  onChange: (type: 'line' | 'candlestick') => void
}

export default function ChartTypeToggle({ chartType, onChange }: ChartTypeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-900/40 rounded-lg p-1">
      <button
        onClick={() => onChange('candlestick')}
        className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          chartType === 'candlestick'
            ? 'bg-slate-950 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Candles</span>
      </button>
      
      <button
        onClick={() => onChange('line')}
        className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          chartType === 'line'
            ? 'bg-slate-950 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Line</span>
      </button>
    </div>
  )
}
