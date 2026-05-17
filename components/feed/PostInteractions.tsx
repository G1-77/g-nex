// components/feed/PostInteractions.tsx
'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Share2,
  ThumbsUp
} from 'lucide-react'

interface PostInteractionsProps {
  initialLikes?: number
  initialComments?: number
  initialShares?: number
}

export default function PostInteractions({
  initialLikes = 0,
  initialComments = 0,
  initialShares = 0
}: PostInteractionsProps) {
  const [liked, setLiked] = useState<boolean>(false)
  const [likes, setLikes] = useState<number>(initialLikes)

  const handleLike = () => {
    if (liked) {
      setLikes((prev) => prev - 1)
    } else {
      setLikes((prev) => prev + 1)
    }

    setLiked((prev) => !prev)
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-800/40 pt-4">
      
      {/* LIKE */}
      <button
        type="button"
        onClick={handleLike}
        className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
          liked
            ? 'text-yellow-600'
            : 'text-slate-500 hover:bg-slate-900/60 hover:text-slate-200'
        }`}
      >
        <ThumbsUp
          className={`h-4 w-4 transition-transform group-hover:scale-110 ${
            liked ? 'fill-yellow-600 text-yellow-600' : ''
          }`}
        />

        <span>{likes}</span>
      </button>

      {/* COMMENT */}
      <button
        type="button"
        className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/60 hover:text-slate-200"
      >
        <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />

        <span>{initialComments}</span>
      </button>

      {/* SHARE */}
      <button
        type="button"
        className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-900/60 hover:text-yellow-600"
      >
        <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />

        <span>{initialShares}</span>
      </button>
    </div>
  )
}