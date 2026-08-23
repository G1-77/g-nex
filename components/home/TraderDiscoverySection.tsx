// components/home/TraderDiscoverySection.tsx
// Compact horizontal trader-discovery after Create Post (brief §13).
// Deterministic: top ROI traders excluding self + followed, with Follow button.

'use client'

import Image from 'next/image'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToggleFollowMutation } from '@/lib/react-query/mutations/follow.mutations'
import { useTraderSuggestions } from '@/lib/react-query/home.queries'
import { ShieldCheck } from 'lucide-react'

interface TraderCardProps {
    trader: {
        id: string
        username: string
        avatar_url: string | null
        is_verified: boolean
        monthly_roi: number
        realized_kes: number | null
    }
}

function TraderCard({ trader }: TraderCardProps) {
    const { profile } = useAuth()
    const { mutate: toggleFollow, isPending } = useToggleFollowMutation()
    const isFollowing = false // simplified; could add following state hook if needed

    const handleFollow = () => {
        if (!profile) return
        toggleFollow({ followerId: profile.id, followingId: trader.id })
    }

    const roiPct = (trader.monthly_roi * 100).toFixed(1)

    return (
        <div className="shrink-0 w-[220px] gnex-card p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
                <div className="relative flex h-10 w-10 shrink-0 rounded-full overflow-hidden border border-border">
                    {trader.avatar_url ? (
                        <Image src={trader.avatar_url} alt={trader.username} fill sizes="40px" className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-surface text-xs font-black text-text-secondary">
                            {trader.username.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                    {trader.is_verified && (
                        <ShieldCheck className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-brand" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{trader.username}</p>
                    <p className="text-xs text-text-muted truncate">ROI: <span className="font-mono font-bold text-success">{roiPct}%</span></p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <button
                    type="button"
                    onClick={handleFollow}
                    disabled={isPending || !profile}
                    className={`flex-1 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors gnex-touch-target ${
                        isFollowing
                            ? 'border border-border bg-surface text-text-secondary'
                            : 'bg-brand text-background hover:bg-brand/90'
                    }`}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            </div>
        </div>
    )
}

export default function TraderDiscoverySection() {
    const suggestions = useTraderSuggestions(5)

    if (!suggestions || suggestions.length === 0) {
        return (
            <div className="gnex-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-text-primary">Traders to follow</h2>
                </div>
                <p className="text-text-muted text-sm">No trader suggestions yet.</p>
            </div>
        )
    }

    return (
        <section aria-label="Trader discovery" className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Traders to follow</h2>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-page px-page">
                {suggestions.map(t => (
                    <TraderCard key={t.id} trader={t} />
                ))}
            </div>
        </section>
    )
}