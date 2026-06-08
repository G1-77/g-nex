'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '../keys'
import type { Profile } from '@/lib/supabase/types'

// Statically declare type-safe shape bindings matching the database join results
export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles: Profile | null
}

export interface CreateCommentPayload {
  postId: string
  userId: string
  content: string
}

// Global lookup key dictionary mapping for comments tracking
export const commentKeys = {
  all: ['comments'] as const,
  byPost: (postId: string) => [...commentKeys.all, postId] as const,
}


//  1. QUERY HOOK: RETRIEVES HYDRO-MAPPED SUB-QUERY DISCUSSION ROWS

async function fetchCommentsByPost(postId: string): Promise<Comment[]> {
  if (!postId) return []

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      post_id,
      user_id,
      content,
      created_at,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url,
        is_verified,
        monthly_roi
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data as unknown as Comment[]) ?? []
}

export function useGetCommentsQuery(postId: string) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: () => fetchCommentsByPost(postId),
    enabled: Boolean(postId),
    staleTime: 1000 * 5, // 5 seconds cache validation window
    refetchOnWindowFocus: false,
  })
}


//  2. MUTATION HOOK: ATOMIC DISCUSSION INSERTER & CACHE INVALIDATOR

async function createComment({ postId, userId, content }: CreateCommentPayload): Promise<void> {
  // 1. Insert the main raw comment row into the comments table cleanly.
  // The database trigger will automatically catch this insert and create the correct 
  // notification on the server side without any frontend code interferences.
  const { error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
    })

  if (error) {
    throw new Error(error.message)
  }
}



export function useCreateCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_data, variables) => {
      // Forceful atomic query cache invalidation sweeps
      // Invalidate the post specific discussion list stream
      queryClient.invalidateQueries({
        queryKey: commentKeys.byPost(variables.postId),
      })
      // Invalidate the primary timeline stream cache to tick up comments_count counters
      queryClient.invalidateQueries({
        queryKey: feedKeys.all,
        exact: false,
        refetchType: "all"
      })
    },
    onError: (error: Error) => {
      console.error('GNEX Commentary Broadcast Exception:', error.message)
      alert(`Comment submission failed: ${error.message}`)
    },
  })
}
