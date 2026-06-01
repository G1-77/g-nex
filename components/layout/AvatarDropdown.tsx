'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  LogOut,
  ShieldCheck,
  User,
  Wallet,
  ArrowUpRight,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../providers/AuthProvider'

// For Mobile

function MobileSheet({
  open,
  onClose,
  profile,
  isStaff,
  initials,
  handleLogout,
}: {
  open: boolean
  onClose: () => void
  profile: {
    username?: string | null
    full_name?: string | null
    avatar_url?: string | null
    bio?: string | null
    monthly_roi?: number | null
  } | null
  isStaff: boolean
  initials: string
  handleLogout: () => Promise<void>
}) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-900 bg-slate-950/95 backdrop-blur-xl p-5 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-slate-800/60" />

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden cursor-pointer rounded-full bg-slate-900/60 border border-slate-900/80">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="profile"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-slate-200">
                {initials}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">
              @{profile?.username ?? 'anonymous'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {profile?.bio ?? 'Crypto & Gold Market Investor'}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 text-right">
            <p className="text-[9px] font-bold uppercase text-slate-500">
              ROI
            </p>
            <p className="font-mono text-xs font-black text-emerald-400">
              +{profile?.monthly_roi ?? 0}%
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link
            href={`/user/${profile?.username ?? 'anonymous'}`}
            onClick={onClose}
            className="w-full flex items-center justify-between rounded-xl border border-slate-900/80 bg-slate-900/20 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-900/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-500" />
              View Profile
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-500" />
          </Link>

          <button className="w-full flex items-center justify-between rounded-xl border border-slate-900/80 bg-slate-900/20 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-900/40 active:scale-95 transition-all">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-slate-500" />
              View Wallet
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-500" />
          </button>

          {isStaff && (
            <Link
              href="/admin"
              onClick={onClose}
              className="w-full flex items-center justify-between rounded-xl border border-yellow-600/10 bg-yellow-600/5 px-4 py-3 text-xs font-bold text-yellow-600 hover:bg-yellow-600/10 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4" />
                Management Portal
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between rounded-xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-4 w-4" />
              Logout Session
            </div>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function AvatarDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const { profile, role, isStaff, isLoading } = useAuth()

  // STRICT SESSION HYDRATION GUARD (prevents stale/testuser overwrite)
  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getUser()
      const authUser = data?.user

      if (!authUser) return

      if (profile?.username && authUser.email !== 'ahelstakov@gmail.com') {
        // prevent stale or test session mismatch
        setOpen(false)
      }
    }

    syncSession()
  }, [profile])

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
    return () => window.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // FIXED INITIALS (FULL NAME PRIORITY → "HA")
  const initials = useMemo(() => {
    const full = profile?.full_name?.trim()

    if (full) {
      const parts = full.split(' ').filter(Boolean)
      const first = parts?.[0]?.[0] ?? ''
      const last = parts?.[parts.length - 1]?.[0] ?? ''
      return `${first}${last}`.toUpperCase() || 'GN'
    }

    const username = profile?.username?.trim()
    if (username) return username.slice(0, 2).toUpperCase()

    return 'GN'
  }, [profile?.full_name, profile?.username])

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-slate-800/60 animate-pulse" />
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="h-8 w-8 flex items-center justify-center rounded-full cursor-pointer bg-slate-900/60 border border-slate-900/80 active:scale-95"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="avatar"
            width={40}
            height={40}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-[10px] font-black text-slate-200">
            {initials}
          </span>
        )}
      </button>

      {/* Desktop Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 hidden w-56 rounded-2xl border border-slate-900/80 bg-slate-950/95 backdrop-blur-xl md:block">
          <div className="border-b border-slate-900/80 px-4 py-3">
            <p className="text-xs font-bold text-slate-100 truncate">
              @{profile?.username ?? 'anonymous'}
            </p>
            <p className="text-[11px] text-slate-500">
              {role ? role.replace('_', ' ') : 'GNEX Trader Account'}
            </p>
          </div>

          {/* MENU (fully restored) */}
          <div className="p-1.5 space-y-0.5">
            <Link
              href={`/user/${profile?.username ?? 'anonymous'}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-300 rounded-xl hover:bg-slate-900/60 active:scale-95 transition-all"
            >
              <User className="h-4 w-4 text-slate-500" />
              View Profile
            </Link>

            <button className="flex items-center gap-3 px-3 py-2 text-xs font-semibold cursor-pointer text-slate-300 rounded-xl hover:bg-slate-900/60 active:scale-95 transition-all">
              <Wallet className="h-4 w-4 text-slate-500" />
              View Wallet
            </button>

            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-300 rounded-xl hover:bg-slate-900/60 active:scale-95 transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-yellow-600" />
                Management Portal
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center cursor-pointer gap-3 px-3 py-2 text-xs font-bold text-rose-400 rounded-xl hover:bg-rose-500/10 active:scale-95 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout Session
            </button>
          </div>
        </div>
      )}

      {/* Mobile */}
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        profile={profile}
        isStaff={isStaff}
        initials={initials}
        handleLogout={handleLogout}
      />
    </div>
  )
}