import { notFound } from 'next/navigation'

import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfilePosts from '@/components/profile/ProfilePosts'
import { createServerClient } from '@/lib/supabase/server'
import type { AdminRoleType } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function ProfilePage({
  params
}: ProfilePageProps) {
  const { username } = await params

  const supabase = await createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: roleRow } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', profile.id)
    .maybeSingle()

  const isOwnProfile = user?.id === profile.id

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 antialiased">
      <div className="mx-auto max-w-5xl px-4 py-4">

        {/* COVER BANNER */}
        <div className="relative h-44 overflow-hidden rounded-2xl border border-slate-900 bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 shadow-inner sm:h-52">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(202,138,4,0.08),transparent_40%)]" />
        </div>

        {/* PROFILE SECTION */}
        <section className="relative px-2 pt-16 sm:px-4 md:pt-4">

          <ProfileHeader
            username={profile.username}
            avatarUrl={profile.avatar_url}
            bio={profile.bio}
            isVerified={profile.is_verified}
            monthlyRoi={profile.monthly_roi ?? 0}
            isOwnProfile={isOwnProfile}
            role={(roleRow?.role as AdminRoleType) ?? null}
          />

          {/* PROFILE NAVIGATION */}
          <div className="mt-8 flex items-center gap-6 border-b border-slate-900">
            <button className="relative cursor-pointer pb-3 text-xs font-bold uppercase tracking-wider text-yellow-600">
              Posts

              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-yellow-600" />
            </button>

            <button className="cursor-pointer pb-3 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">
              Portfolio Weighting
            </button>
          </div>

          {/* POSTS */}
          <div className="mt-6">
            <ProfilePosts userId={profile.id} />
          </div>
        </section>
      </div>
    </div>
  )
}