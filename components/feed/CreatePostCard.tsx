"use client"

import { useMemo, useState } from "react"
import { useAuth } from "../providers/AuthProvider"
import { Camera, ShieldAlert } from "lucide-react"
import Image from "next/image"
import CreatePostModal from "./CreatePostModal"

export default function CreatePostCard() {
  const [open, setOpen] = useState(false)

  const { user, profile, isLoading } = useAuth()

  const initials = useMemo(() => {
    const fullName = profile?.full_name?.trim()

    if (fullName) {
      const parts = fullName
        .split(" ")
        .filter(Boolean)

      if (parts.length >= 2) {
        return (
          `${parts[0]?.[0] ?? ""}${
            parts[parts.length - 1]?.[0] ?? ""
          }`
        ).toUpperCase()
      }

      return (
        parts[0]
          ?.slice(0, 2)
          ?.toUpperCase() ?? "GN"
      )
    }

    const username = profile?.username?.trim()

    if (username) {
      return username
        .slice(0, 2)
        .toUpperCase()
    }

    return "GN"

  }, [
    profile?.full_name,
    profile?.username
  ])

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-900/80 bg-slate-950/60 p-4 backdrop-blur-xl">
        <div className="h-12 w-full rounded-xl bg-slate-900/60" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-yellow-600/20 bg-slate-950/95 p-5 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-600/20 bg-yellow-600/5">
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Authentication Required
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Please sign in to
              broadcast trading intelligence.
            </p>
          </div>
        </div>
      </div>
    )
  }

   return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-900/80 bg-slate-950/95 p-4 backdrop-blur-xl transition-all duration-200 hover:bg-slate-900/40"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-900/80 bg-slate-900">
          {profile?.avatar_url ? (
            <Image
              src={profile?.avatar_url}
              alt={
                profile?.full_name ??
                profile?.username ??
                'Profile'
              }
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-xs font-black text-slate-200">
              {initials}
            </span>
          )}
        </div>

        <div className="flex-1 rounded-full border border-slate-900/80 bg-slate-950/40 px-4 py-2 text-left transition-colors group-hover:bg-slate-900/40">
          <span className="text-xs font-medium text-slate-500">
            Share your market, or trading
            intelligence...
          </span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-900/80 bg-slate-950/40 text-slate-500 transition-colors group-hover:border-yellow-600/20 group-hover:text-yellow-500">
          <Camera className="h-4 w-4" />
        </div>
      </button>

      <CreatePostModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )

}