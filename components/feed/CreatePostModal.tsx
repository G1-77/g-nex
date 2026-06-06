'use client'

import Image from 'next/image'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, X, Paperclip } from 'lucide-react'
import { AssetSymbol, SignalType } from '@/lib/supabase/types'
import { useCreatePostMutation } from '@/lib/react-query/mutations/feed.mutations'

import { useAuth } from '../providers/AuthProvider'

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
} 

const SIGNAL_OPTIONS = [
  {label: "Bullish", value: "Bullish"},
  {label: "Bearish", value: "Bearish"},
  {label: "Accumulation", value: "Accumulation"},
  {label: "Scalp", value: "Scalp"},
  {label: "Long-Term", value: "Long-Term"},
] satisfies {
  label: string
  value: SignalType
}[]


const ASSET_OPTIONS: AssetSymbol[] = ["BTC", "ETH", "SOL", "XRP", "USDT", "XAU"]
const MAX_CHARACTERS = 700

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { profile, isLoading } = useAuth()

  const [content, setContent] = useState('')
  const [selectedSignal, setSelectedSignal] = useState<SignalType | null>(null)

  const [selectedAssets, setSelectedAssets] = useState<AssetSymbol[]>([])
  const [assetInput, setAssetInput] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  
  // // Real database states for the authenticated session user
  // const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  // const [loadingProfile, setLoadingProfile] = useState(true)

  const createPostMutation = useCreatePostMutation()
  const isPublishing = createPostMutation.isPending
  const remainingCharacters = MAX_CHARACTERS - content.length

  // FETCH TRUE AUTHENTICATED USER DETAILS ON MOUNT
  const initials = useMemo(() => {
    const fullName = profile?.full_name?.trim()

    if (fullName) {
      const parts = fullName.split(" ").filter(Boolean)

      if (parts.length >= 2) {
        return (
          `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
        ).toUpperCase()
      }

      return parts[0]?.slice(0, 2)?.toUpperCase() ?? "GN"
    }

    const username = profile?.username?.trim()
    if (username) {
      return username.slice(0, 2).toUpperCase()
    }

    return "GN"

  }, [profile?.full_name, profile?.username])

  // Multi-asset string filtering

  const filteredAssets = useMemo(() => {
    return ASSET_OPTIONS.filter(
      (asset) =>
        asset.toLowerCase().includes(assetInput.toLowerCase()) &&
        !selectedAssets.includes(asset)
    )
  }, [assetInput, selectedAssets])

  if (!open) return null

  const handleAddAsset = (asset: AssetSymbol) => {
    setSelectedAssets((prev) => [...prev, asset])
    setAssetInput('')
  }

  const handleRemoveAsset = (asset: AssetSymbol) => {
    setSelectedAssets((prev) => prev.filter((item) => item !== asset))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setMediaFile(file)
  }

  const handlePublish = async () => {
    if (!content.trim() || !profile) return

    try {
      await createPostMutation.mutateAsync({
        content,
        signalType: selectedSignal,
        assetSymbols: selectedAssets,
        mediaFile,
        currentUser: {
          id: profile.id, // Pass real active profile entries
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified,
          monthly_roi: profile.monthly_roi,
        },
      })

      setContent('')
      setSelectedAssets([])
      setSelectedSignal(null)
      setMediaFile(null)
      setAssetInput('')

      onClose()
    } catch (error) {
      console.error('Create post failed:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800/60 bg-slate-950 shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 px-5 py-4 shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            {/*  3. Defensive parent Frame With Reusable Ibitials Overlay No Unconfigured Strings */}
              <div className="relative flex h-10.5 w-10.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-900/80 bg-slate-900">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name ?? profile.username ?? 'Profile'}
                    fill
                    sizes="42px"
                    className="rounded-full object-cover"
                    priority
                  />
                ) : (
                  <span className="text-xs font-black text-slate-200 font-mono select-none">
                    {initials}
                  </span>
                )}
              </div>

             {/*  1. HYDRATED AUTHOR LABELS CONTEXT ASSETS */}
              <div>
                <p className="text-sm font-bold text-white">
                  {isLoading ? 'Synchronizing matrix...' : `@${profile?.username ?? 'anonymous'}`}
                </p>
                <p className="text-[11px] text-slate-500">Publishing your feed</p>
              </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 transition hover:border-slate-700 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Container */}
        <div className="space-y-6 p-5 overflow-y-auto no-scrollbar flex-1 bg-slate-950">
          
          {/* CONTENT TEXTAREA */}
          <div className="space-y-2">
            <textarea
              maxLength={MAX_CHARACTERS}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your market intelligence..."
              className="min-h-35 w-full resize-none rounded-2xl border border-slate-800/40 bg-slate-900/30 px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-yellow-600/40 focus:ring-1 focus:ring-yellow-600/20"
            />
            <div className="flex justify-end">
              <span className={`text-[11px] font-mono ${remainingCharacters <= 50 ? 'text-yellow-600' : 'text-slate-500'}`}>
                {remainingCharacters}/{MAX_CHARACTERS}
              </span>
            </div>
          </div>

          {/* SIGNALS SELECTOR */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Signal Type</p>
            <div className="flex flex-wrap gap-2">
              {SIGNAL_OPTIONS.map((signal) => {
                const active = selectedSignal === signal.value
                return (
                  <button
                    key={signal.value}
                    type="button"
                    onClick={() => setSelectedSignal(signal.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? signal.value === 'Bullish'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : signal.value === 'Bearish'
                          ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                          : 'border-yellow-600/30 bg-yellow-600/10 text-yellow-600'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {signal.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ASSET TAGGING INPUT */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Asset Tags</p>
            <input
              type="text"
              value={assetInput}
              onChange={(e) => setAssetInput(e.target.value)}
              placeholder="Search BTC, SOL, XAU..."
              className="w-full rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-yellow-600/40"
            />

            {assetInput.length > 0 && filteredAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5 border border-slate-900 bg-slate-900/10 p-2 rounded-xl">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => handleAddAsset(asset)}
                    className="rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-yellow-600/40 hover:text-yellow-600 cursor-pointer"
                  >
                    +{asset}
                  </button>
                ))}
              </div>
            )}

            {selectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedAssets.map((asset) => (
                  <div
                    key={asset}
                    className="flex items-center gap-1 rounded-full border border-yellow-600/20 bg-yellow-600/10 px-3 py-1 text-xs font-semibold text-yellow-600"
                  >
                    <span>#{asset}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(asset)}
                      className="ml-1 text-yellow-600/60 hover:text-yellow-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ATTACH MEDIA DROPZONE */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attach Media</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {mediaFile ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Paperclip className="h-4 w-4 text-yellow-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-300 truncate">{mediaFile.name}</span>
                  <span className="text-[10px] font-mono text-slate-600 shrink-0">({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaFile(null)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex min-h-27.5 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 hover:border-yellow-600/20 bg-slate-900/10 hover:bg-slate-900/20 p-4 text-center transition-all duration-200 group cursor-pointer"
              >
                <ImagePlus className="h-5 w-5 text-slate-500 group-hover:text-yellow-600 transition-colors mb-2" />
                <p className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">Click to attach charts or transaction screenshots</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Supports PNG, JPG up to 10MB</p>
              </button>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end border-t border-slate-900 px-5 py-4 bg-slate-950 shrink-0">
          <button
            type="button"
            disabled={isPublishing || !content.trim() || isLoading || !profile}
            onClick={handlePublish}
            className="flex min-w-35 items-center justify-center gap-2 rounded-full bg-yellow-600 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Post'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
