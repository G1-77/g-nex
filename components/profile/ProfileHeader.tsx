'use client'

import { useState } from 'react'
import { BadgeCheck, Pencil } from 'lucide-react'
import Image from 'next/image'
import EditProfileModal from './EditProfileModal'
import { useUserIdentity } from '@/lib/hooks/useUserIdentity'

interface ProfileHeaderProps {
  username: string
  avatarUrl?: string | null
  bio?: string | null
  isVerified?: boolean
  monthlyRoi?: number
  isOwnProfile?: boolean
}

export default function ProfileHeader({
  username,
  avatarUrl,
  bio,
  isVerified,
  monthlyRoi,
  isOwnProfile = true
}: ProfileHeaderProps) {
  const [openEditModal, setOpenEditModal] = useState(false)
  const { profile } = useUserIdentity()

  return (
    <>
      <div className="relative px-2 sm:px-4 pt-16 md:pt-4">
        
        {/* FLOATING AVATAR */}
        <div className="absolute -top-12 left-4 md:left-6 overflow-hidden rounded-full ring-4 ring-slate-950 bg-slate-900 shadow-xl">
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
            className="object-cover "
          />
        </div>

        {/* PROFILE ROW */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mt-6 gap-5">
          
          {/* USER INFO */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                @{username}
              </h1>

              {isVerified && (
                <BadgeCheck className="h-5 w-5 fill-yellow-600 stroke-slate-950 shrink-0" />
              )}
            </div>

            <p className="max-w-md text-sm text-slate-400 leading-relaxed">
              {bio || 'No bio added yet.'}
            </p>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-3">
            
            {/* ROI CARD */}
            <div className="rounded-xl cursor-pointer border border-emerald-500/10 bg-emerald-500/5 px-4 py-2.5 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Monthly ROI
              </p>

              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-emerald-400">
                  +{monthlyRoi ?? 0}%
                </span>

                <span className="text-[10px] text-slate-600 font-medium">
                  30d
                </span>
              </div>
            </div>

            {/* EDIT BUTTON */}
            {isOwnProfile && (
              <button
                onClick={() => setOpenEditModal(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-yellow-600/30 hover:text-yellow-600 cursor-pointer"
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