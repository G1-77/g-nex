'use client'

import { useSyncExternalStore } from 'react'
import type { AssetSymbol } from '@/lib/supabase/types'

const DEFAULT_ASSET: AssetSymbol = 'BTC'

let focusedAsset: AssetSymbol = DEFAULT_ASSET
const listeners = new Set<() => void>()

function getSnapshot(): AssetSymbol {
  return focusedAsset
}

function getServerSnapshot(): AssetSymbol {
  return DEFAULT_ASSET
}

export function setFocusedAsset(symbol: AssetSymbol) {
  if (symbol === focusedAsset) return
  focusedAsset = symbol
  listeners.forEach((listener) => listener())
}

export function useFocusedAsset(): AssetSymbol {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot,
    getServerSnapshot
  )
}
