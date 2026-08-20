import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, BadgeCheck } from 'lucide-react'

import ActivitiesView from '@/components/profile/ActivitiesView'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ActivitiesPageProps {
  params: Promise<{
    username: string
  }>
}

export default async function ActivitiesPage({ params }: ActivitiesPageProps) {
  const { username } = await params

  const supabase = await createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 antialiased">
      <div className="mx-auto max-w-5xl px-4 py-4">
        {/* BACK NAV */}
        <Link
          href={`/user/${username}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to @{username}
        </Link>

        {/* ACTIVITY HEADER */}
        <section className="mt-4 rounded-2xl border border-slate-900 bg-slate-900/30 p-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  fill
                  sizes="56px"
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="font-mono text-sm font-black text-slate-400">
                  {profile.username?.replace('@', '').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-black tracking-tight text-white">
                  @{profile.username}
                </h1>
                {profile.is_verified && (
                  <BadgeCheck className="h-5 w-5 shrink-0 fill-yellow-600 stroke-slate-950 text-slate-950" />
                )}
              </div>

              <span className="mt-0.5 font-mono text-[11px] font-black text-emerald-400">
                +{profile.monthly_roi ?? 0}% ROI
              </span>
            </div>
          </div>
        </section>

        {/* ACTIVITIES */}
        <div className="mt-6">
          <ActivitiesView userId={profile.id} username={profile.username} />
        </div>
      </div>
    </div>
  )
}