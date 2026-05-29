import ProfileHeader from '@/components/profile/ProfileHeader'
// import { BadgeCheck } from 'lucide-react'
// import Image from 'next/image'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function ProfilePage({
  params
}: ProfilePageProps) {
  const { username } = await params

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
            username={username}
            avatarUrl={null}
            bio="Crypto & Gold Investor"
            isVerified
            monthlyRoi={42.6}
            isOwnProfile
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

          {/* CONTENT HOLDER */}
          <div className="mt-6 rounded-2xl border border-slate-800/40 bg-slate-900/40 p-8 backdrop-blur-sm">
            <div className="mx-auto max-w-sm text-center">
              <h2 className="text-sm font-semibold text-slate-200">
                Trader Activity Stream
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                User posts, historical chart configurations, and
                copy trading analytical nodes will render here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}