'use client'

import { useEffect, useMemo, useState, } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Send, BadgeCheck, MessageSquare } from 'lucide-react'
import { useAuth } from '../providers/AuthProvider'
import {
  useGetCommentsQuery,
  useCreateCommentMutation,
  type Comment,
} from '@/lib/react-query/queries/comments.queries'
import { useQueryClient } from '@tanstack/react-query'
import { feedKeys } from '@/lib/react-query/keys'

interface CommentDrawerProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

// Internal child UI abstraction mapping initials fallback layout nodes cleanly
function CommentAvatar({ comment }: { comment: Comment }) {
  const cleanUsername = comment.profiles?.username?.replace('@', '') || 'anonymous'
  const hasAvatar = Boolean(comment.profiles?.avatar_url?.trim())

  const initials = useMemo(() => {
    const fullName = comment.profiles?.full_name?.trim()

    if (fullName) {
      const parts = fullName.split(' ').filter(Boolean)
      if (parts.length >= 2) {
        return (
          `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`
        ).toUpperCase()
      }
      return parts[0]?.slice(0, 2).toUpperCase() ?? 'GN'
    }

    const username = comment.profiles?.username?.trim()
    if (username) {
      return username.replace('@', '').slice(0, 2).toUpperCase()
    }

    return 'GN'
  }, [comment.profiles?.full_name, comment.profiles?.username])

  return (
    <Link href={`/user/${cleanUsername}`} className="shrink-0 block select-none">
      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-900 bg-slate-900">
        {hasAvatar ? (
          <Image
            src={comment.profiles?.avatar_url as string}
            alt={comment.profiles?.username ?? 'Commenter'}
            fill
            sizes="32px"
            className="rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] font-black text-slate-400 font-mono">
            {initials}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function CommentDrawer({ postId, isOpen, onClose }: CommentDrawerProps) {
  const { user, } = useAuth()
  const [commentText, setCommentText] = useState('')

  // 1. DATA HYDRATION HOOK STREAMS
  const { data: comments, isLoading } = useGetCommentsQuery(postId)
  const createCommentMutation = useCreateCommentMutation()
  const queryClient = useQueryClient()


  // 2. STRUCTURAL UX CONSTRAINT: PREVENT BACKGROUND VIEWPORT BODY SCROLLING LOCKS
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleCloseWithRefresh = () => {
    queryClient.invalidateQueries({
       queryKey: feedKeys.all,
       exact: false,
       refetchType: "all"
       })
    onClose()
  }

  // Form submission execution routine channel controller
  // const handleSubmit = (e: SyntheticEvent) => {
  //   e.preventDefault()
  //   if (!commentText.trim() || !user || !profile) return

  //   createCommentMutation.mutate(
  //     {
  //       postId,
  //       userId: user.id,
  //       content: commentText,
  //     },
  //     {
  //       onSuccess: () => {
  //         // Synchronously purge state string value strictly upon 200 success resolution signatures
  //         setCommentText('')
  //       },
  //     }
  //   )
  // }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Absolute overlay background mask clickable dismiss anchor zone */}
      <div className="absolute inset-0 -z-10 cursor-pointer" onClick={handleCloseWithRefresh} />

      {/* GLASSMORPHIC BOTTOM SHEET CONTROLLER SHELL */}
      <div className="relative flex max-h-[85vh] min-h-[50vh] w-full flex-col rounded-t-3xl border-t border-slate-900 bg-slate-950/95 pb-safe backdrop-blur-xl shadow-2xl shadow-black animate-slideUp">
        
        {/* HEADER DRAG BAR PILL DECORATION ELEMENT */}
        <div className="flex w-full justify-center py-3 select-none">
          <div className="h-1 w-12 rounded-full bg-slate-800" />
        </div>

        {/* DRAWER TOP STRIP CONTAINER HEADER BLOCK */}
        <div className="flex items-center justify-between border-b border-slate-900/60 px-5 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-yellow-600" />
            <h2 className="text-sm font-black tracking-wide text-slate-200">
              Comments
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseWithRefresh}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-900 bg-slate-900/50 text-slate-400 transition-colors hover:border-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MIDDLE SCROLLABLE COMMENT FEEDS BODY CONTAINER BLOCK */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* PULSE SKELETAL PROGRESS INDICATION LOADING SKINS */}
          {isLoading && (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((id) => (
                <div key={id} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-900 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2.5 w-1/4 rounded bg-slate-900" />
                    <div className="h-2 w-3/4 rounded bg-slate-900" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY OVERLAY DISPATCH PLACEHOLDERS GRID */}
          {!isLoading && (!comments || comments.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                No comments yet
              </p>
              <p className="mt-1 text-[11px] text-slate-600 max-w-50">
                Be the first to comment.
              </p>
            </div>
          )}

          {/* CHAT CHRONOLOGICAL LOGS RENDER TREE MAP LOOP */}
          {!isLoading &&
            comments &&
            comments.map((comment: Comment) => (
              <div key={comment.id} className="flex items-start gap-3 text-left">
                <CommentAvatar comment={comment} />
                
                <div className="flex flex-col min-w-0 flex-1 rounded-2xl bg-slate-900/20 border border-slate-900/40 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black text-slate-200 truncate max-w-30">
                        {comment.profiles?.full_name || 'Anonymous User'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold font-mono">
                        @{comment.profiles?.username || 'anonymous'}
                      </span>
                      {comment.profiles?.is_verified && (
                        <BadgeCheck className="h-3 w-3 shrink-0 fill-yellow-600 stroke-slate-950 text-slate-950" />
                      )}
                    </div>
                    
                    <span className="text-[9px] font-mono text-slate-600 shrink-0 font-bold">
                      {new Date(comment.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed font-medium font-sans whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* STICKY STABILIZED COMPOSER BAR NODE FOOTER BOX */}
                
        <div className="border-t border-slate-900 bg-slate-950 px-4 py-3">
          {user ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  // Allow mobile traders to hit 'Enter' on their phone keyboards to submit instantly
                  if (e.key === 'Enter' && commentText.trim() && !createCommentMutation.isPending) {
                    e.preventDefault();
                    
                    // Directly fire the mutation parameters
                    createCommentMutation.mutate({
                      postId,
                      userId: user.id,
                      content: commentText
                    }, {
                      onSuccess: () => setCommentText('')
                    });
                  }
                }}
                placeholder="Contribute market intel or setup critique..."
                maxLength={500}
                disabled={createCommentMutation.isPending}
                className="flex-1 rounded-xl border border-slate-900 bg-slate-900/40 px-4 py-2.5 text-xs font-medium text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-yellow-600/30 focus:bg-slate-900/80"
              />
              <button
                type="button"
                onClick={() => {
                  if (!commentText.trim() || createCommentMutation.isPending) return;
                  
                  // Direct explicit click dispatch
                  createCommentMutation.mutate({
                    postId,
                    userId: user.id,
                    content: commentText
                  }, {
                    onSuccess: () => setCommentText('')
                  });
                }}
                disabled={!commentText.trim() || createCommentMutation.isPending}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-yellow-600 text-slate-950 transition-all hover:bg-yellow-500 active:scale-95 disabled:pointer-events-none disabled:bg-slate-900 disabled:text-slate-600"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-900 bg-slate-900/10 py-2.5 text-center">
              <p className="text-[11px] font-bold text-slate-500 tracking-wide">
                Authentication Required: Please sign in to join market discussion threads.
              </p>
            </div>
          )}
        </div>


      </div>
    </div>
  )
}
