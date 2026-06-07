'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { feedKeys } from '../keys'
import type { AssetSymbol, FeedPost, SignalType } from '@/lib/supabase/types'

interface CurrentUserPayload {
  id: string
  username: string
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  is_verified?: boolean
  monthly_roi?: number | null
}

export interface CreatePostPayload {
  content: string
  assetSymbols?: AssetSymbol[]
  mediaFile?: File | null
  currentUser?: CurrentUserPayload
  signalType?: SignalType | null
}

export interface ToggleLikePayload {
  postId: string
  userId: string
  postAuthorId: string
}

// 🗄️ MULTIMEDIA SCREENSHOT/CHART UPLOAD ENGINE

async function uploadMedia(file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExtension}`
  const filePath = `posts/${fileName}`
  
  const { error } = await supabase.storage
    .from('post-media')
    .upload(filePath, file)

  if (error) {
    throw new Error(error.message)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('post-media')
    .getPublicUrl(filePath)

  return publicUrl
}

// MUTATION 1: ATOMIC POST ENGINE (INVOKES SECURE DATABASE RPC)

async function createPost(payload: CreatePostPayload) {
  // Extract our real active profile entry passed straight from useAuth() in the component layer
  const activeUserId = payload.currentUser?.id

  if (!activeUserId) {
    throw new Error('Unauthorized session: Active user context missing from provider.')
  }

  let mediaUrl: string | null = null

  // Optional trade chart file attachment processing
  if (payload.mediaFile) {
    mediaUrl = await uploadMedia(payload.mediaFile)
  }

  const primaryAsset = payload.assetSymbols && payload.assetSymbols.length > 0 
    ? payload.assetSymbols 
    : null

  // Invokes our atomic database stored procedure to bypass browser RLS lag crashes
  const { data: postUuid, error: rpcError } = await supabase.rpc('create_post_with_tags', {
    p_content: payload.content,
    p_asset_symbol: primaryAsset,
    p_signal_type: payload.signalType || null,
    p_media_url: mediaUrl 
  })

  if (rpcError) {
    throw new Error(rpcError.message)
  }

  return {
    id: postUuid as string,
    content: payload.content,
    media_url: mediaUrl,
    created_at: new Date().toISOString()
  }
}


export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPost,

    // OPTIMISTIC RENDER STREAM FOR HIGH-SPEED INTERFACE UPDATES
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all })

      const previousFeed = queryClient.getQueryData<FeedPost[]>(feedKeys.all)

      const optimisticPost: FeedPost = {
        id: crypto.randomUUID(),
        content: payload.content,
        created_at: new Date().toISOString(),
        media_url: payload.mediaFile ? URL.createObjectURL(payload.mediaFile) : null,
        assetSymbols: payload.assetSymbols ?? [],
        signalType: payload.signalType ?? null,
        profiles: {
          id: payload.currentUser?.id ?? 'optimistic-user',
          username: payload.currentUser?.username ?? 'anonymous',
          full_name: payload.currentUser?.full_name ?? 'Anonymous Trader',
          avatar_url: payload.currentUser?.avatar_url ?? null,
          bio: payload.currentUser?.bio ?? null,
          is_verified: payload.currentUser?.is_verified ?? false,
          monthly_roi: payload.currentUser?.monthly_roi ?? 0,
        },
        trade_tags: payload.assetSymbols?.length
          ? {
              asset_symbol: payload.assetSymbols[0],
              signal_type: payload.signalType ?? 'Bullish',
            }
          : null,
        likes_count: 0,
        comments_count: 0,
      }

      queryClient.setQueryData<FeedPost[]>(feedKeys.all, (old = []) => [
        optimisticPost,
        ...old,
      ])

      return { previousFeed }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(feedKeys.all, context.previousFeed)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

//  MUTATION 2: TYPE-SAFE TOGGLE LIKE ENGINE (TARGETS REAL 'LIKES' TABLE)

async function toggleLike({ postId, userId, postAuthorId }: ToggleLikePayload) {
  
  const { data: existingLike, error: fetchError } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (existingLike) {
    // UNLIKE ROUTE: Row exists, wipe it from disk cleanly
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id)

    if (error) {
      throw new Error(error.message)
    }

    return { liked: false, postId }
  }

  // LIKE ROUTE: No row exists, insert fresh tracking identifiers
  const { error } = await supabase
    .from('likes')
    .insert({
      post_id: postId,
      user_id: userId,
    })

  if (error) {
    throw new Error(error.message)
  }

  // AUTO-TRIGGER ACTIVITY ALERT NOTIFICATION ROW
  if (userId !== postAuthorId && postAuthorId !== '') {
    await supabase.from('notifications').insert({
      recipient_id: postAuthorId,
      notifier_id: userId,
      notification_type: 'like',
      metadata_json: { post_id: postId }
    })
  }

  return { liked: true, postId }
}

export function useToggleLikeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleLike,

    //  OPTIMISTIC CACHE TOGGLE ENGINE FOR LATENCY-FREE TAP RESPONSES
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all })

      const previousFeed = queryClient.getQueryData<FeedPost[]>(feedKeys.all)

      queryClient.setQueryData<FeedPost[]>(feedKeys.all, (oldData) => {
        if (!oldData) return []
        return oldData.map((post) => {
          if (post.id === postId) {
            const currentlyLiked = post.isLikedByCurrentUser ?? false
            return {
              ...post,
              isLikedByCurrentUser: !currentlyLiked,
              likes_count: currentlyLiked 
                ? Math.max(0, post.likes_count - 1) 
                : post.likes_count + 1
            }
          }
          return post
        })
      })

      return { previousFeed }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(feedKeys.all, context.previousFeed)
      }
      alert('Network transaction delayed. Retrying sync block.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}
