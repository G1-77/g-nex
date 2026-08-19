'use client'

import { useState } from 'react'
import type { FeedPost } from '@/lib/supabase/types'

interface EditPostModalProps {
  post: FeedPost
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (content: string) => void
}

export function EditPostModal({ post, isOpen, isSaving, onClose, onSave }: EditPostModalProps) {
  const [content, setContent] = useState(post.content)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
            Edit Post
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Update your trading signal..."
          className="mt-4 w-full resize-none rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-yellow-600/50 focus:outline-none"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-slate-600">
            {content.length}/500
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 transition hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => content.trim() && onSave(content.trim())}
              disabled={isSaving || !content.trim()}
              className="rounded-xl bg-yellow-600 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-yellow-500 disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}