// lib/react-query/mutations/social.mutations.ts
// Social mutations: save/unsave, report, comment threading

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '@/lib/react-query/keys'
import type { FeedPost } from '@/lib/supabase/types'

// ============================================================
// Save / Unsave Post
// ============================================================

export function useToggleSaveMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (postId: string) => {
            const { data, error } = await supabase.rpc('toggle_save_post', { p_post_id: postId })
            if (error) throw new Error(error.message)
            return data as { saved: boolean }
        },
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: feedKeys.all })

            const previousPosts = queryClient.getQueryData<FeedPost[]>(feedKeys.all)

            queryClient.setQueryData<FeedPost[]>(feedKeys.all, (old) => {
                if (!old) return old
                return old.map((post) =>
                    post.id === postId ? { ...post, isSavedByCurrentUser: !post.isSavedByCurrentUser } : post
                )
            })

            return { previousPosts }
        },
        onError: (_err, _postId, context) => {
            if (context?.previousPosts) {
                queryClient.setQueryData(feedKeys.all, context.previousPosts)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: feedKeys.all })
            queryClient.invalidateQueries({ queryKey: ['saved-posts'] })
        }
    })
}

// ============================================================
// Report Post / User / Comment
// ============================================================

export interface ReportPayload {
    contentType: 'post' | 'comment' | 'user'
    contentId: string
    reason: string
    details?: string
}

export function useReportMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: ReportPayload) => {
            const { data, error } = await supabase.rpc('submit_report', {
                p_content_type: payload.contentType,
                p_content_id: payload.contentId,
                p_reason: payload.reason,
                p_details: payload.details ?? null
            })
            if (error) throw new Error(error.message)
            return data as string // report id
        },
        onSuccess: () => {
            // Could invalidate reports list if user has access
        }
    })
}

// ============================================================
// Comment threading: fetch replies, paginate
// ============================================================

import { useQuery } from '@tanstack/react-query'

export interface CommentThread {
    id: string
    post_id: string
    user_id: string
    content: string
    created_at: string
    parent_id: string | null
    author_username: string
    author_avatar: string | null
    author_verified: boolean
}

export function useCommentThread(postId: string, limit = 20) {
    return useQuery({
        queryKey: ['comments', 'thread', postId, limit],
        enabled: !!postId,
        queryFn: async (): Promise<CommentThread[]> => {
            const { data, error } = await supabase.rpc('get_post_comments', {
                p_post_id: postId,
                p_limit: limit
            })
            if (error) throw new Error(error.message)
            return data ?? []
        },
        staleTime: 30_000,
    })
}

// ============================================================
// Create Comment / Reply
// ============================================================

export interface CreateCommentPayload {
    postId: string
    content: string
    parentId?: string | null
}

export function useCreateCommentMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: CreateCommentPayload) => {
            const { data, error } = await supabase.rpc('create_comment', {
                p_post_id: payload.postId,
                p_content: payload.content,
                p_parent_id: payload.parentId ?? null
            })
            if (error) throw new Error(error.message)
            return data as CommentThread
        },
        onSuccess: (newComment, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', 'thread', variables.postId] })
            queryClient.invalidateQueries({ queryKey: ['feed'] })
        }
    })
}

export function useSavedPosts(limit = 20) {
    return useQuery({
        queryKey: ['saved-posts', limit],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_saved_posts', { p_limit: limit })
            if (error) throw new Error(error.message)
            return data ?? []
        },
        staleTime: 60_000,
    })
}