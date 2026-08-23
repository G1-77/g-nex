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
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../providers/AuthProvider'
import { syncSessionAction } from '@/app/auth/action'
import { useTheme, type ThemePreference } from '@/components/providers/ThemeProvider'

const APPEARANCE_OPTIONS: Array<{
  value: ThemePreference
  label: string
  Icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

// For Mobile

function MobileSheet({
  open,
  onClose,
  profile,
  isStaff,
  initials,
  handleLogout,
  theme,
  onThemeChange,
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
  theme: ThemePreference
  onThemeChange: (t: ThemePreference) => void
}) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" data-avatar-sheet>
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
      />

      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-overlay backdrop-blur-xl p-5 shadow-[var(--shadow-overlay)]">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border-subtle/60" />

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden cursor-pointer rounded-full bg-surface/40 border border-border">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="profile"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-text-secondary">
                {initials}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-bold text-text-primary">
              @{profile?.username ?? 'anonymous'}
            </p>
            <p className="text-body-sm text-text-muted mt-1">
              {profile?.bio ?? 'Crypto & Gold Market Investor'}
            </p>
          </div>

          <div className="rounded-xl border border-success-border bg-success-bg px-3 py-1.5 text-right">
            <p className="text-caption font-bold uppercase text-text-muted">
              ROI
            </p>
            <p className="font-mono text-body-sm font-black text-success">
              +{profile?.monthly_roi ?? 0}%
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link
            href={`/user/${profile?.username ?? 'anonymous'}`}
            onClick={onClose}
            className="gnex-btn gnex-btn-secondary w-full justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-text-secondary" />
              View Profile
            </div>
            <ArrowUpRight className="h-4 w-4 text-text-secondary" />
          </Link>

          <Link
            href="/wallet"
            onClick={onClose}
            className="gnex-btn gnex-btn-secondary w-full justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-text-secondary" />
              View Wallet
            </div>
            <ArrowUpRight className="h-4 w-4 text-text-secondary" />
          </Link>

          {isStaff && (
            <Link
              href="/admin"
              onClick={onClose}
              className="gnex-btn w-full justify-between px-4 py-3" style={{ background: 'var(--color-brand-bg)', color: 'var(--color-brand)', borderColor: 'var(--color-brand-border)' }}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4" />
                Admin Portal
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}

          {/* Appearance: Light / Dark / System */}
          <div className="gnex-card-elevated p-3">
            <p className="text-caption font-bold uppercase tracking-[0.12em] text-text-muted">
              Appearance
            </p>
            <div role="radiogroup" aria-label="Appearance" className="mt-2 grid grid-cols-3 gap-2">
              {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => onThemeChange(value)}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-all active:scale-95 gnex-touch-target ${
                      active
                        ? 'bg-surface text-text-primary shadow-inner'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-caption font-bold">{label}</span>
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success' : 'bg-transparent'}`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="gnex-btn gnex-btn-danger w-full justify-between px-4 py-3"
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
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      const target = event.target as Element | null
      if (target?.closest?.('[data-avatar-sheet]')) return
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
    try {
      await supabase.auth.signOut()
      await syncSessionAction(null)
    } catch (err) {
      console.error("Logout sync exception:", err)
    } finally {
      window.location.href = "/login"
    }
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
    return <div className="h-8 w-8 rounded-full bg-surface/40 animate-pulse" />
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative h-8 w-8 flex items-center justify-center rounded-full cursor-pointer bg-surface/40 border border-border active:scale-95 gnex-touch-target"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            fill
            sizes="40px"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-caption font-black text-text-secondary">
            {initials}
          </span>
        )}
      </button>

      {/* Desktop Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 hidden w-56 rounded-2xl bg-surface-overlay backdrop-blur-xl md:block">
          <div className="px-4 py-3">
            <p className="text-body-sm font-bold text-text-primary truncate">
              @{profile?.username ?? 'anonymous'}
            </p>
            <p className="text-body-sm text-text-muted">
              {role ? role.replace('_', ' ') : 'GNEX Trader Account'}
            </p>
          </div>

          {/* MENU (fully restored) */}
          <div className="p-1.5 space-y-0.5">
            <Link
              href={`/user/${profile?.username ?? 'anonymous'}`}
              onClick={() => setOpen(false)}
              className="gnex-btn gnex-btn-ghost w-full justify-start px-3 py-2 text-body-sm"
            >
              <User className="h-4 w-4 text-text-secondary" />
              View Profile
            </Link>

            <Link
              href="/wallet"
              onClick={() => setOpen(false)}
              className="gnex-btn gnex-btn-ghost w-full justify-start px-3 py-2 text-body-sm"
            >
              <Wallet className="h-4 w-4 text-text-secondary" />
              View Wallet
            </Link>

            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="gnex-btn gnex-btn-ghost w-full justify-start px-3 py-2 text-body-sm" style={{ color: 'var(--color-brand)' }}
              >
                <ShieldCheck className="h-4 w-4" style={{ color: 'var(--color-brand)' }} />
                Admin Portal
              </Link>
            )}

            {/* Appearance: Light / Dark / System */}
            <div className="mt-1 px-1 pt-2">
              <p className="px-2 pb-1.5 text-caption font-bold uppercase tracking-[0.12em] text-text-muted">
                Appearance
              </p>
              <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-0.5">
                {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
                  const active = theme === value
                  return (
                    <button
                      key={value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTheme(value)}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-all active:scale-95 gnex-touch-target ${
                        active
                          ? 'bg-surface text-text-primary shadow-inner'
                          : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-caption font-bold">{label}</span>
                      <span
                        aria-hidden
                        className={`h-1 w-1 rounded-full ${active ? 'bg-success' : 'bg-transparent'}`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="gnex-btn gnex-btn-ghost w-full justify-start px-3 py-2 text-body-sm" style={{ color: 'var(--color-danger)' }}
            >
              <LogOut className="h-4 w-4" style={{ color: 'var(--color-danger)' }} />
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
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  )
}