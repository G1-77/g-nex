'use client'

// components/home/AutoDiscoverTransition.tsx
// Silent continuation from Home into GNEX Discover (/feed). No text, no CTA,
// no modal: an invisible sentinel at the end of the Home content detects that
// the user has reached the bottom threshold and dwelled there for ~5 seconds,
// then navigates — like a premium social app naturally continuing into the
// next content surface.
//
// Safeguards:
//   • fires at most once per armed state; a sessionStorage timestamp suppresses
//     re-arming for 30s so pressing Back immediately after the transition does
//     not bounce the user straight back to /feed (no infinite-scroll loop).
//     Navigating away and returning later re-arms normally (state resets).
//   • scrolling back up before the dwell elapses cancels the timer.
//   • hidden tabs never fire mid-dwell; the timer re-arms when visible again.
//   • prefers-reduced-motion users are never auto-navigated — Discover stays
//     one tap away in the existing navigation.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from 'framer-motion'

const DWELL_MS = 5000
const SESSION_FLAG = 'gnex-auto-discover-at'
const REARM_SUPPRESS_MS = 30_000

export default function AutoDiscoverTransition() {
  const router = useRouter()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const firedRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return
    const el = sentinelRef.current
    if (!el) return

    let suppressed = false
    try {
      const lastFiredAt = Number(window.sessionStorage.getItem(SESSION_FLAG) ?? 0)
      suppressed = Number.isFinite(lastFiredAt) && Date.now() - lastFiredAt < REARM_SUPPRESS_MS
    } catch {
      // Private-mode storage failures degrade to "always armed".
    }
    if (suppressed) return

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const fire = () => {
      clearTimer()
      if (firedRef.current || document.hidden) return
      firedRef.current = true
      try {
        window.sessionStorage.setItem(SESSION_FLAG, String(Date.now()))
      } catch {
        // Flag is best-effort; the once-per-mount guard still holds.
      }
      router.push('/feed')
    }

    const arm = () => {
      clearTimer()
      timerRef.current = window.setTimeout(fire, DWELL_MS)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) arm()
          else clearTimer()
        }
      },
      // Bottom threshold: the sentinel must cross into the lower viewport band.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.9 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      clearTimer()
    }
  }, [router, prefersReducedMotion])

  return <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
}
