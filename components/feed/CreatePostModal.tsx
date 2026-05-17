'use client'

import { useMemo, useState } from 'react'
import {
  Camera,
  ImagePlus,
  X,
  TrendingUp,
  TrendingDown,
  TimerReset,
  ScanLine,
  Landmark,
} from 'lucide-react'
import Image from 'next/image';
import { useCreatePostMutation } from '@/lib/react-query/mutations/feed.mutations';
import {
  ASSET_SYMBOLS,
  type AssetSymbol,
} from '@/lib/supabase/types'


interface CreatePostModalProps { open: boolean; onClose: () => void }
type SignalType = 'Bullish' | 'Bearish' | 'Accumulation' | 'Scalp' | 'Long-Term'

const MAX_CHARACTERS = 700

const signalOptions: {
  label: SignalType
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { label: 'Bullish', icon: TrendingUp },
  { label: 'Bearish', icon: TrendingDown },
  { label: 'Accumulation', icon: Landmark },
  { label: 'Scalp', icon: ScanLine },
  { label: 'Long-Term', icon: TimerReset }
]

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState<string>('')
  const [selectedSignal, setSelectedSignal] = useState<SignalType>('Bullish')
  const [assetInput, setAssetInput] = useState<string>('')
  const [selectedAssets, setSelectedAssets] = useState<AssetSymbol[]>([])

  
  const remainingCharacters = MAX_CHARACTERS - content.length
  
  const createPostMutation = useCreatePostMutation()

  const isPublishing = createPostMutation.isPending

  const filteredAssets = useMemo(() => {
    return ASSET_SYMBOLS.filter(
      (asset) =>
        asset.toLowerCase().includes(assetInput.toLowerCase()) &&
        !selectedAssets.includes(asset)
    )
  }, [assetInput, selectedAssets])

  const handleAddAsset = (asset: AssetSymbol) => {
    setSelectedAssets((prev) => [...prev, asset])
    setAssetInput('')
  }

  const handleRemoveAsset = (asset: string) => {
    setSelectedAssets((prev) => prev.filter((item) => item !== asset))
  }

  const handlePublish = async () => {
   if (!content.trim()) {
    return
   }

   await createPostMutation.mutateAsync({
    content,
    assetSymbol: selectedAssets,
    signalType: selectedSignal
   })

   setContent("")
   setSelectedAssets([])
   
   onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800/50 bg-slate-950/95 shadow-2xl shadow-black/40">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop"
              alt="User avatar"
              width={36}
              height={36}
              style={{ height: "auto", width: "auto"}}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-800"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">@SolanaSamurai</span>
              <span className="text-xs text-slate-500">Publishing to GNEX</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800/70 bg-slate-900/40 transition-colors hover:border-slate-700 hover:bg-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="space-y-6 px-6 py-5 max-h-[calc(100vh-12rem)] no-scrollbar overflow-y-auto pr-2">
          
          {/* TEXTAREA */}
          <div className="space-y-3">
            <textarea
              value={content}
              maxLength={MAX_CHARACTERS}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share a trade setup, analysis, or thought..."
              className="min-h-40 w-full resize-none rounded-2xl border border-slate-800/50 bg-slate-900/30 p-4 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-yellow-600/30 focus:ring-1 focus:ring-yellow-600/20"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-600">Market intelligence post</span>
              <span className={`text-xs font-mono ${remainingCharacters <= 30 ? 'text-yellow-600' : 'text-slate-500'}`}>
                {remainingCharacters}/700
              </span>
            </div>
          </div>

          {/* SIGNAL SELECTOR */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Signal Type</p>
            <div className="flex flex-wrap gap-2">
              {signalOptions.map((signal) => {
                const active = selectedSignal === signal.label
                const Icon = signal.icon

                const activeClasses =
                  signal.label === 'Bullish'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : signal.label === 'Bearish'
                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    : 'border-yellow-600/30 bg-yellow-600/10 text-yellow-600'

                return (
                  <button
                    key={signal.label}
                    type="button"
                    onClick={() => setSelectedSignal(signal.label)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      active ? activeClasses : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {signal.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ASSET TAGGING */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tag Assets</p>
            <div className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-4">
              {selectedAssets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAssets.map((asset) => (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => handleRemoveAsset(asset)}
                      className="rounded-full border border-yellow-600/20 bg-yellow-600/10 px-3 py-1 text-xs font-semibold text-yellow-600 transition-colors hover:bg-yellow-600/20 cursor-pointer"
                    >
                      #{asset}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={assetInput}
                onChange={(event) => setAssetInput(event.target.value)}
                placeholder="Search BTC, SOL, XAU..."
                className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              />
              {assetInput.length > 0 && filteredAssets.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => handleAddAsset(asset)}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-yellow-600/30 hover:text-yellow-600 cursor-pointer"
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MEDIA DROPZONE */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attach Media</p>
            <div className="flex min-h-35 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/20 p-6 text-center transition-colors hover:border-yellow-600/20 hover:bg-slate-900/40">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60">
                <ImagePlus className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-sm font-medium text-slate-300">Drag charts, screenshots, or media here</p>
              <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
              <button
                type="button"
                className="mt-4 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-yellow-600/30 hover:text-yellow-600 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Select Media
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-800/60 px-6 py-4 bg-slate-950">
          <div className="text-xs text-slate-500">Posts sync instantly across GNEX social streams</div>
          <button
            type="button"
            disabled={isPublishing || content.trim().length === 0}
            onClick={handlePublish}
            className="rounded-full bg-yellow-600 px-5 py-2 text-xs font-black tracking-wide text-slate-950 transition-all hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isPublishing ? 'Publishing...' : 'Publish Post'}
          </button>
        </div>

      </div>
    </div>
  )
}
