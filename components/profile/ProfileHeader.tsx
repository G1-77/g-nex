'use client'

import { useState } from 'react'
import { BadgeCheck, Pencil } from 'lucide-react'
import Image from 'next/image'
import EditProfileModal from './EditProfileModal'
import { useUserIdentity } from '@/lib/hooks/useUserIdentity'
import { useAuth } from '@/components/providers/AuthProvider'
import type { AdminRoleType } from '@/lib/supabase/types'

interface ProfileHeaderProps {
  username: string
  avatarUrl?: string | null
  bio?: string | null
  isVerified?: boolean
  monthlyRoi?: number
  realizedPnlKes?: number
  isOwnProfile?: boolean
  role?: AdminRoleType | null
  reputationStatus?: string | null
  reputationScore?: number | null
}

export default function ProfileHeader({
  username,
  avatarUrl,
  bio,
  isVerified,
  monthlyRoi,
  realizedPnlKes,
  isOwnProfile = true,
  reputationStatus,
  reputationScore,
}: ProfileHeaderProps) {
  const [openEditModal, setOpenEditModal] = useState(false)
  const { profile } = useUserIdentity()
  const { reputation } = useAuth()

  const roiUnavailable = monthlyRoi === null || monthlyRoi === undefined
  const roiValue = Number(monthlyRoi ?? 0)
  const isLoss = roiValue < 0
  const roiDisplay = roiUnavailable ? '—' : `${roiValue > 0 ? '+' : ''}${roiValue.toFixed(2)}%`
  const roiColor = roiUnavailable
    ? 'text-text-muted'
    : isLoss
      ? 'text-danger'
      : 'text-success'

  return (
    <>
      <div className="relative px-page pt-16 md:pt-4">
        
        {/* FLOATING AVATAR */}
        <div className="absolute -top-12 left-4 md:left-6 overflow-hidden rounded-full ring-4 ring-background bg-surface shadow-xl">
          <Image
            src={
              avatarUrl ??
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop'
            }
            alt={username}
            width={100}
            height={100}
            priority
            style={{ width: '100px', height: '100px' }}
            className="object-cover"
          />
        </div>

        {/* PROFILE ROW */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mt-6 gap-5">
          
          {/* USER INFO */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-h1 font-black tracking-tight text-text-primary truncate mt-2">
                @{username}
              </h1>

              {isVerified && (
                <BadgeCheck className="h-5 w-5 fill-brand stroke-background shrink-0" aria-label="Verified trader" />
              )}
            </div>

            <p className="max-w-md text-body text-text-secondary leading-relaxed">
              {bio || 'No bio added yet.'}
            </p>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-3">
            
            {/* ROI CARD */}
            <div className="gnex-card-elevated p-4 cursor-pointer">
              <p className="text-caption font-bold uppercase tracking-wider text-text-muted">
                Monthly ROI
              </p>

              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className={`text-mono-lg font-mono font-black ${roiColor}`}>
                  {roiDisplay}
                </span>

                <span className="text-caption text-text-muted font-medium">
                  30d
                </span>
              </div>

              {typeof realizedPnlKes === 'number' && (
                <p className="mt-0.5 font-mono text-caption text-text-muted">
                  {realizedPnlKes >= 0 ? '+' : ''}
                  {realizedPnlKes.toLocaleString(undefined, { maximumFractionDigits: 2 })} KES realized
                </p>
              )}
            </div>

            {/* EDIT BUTTON */}
            {isOwnProfile && (
              <button
                onClick={() => setOpenEditModal(true)}
                className="gnex-btn gnex-btn-secondary px-4 py-2 text-body-sm"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOUNT */}
      <EditProfileModal
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        currentProfile={profile}
        onUpdateSuccess={() => location.reload()}
      />
    </>
  )
}