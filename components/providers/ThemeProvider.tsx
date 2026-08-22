'use client'

// GNEX theme system — user preference store for Light / Dark / System.
//
// The PREFERENCE ("system") is persisted, never the resolved value, so an OS
// change while running re-resolves automatically. Class application mirrors
// the inline no-flash script in app/layout.tsx exactly: `dark` and `light`
// are mutually exclusive classes on <html>. Default palette (no class) is
// canonical GNEX Slate Dark; html.light flips the slate scale in globals.css.
//
// Both the stored preference and the live OS media query are consumed via
// useSyncExternalStore: SSR and the hydration pass render the server snapshot
// ("system"/dark), then React re-renders with the client snapshot — no
// mismatch warnings, no setState-in-effect cascades.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'gnex-theme'

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

// ---------------------------------------------------------------------------
// External stores
// ---------------------------------------------------------------------------

let storageVersion = 0

function readStoredTheme(): ThemePreference | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isThemePreference(raw) ? raw : null
  } catch {
    return null // private-mode storage failures degrade to session-only theming
  }
}

const storeListeners = new Set<() => void>()

function subscribeStores(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  storeListeners.add(onChange)
  media.addEventListener('change', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    storeListeners.delete(onChange)
    media.removeEventListener('change', onChange)
    window.removeEventListener('storage', onChange)
  }
}

function clientSnapshot(): string {
  return readStoredTheme() ?? 'system'
}

function writeStoredTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore: session-only theming.
  }
  storageVersion += 1
  for (const notify of storeListeners) notify()
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server snapshot "system" keeps hydration deterministic; after mount React
  // adopts the real client snapshot (stored preference) without a mismatch.
  const rawTheme = useSyncExternalStore(subscribeStores, clientSnapshot, () => 'system')
  const theme: ThemePreference = isThemePreference(rawTheme) ? rawTheme : 'system'

  const osDark = useSyncExternalStore(
    subscribeStores,
    () => window.matchMedia(DARK_QUERY).matches,
    () => true
  )

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (osDark ? 'dark' : 'light') : theme

  // DOM side-effect only — no state writes here.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.classList.toggle('light', resolvedTheme === 'light')
  }, [resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => {
    writeStoredTheme(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
