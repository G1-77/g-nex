'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LogOut,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../providers/AuthProvider'

export default function AvatarDropdown() {
  const [open, setOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const {
    profile,
    role,
    isStaff,
    isLoading,
  } = useAuth()

  // CLOSE OUTSIDE
  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutside)

    return () => {
      window.removeEventListener('mousedown', handleOutside)
    }
  }, [])

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Initials fallback to our platform initials
  const initials = useMemo(() => {
    if (!profile?.username) return 'GN'

    return profile?.username
      .slice(0, 2)
      .toUpperCase()
  }, [profile?.username])

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-800" />
    )
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      {/* AVATAR TRIGGER */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-yellow-600/40 transition-all hover:ring-yellow-600 cursor-pointer bg-slate-900"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username ?? 'Profile'}
            width={40}
            height={40}
            style={{
              width: '100%',
              height: '100%',
            }}
            className="object-cover"
          />
        ) : (
          <span className="text-[10px] font-black tracking-wide text-slate-200">
            {initials}
          </span>
        )}
      </button>

      {/* DESKTOP DROPDOWN */}
      {open && (
        <>
          <div className="hidden md:block absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black/40">
            
            {/* HEADER */}
            <div className="border-b border-slate-800/50 px-4 py-3">
              <p className="truncate text-sm font-bold text-slate-100">
                @{profile?.username ?? 'anonymous'}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {role
                  ? `${role.replace('_', ' ')} account`
                  : 'GNEX Trader Account'}
              </p>
            </div>

            {/* MENU */}
            <div className="p-1.5 space-y-0.5">
              
              <Link
                href={`/user/${profile?.username ?? 'anonymous'}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white"
              >
                <User className="h-4 w-4 text-slate-500" />
                View Profile
              </Link>

              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white"
              >
                <Wallet className="h-4 w-4 text-slate-500" />
                Wallet
              </button>

              {isStaff && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4 text-yellow-600" />
                  Management Portal
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          {/* MOBILE BOTTOM SHEET */}
          <div className="fixed inset-0 z-50 md:hidden flex items-end">
            
            {/* OVERLAY */}
            <button
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs w-full h-full border-none outline-none"
            />

            {/* SHEET */}
            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-900 bg-slate-950/95 backdrop-blur-xl p-5 shadow-2xl shadow-black/50">
              
              {/* HANDLE */}
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-800" />

              {/* PROFILE META */}
              <div className="flex items-center gap-3">
                
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-yellow-600/20">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username ?? 'Profile'}
                      width={44}
                      height={44}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-black tracking-wide text-slate-200">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    @{profile?.username ?? 'anonymous'}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {profile?.bio ??
                      'Crypto & Gold Market Participant'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Monthly ROI
                  </p>

                  <p className="mt-0.5 font-mono text-sm font-black text-emerald-400">
                    +{profile?.monthly_roi ?? 0}%
                  </p>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-6 space-y-2">
                
                <Link
                  href={`/user/${profile?.username ?? 'anonymous'}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800/50 bg-slate-900/40 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-900"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  View Full Portfolio
                </Link>

                <button
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-800/50 bg-slate-900/40 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-900"
                >
                  <Wallet className="h-4 w-4 text-slate-500" />
                  Wallet
                </button>

                {isStaff && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-yellow-600/10 bg-yellow-600/5 px-4 py-3 text-sm font-medium text-yellow-600 transition-colors hover:bg-yellow-600/10"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Access Management Portal
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}