"use client"

import { useState } from 'react'
import { Camera } from 'lucide-react'
import Image from 'next/image'
import CreatePostModal from './CreatePostModal'

export default function CreatePostCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-md hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-200 cursor-pointer"
      >
        {/* Next.js Standard Compliant Image */}
        <Image
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop"
          alt="User avatar"
          width={36}
          height={36}
          style={{ width: 'auto', height: 'auto' }}
          className="rounded-full object-cover ring-1 ring-slate-800"
        />

        {/* Input Placeholder Field */}
        <div className="flex-1 text-left px-4 py-2 rounded-full border border-slate-900 bg-slate-950/40 group-hover:border-slate-800 transition-colors">
          <span className="text-xs font-medium text-slate-500">Share your thougts.. today!</span>
        </div>

        {/* Camera Indicator Icon */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-900 bg-slate-950/40 group-hover:border-yellow-600/30 group-hover:text-yellow-600 text-slate-500 transition-colors">
          <Camera className="h-3.5 w-3.5" />
        </div>
      </button>

      <CreatePostModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
