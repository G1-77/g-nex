'use client'

// components/home/PromotionCarousel.tsx
// Reusable GNEX promotional carousel — presentation layer only.
// Content always arrives as Promotion[] (admin-managed); this component knows
// nothing about specific products. Behavior contract:
//   • 0 promotions  → renders nothing (Home flows on)
//   • 1 promotion   → static card, no controls
//   • multiple      → local 5s autoplay rotation, swipe + dots, pause on
//                     touch/hover/focus, reduced-motion aware

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'

import { resolvePromotionRoute } from '@/lib/react-query/promotions.queries'
import type { PromotionPayload } from '@/lib/react-query/promotions.queries'

export const PROMOTION_ROTATION_MS = 5000

interface PromotionCarouselProps {
  promotions: PromotionPayload[]
  /** Autoplay interval in ms (default 5s). */
  rotationMs?: number
}

function PromotionCard({ promotion }: { promotion: PromotionPayload }) {
  const route = resolvePromotionRoute(promotion)
  const isExternal = promotion.destinationType === 'url' && Boolean(promotion.destinationUrl)

  const interactive = isExternal || Boolean(route)

  const body = (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-surface-elevated p-4 shadow-[var(--shadow-card)]">
      {/* Tonal brand wash — tonal hierarchy instead of border outlines */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/15 via-transparent to-transparent" />

      {promotion.imageUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <Image src={promotion.imageUrl} alt="" fill sizes="64px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-bg">
          {promotion.iconUrl ? (
            <Image src={promotion.iconUrl} alt="" width={24} height={24} className="h-6 w-6" />
          ) : (
            <Sparkles className="h-5 w-5 text-brand" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-text-primary">{promotion.title}</h3>
        {promotion.description && (
          <p className="mt-0.5 line-clamp-2 text-body-sm text-text-secondary">{promotion.description}</p>
        )}

        {/* CTA — navigable when a destination resolves; honest static state otherwise */}
        {isExternal && promotion.destinationUrl ? (
          <a
            href={promotion.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-caption font-bold text-text-inverse transition-colors hover:bg-brand/90 active:scale-[0.98]"
          >
            {promotion.ctaText}
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        ) : route ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-caption font-bold text-text-inverse transition-colors group-hover:bg-brand/90 group-active:scale-[0.98]">
            {promotion.ctaText}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-caption font-bold text-text-muted">
            {promotion.ctaText} · Coming soon
          </span>
        )}
      </div>
    </div>
  )

  if (!interactive) return body
  return (
    <Link
      href={isExternal ? promotion.destinationUrl ?? '#' : route ?? '#'}
      className="block cursor-pointer"
      aria-label={promotion.title}
    >
      {body}
    </Link>
  )
}

export default function PromotionCarousel({ promotions, rotationMs = PROMOTION_ROTATION_MS }: PromotionCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const count = promotions.length
  const multiple = count > 1

  // Derived clamp: keeps rendering correct even if the collection shrinks,
  // without a state-reset effect.
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1)

  // Local rotation only — the collection is fetched once upstream; no network
  // traffic happens between slides.
  useEffect(() => {
    if (!multiple || paused || prefersReducedMotion) return
    const timer = setInterval(() => {
      setIndex((safeIndex + 1) % count)
    }, rotationMs)
    return () => clearInterval(timer)
  }, [multiple, paused, rotationMs, count, safeIndex, prefersReducedMotion])

  const go = useCallback(
    (delta: number) => {
      if (!multiple) return
      setIndex((safeIndex + delta + count) % count)
    },
    [multiple, count, safeIndex]
  )

  if (count === 0) return null

  const current = promotions[safeIndex]

  return (
    <section aria-label="Featured from GNEX" className="space-y-2">
      <div
        role="group"
        aria-roledescription="carousel"
        tabIndex={multiple ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1)
          if (e.key === 'ArrowRight') go(1)
        }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchMove={(e) => {
          if (touchStartX.current === null) {
            touchStartX.current = e.touches[0].clientX
            return
          }
          const deltaX = e.touches[0].clientX - touchStartX.current
          if (Math.abs(deltaX) > 48) {
            go(deltaX > 0 ? -1 : 1)
            touchStartX.current = e.touches[0].clientX
          }
        }}
        onTouchCancel={() => {
          touchStartX.current = null
          setPaused(false)
        }}
        className="block"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <PromotionCard promotion={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {multiple && (
        <div className="flex justify-center gap-1.5 pt-1" role="tablist" aria-label="Promotions">
          {promotions.map((promo, i) => (
            <button
              key={promo.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Show promotion ${i + 1}: ${promo.title}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-200 ${
                i === safeIndex ? 'w-5 bg-brand' : 'w-1.5 bg-surface-active hover:bg-border-strong'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
