'use client'

// components/home/DiscoverTransition.tsx
// Premium transition from the Home content surface into GNEX's native social
// feed (/feed). Explicit CTA + directional cue — never forced scrolling, so
// browser history and normal scroll physics stay intact.

import Link from 'next/link'
import { ChevronDown, Users } from 'lucide-react'

export default function DiscoverTransition() {
  return (
    <section aria-label="Continue to Discover" className="py-6 text-center">
      <div className="mx-auto max-w-md">
        <p className="mb-4 flex items-center justify-center gap-1.5 text-caption text-text-muted">
          <ChevronDown className="h-3.5 w-3.5 animate-bounce" aria-hidden="true" />
          More below
        </p>

        <Link
          href="/feed"
          className="group block cursor-pointer rounded-2xl bg-surface-elevated p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.99]"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-bg">
            <Users className="h-5 w-5 text-brand" />
          </div>

          <h3 className="gnex-h2 mt-3 text-text-primary">Continue to Discover</h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            See what traders are saying right now.
          </p>

          <span className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-4 py-2 text-caption font-bold text-text-inverse transition-colors group-hover:bg-brand/90">
            Open Discover
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  )
}
