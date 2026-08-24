// components/feed/CommentThread.tsx
// Facebook-style inline comment thread (brief §28).
// Replaces CommentDrawer with conversational inline hierarchy.
// Uses real-time data from useCommentThread hook and create_comment mutation.

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ThumbsUp, MessageSquare, Send, MoreHorizontal } from 'lucide-react'
import { useToggleLikeMutation } from '@/lib/react-query/mutations/feed.mutations'
import { useAuth } from '@/components/providers/AuthProvider'
import { useCommentThread, useCreateCommentMutation } from '@/lib/react-query/mutations/social.mutations'
import { useToast } from '@/components/notifications/Toast'
import type { CommentThread as CommentThreadType } from '@/lib/react-query/mutations/social.mutations'

// Extended type with replies for nested threading
interface ThreadComment extends CommentThreadType {
    replies?: ThreadComment[]
}

interface CommentThreadProps {
    postId: string
    commentsCount?: number
}

function timeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
}

function buildThread(comments: CommentThreadType[]): ThreadComment[] {
    const commentMap = new Map<string, ThreadComment>()
    const roots: ThreadComment[] = []

    comments.forEach((c) => {
        commentMap.set(c.id, { ...c, replies: [] })
    })

    comments.forEach((c) => {
        const comment = commentMap.get(c.id)!
        if (c.parent_id) {
            const parent = commentMap.get(c.parent_id)
            if (parent) {
                parent.replies = parent.replies ?? []
                parent.replies.push(comment)
            } else {
                roots.push(comment)
            }
        } else {
            roots.push(comment)
        }
    })

    return roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

function CommentItem({
    comment,
    level = 0,
    onReply
}: {
    comment: ThreadComment
    level?: number
    onReply: (parentId: string) => void
}) {
    const { user } = useAuth()
    const isOwn = user?.id === comment.user_id
    const [showReplies, setShowReplies] = useState(false)

    const initials = comment.author_username
        ?.split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ?? comment.author_username?.slice(0, 2).toUpperCase() ?? 'GN'

    return (
        <div className={`flex gap-3 ${level > 0 ? 'ml-10 border-l-2 border-border-subtle pl-3' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden border border-border bg-surface">
                {comment.author_avatar ? (
                    <Image src={comment.author_avatar} alt={comment.author_username} fill sizes="32px" className="object-cover" />
                ) : (
                    <span className="text-xs font-black text-text-secondary">{initials}</span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{comment.author_username}</span>
                    {comment.author_verified && <span className="text-brand">✓</span>}
                    <span className="text-caption text-text-muted">{timeAgo(comment.created_at)}</span>
                </div>

                <p className="mt-1 whitespace-pre-wrap gnex-body-sm text-text-primary">{comment.content}</p>

                <div className="flex items-center gap-3 mt-1.5">
                    <button
                        type="button"
                        className="flex items-center gap-1 text-caption font-medium text-text-muted hover:text-brand transition-colors gnex-touch-target"
                    >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>Like</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onReply(comment.id)}
                        className="flex items-center gap-1 text-caption font-medium text-text-muted hover:text-brand transition-colors gnex-touch-target"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Reply</span>
                    </button>
                    {isOwn && (
                        <button
                            type="button"
                            className="flex items-center gap-1 text-caption font-medium text-text-muted hover:text-brand transition-colors gnex-touch-target"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span>More</span>
                        </button>
                    )}
                </div>

                {showReplies && comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 space-y-3">
                        {comment.replies.map((reply: ThreadComment) => (
                            <CommentItem key={reply.id} comment={reply} level={level + 1} onReply={onReply} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function CommentComposer({ postId, onSubmit, replyingTo, onCancelReply }: { postId: string; onSubmit: (content: string, parentId?: string) => void; replyingTo: string | null; onCancelReply: () => void }) {
    const { user, profile } = useAuth()
    const [content, setContent] = useState('')
    const { error: toastError } = useToast()

    const initials = profile?.full_name
        ?.split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ?? profile?.username?.slice(0, 2).toUpperCase() ?? 'GN'

    if (!user) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-bg text-brand text-xs font-black">
                    {initials}
                </div>
                <p className="text-text-secondary text-sm">Sign in to join the conversation.</p>
            </div>
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return
        onSubmit(content.trim(), replyingTo ?? undefined)
        setContent('')
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden border border-border bg-surface">
                {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.username ?? 'Profile'} fill sizes="32px" className="object-cover" />
                ) : (
                    <span className="text-xs font-black text-text-secondary">{initials}</span>
                )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <div className="relative flex-1">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                        className="w-full h-20 resize-none rounded-xl border border-border bg-surface p-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-1 focus:ring-brand/20"
                        rows={3}
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    {replyingTo && (
                        <button
                            type="button"
                            onClick={onCancelReply}
                            className="text-caption text-text-muted hover:text-brand"
                        >
                            Cancel reply
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!content.trim()}
                        className="gnex-btn gnex-btn-primary text-sm"
                    >
                        <Send className="h-4 w-4 mr-1" />
                        {replyingTo ? 'Reply' : 'Comment'}
                    </button>
                </div>
            </div>
        </form>
    )
}

export default function CommentThread({ postId, commentsCount = 0 }: CommentThreadProps) {
    const { data: commentsData, isLoading, error } = useCommentThread(postId, 50)
    const createCommentMutation = useCreateCommentMutation()
    const { success: toastSuccess, error: toastError } = useToast()
    const [replyingTo, setReplyingTo] = useState<string | null>(null)

    const threadComments = commentsData ? buildThread(commentsData) : []

    const handleAddComment = async (content: string, parentId?: string) => {
        if (!content.trim()) return
        try {
            await createCommentMutation.mutateAsync({ postId, content, parentId })
            toastSuccess(parentId ? 'Reply posted' : 'Comment posted')
        } catch (err) {
            toastError(err instanceof Error ? err.message : 'Failed to post comment')
        }
    }

    const handleReply = (parentId: string) => {
        setReplyingTo(parentId)
    }

    const handleCancelReply = () => {
        setReplyingTo(null)
    }

    if (isLoading) {
        return (
            <section aria-label="Comments" className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments
                    {commentsCount > 0 && <span className="text-body font-mono text-brand">{commentsCount}</span>}
                </h3>
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-surface/40" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/4 rounded bg-surface/40" />
                                <div className="h-4 w-3/4 rounded bg-surface/40" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section aria-label="Comments" className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments
                </h3>
                <p className="text-text-muted text-center py-8">Failed to load comments.</p>
            </section>
        )
    }

    return (
        <section aria-label="Comments" className="space-y-4">
            {/* Comments header */}
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
                {commentsCount > 0 && <span className="text-body font-mono text-brand">{commentsCount}</span>}
            </h3>

            {/* Composer at top (Facebook style) */}
            <CommentComposer
                postId={postId}
                onSubmit={handleAddComment}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
            />

            {/* Comments list */}
            {threadComments.length === 0 ? (
                <p className="text-text-muted text-center py-8">No comments yet. Be the first to share your thoughts.</p>
            ) : (
                <div className="space-y-4">
                    {threadComments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
                    ))}
                </div>
            )}
        </section>
    )
}