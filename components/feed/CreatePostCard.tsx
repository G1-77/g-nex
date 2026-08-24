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
      <div className="animate-pulse rounded-2xl bg-surface p-4">
        <div className="h-12 w-full rounded-xl bg-surface/40" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="gnex-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-bg">
            <ShieldAlert className="h-4 w-4 text-brand" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">Authentication Required</h3>
            <p className="mt-1 text-body-sm text-text-muted">Please sign in to broadcast trading intelligence.</p>
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
        className="group flex w-full items-center gap-3 rounded-2xl cursor-pointer bg-surface p-4 transition-all duration-200 hover:bg-surface-hover"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
          {profile?.avatar_url ? (
            <Image
              src={profile?.avatar_url}
              alt={
                profile?.full_name ??
                profile?.username ??
                'Profile'
              }
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <span className="text-xs font-black text-text-secondary">{initials}</span>
          )}
        </div>

        <div className="flex-1 rounded-full border border-border bg-surface/40 px-4 py-2 text-left transition-colors group-hover:bg-surface/60">
          <span className="text-body-sm font-medium text-text-muted">Share your trading intelligence...</span>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/40 text-text-muted transition-colors group-hover:border-brand/20 group-hover:text-brand">
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