// components/home/HomeComposer.tsx
// Composer prompt at top of Home — "What's happening in the market?"
// Reuses existing CreatePostModal for the actual authoring flow.

'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import Image from 'next/image'

import CreatePostModal from '@/components/feed/CreatePostModal'
import { useAuth } from '@/components/providers/AuthProvider'

export default function HomeComposer() {
    const [open, setOpen] = useState(false)
    const { user, profile, isLoading } = useAuth()

    const initials = profile?.full_name
        ?.split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ?? profile?.username?.slice(0, 2).toUpperCase() ?? 'GN'

    if (isLoading) {
        return (
            <div className="animate-pulse gnex-card p-5">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-surface/40" />
                    <div className="flex-1">
                        <div className="h-4 w-3/4 rounded bg-surface/40" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-surface/40" />
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="gnex-card p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-bg">
                        <Camera className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Sign in to post</h3>
                        <p className="mt-1 text-body-sm text-text-muted">Share your trading intelligence with the community.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group flex w-full items-center gap-3 rounded-2xl cursor-pointer border border-border bg-surface p-4 transition-all duration-200 hover:bg-surface-hover"
            >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
                    {profile?.avatar_url ? (
                        <Image
                            src={profile.avatar_url}
                            alt={profile.full_name ?? profile.username ?? 'Profile'}
                            fill
                            sizes="40px"
                            className="object-cover"
                        />
                    ) : (
                        <span className="text-xs font-black text-text-secondary">{initials}</span>
                    )}
                </div>

                <div className="flex-1 rounded-full border border-border bg-surface/40 px-4 py-2 text-left transition-colors group-hover:bg-surface/60">
                    <span className="text-body font-medium text-text-muted">What&apos;s happening in the market?</span>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/40 text-text-muted transition-colors group-hover:border-brand/20 group-hover:text-brand">
                    <Camera className="h-4 w-4" />
                </div>
            </button>

            <CreatePostModal open={open} onClose={() => setOpen(false)} />
        </>
    )
}