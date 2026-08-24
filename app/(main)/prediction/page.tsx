// app/(main)/prediction/page.tsx
// Honest placeholder destination for the Prediction product promotion.
// The product is not operational yet — this page says exactly that and offers
// the real destinations that DO exist today.

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'GNEX Prediction — Coming soon',
}

export default function PredictionPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-page text-center">
      <div className="gnex-card w-full max-w-md p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bg">
          <Sparkles className="h-7 w-7 text-brand" />
        </div>

        <h1 className="gnex-h1 mt-4 text-text-primary">GNEX Prediction</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          Think you can call the next move? Prediction markets are in final
          development and will land on GNEX soon.
        </p>

        <p className="mt-1 font-mono text-caption uppercase tracking-widest text-warning">
          Not live yet
        </p>

        <div className="mt-6 grid gap-2">
          <Link href="/markets" className="gnex-btn gnex-btn-primary">
            Explore markets meanwhile
          </Link>
          <Link href="/trade" className="gnex-btn gnex-btn-secondary">
            Go to Trade
          </Link>
          <Link href="/" className="gnex-btn gnex-btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
