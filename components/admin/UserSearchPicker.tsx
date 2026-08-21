"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"

import { useAdminQuery } from "@/components/admin/useAdminQuery"

export interface PickedUser {
  id: string
  username: string
  full_name: string | null
}

interface SearchResults {
  users: Array<{ id: string; username: string; full_name: string | null; avatar_url: string | null }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Debounced profile search (username + full name) with click-to-select.
 * A pasted raw UUID is also offered as a selectable entry so ID-based
 * workflows keep working.
 */
export function UserSearchPicker({
  value,
  onChange,
}: {
  value: PickedUser | null
  onChange: (user: PickedUser | null) => void
}) {
  const [term, setTerm] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300)
    return () => clearTimeout(t)
  }, [term])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const enabled = !value && debounced.length >= 2
  const { data, isFetching } = useAdminQuery<SearchResults>(
    `/api/admin/users?q=${encodeURIComponent(debounced)}&limit=8`,
    { enabled }
  )

  if (value) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 md:max-w-xs">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-100">@{value.username}</p>
          {value.full_name && (
            <p className="truncate text-[10px] text-[var(--admin-text-dim)]">{value.full_name}</p>
          )}
        </div>
        <button
          aria-label="Clear selection"
          onClick={() => {
            onChange(null)
            setTerm("")
          }}
          className="rounded p-1 text-[var(--admin-text-dim)] hover:bg-white/10 hover:text-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const results = data?.users ?? []
  const showRawId = UUID_RE.test(debounced) && !results.some((u) => u.id === debounced)

  return (
    <div ref={boxRef} className="relative w-full md:max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--admin-text-dim)]" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or @username…"
          className="admin-input w-full pl-8 font-normal"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--admin-text-dim)]" />
        )}
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel-elevated)] shadow-xl">
          {showRawId && (
            <button
              onClick={() => pick({ id: debounced, username: debounced.slice(0, 8), full_name: "Raw user ID" })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5"
            >
              <span className="font-mono text-[10px] break-all text-[var(--admin-text-dim)]">{debounced}</span>
              <span className="ml-auto shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--admin-text-dim)]">
                raw id
              </span>
            </button>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => pick({ id: u.id, username: u.username, full_name: u.full_name })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-slate-200">
                {(u.full_name ?? u.username).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-100">@{u.username}</span>
                {u.full_name && (
                  <span className="block truncate text-[10px] text-[var(--admin-text-dim)]">{u.full_name}</span>
                )}
              </span>
            </button>
          ))}
          {!isFetching && results.length === 0 && !showRawId && (
            <p className="px-3 py-3 text-center text-[11px] text-[var(--admin-text-dim)]">
              No users match “{debounced}”
            </p>
          )}
        </div>
      )}
    </div>
  )

  function pick(u: PickedUser) {
    onChange(u)
    setOpen(false)
    setTerm("")
  }
}
