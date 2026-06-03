// lib/react-query/mutations/feed.mutations.ts

'use client'

import {
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'

import { feedKeys } from '../keys'

import type {
  AssetSymbol,
  FeedPost,
  SignalType
} from '@/lib/supabase/types'

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


async function uploadMedia(
  file: File
): Promise<string> {
  const fileExtension =
    file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExtension}`
  const filePath = `posts/${fileName}`
  const { error } = await supabase.storage
    .from('post-media')
    .upload(filePath, file)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { publicUrl }
  } = supabase.storage
    .from('post-media')
    .getPublicUrl(filePath)

  return publicUrl
}

async function createPost(
  payload: CreatePostPayload
) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  let mediaUrl: string | null = null

  
  // OPTIONAL MEDIA UPLOAD

  if (payload.mediaFile) {
    mediaUrl = await uploadMedia(
      payload.mediaFile
    )
  }

  // CREATE POST
  
  const { data: postData, error: postError } =
    await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: payload.content,
        media_url: mediaUrl
      })
      .select()
      .single()

  if (postError) {
    throw new Error(postError.message)
  }

  // OPTIONAL TRADE TAG INSERTS
  
  if (
    payload.assetSymbols &&
    payload.assetSymbols.length > 0
  ) {
    const tradeTagPayload =
      payload.assetSymbols.map(
        (symbol) => ({
          post_id: postData.id,
          asset_symbol: symbol,
          signal_type: 
            payload.signalType ?? 
              "Bullish",
        })
      )

    const { error: tradeTagError } =
      await supabase
        .from('trade_tags')
        .insert(tradeTagPayload)

    if (tradeTagError) {
      throw new Error(
        tradeTagError.message
      )
    }
  }

  return postData
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPost,

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: feedKeys.all
      })

      const previousFeed =
        queryClient.getQueryData<FeedPost[]>(
          feedKeys.all
        )

      const optimisticPost: FeedPost = {
        id: crypto.randomUUID(),
        content: payload.content,
        created_at:
          new Date().toISOString(),
        optimistic: true,
        assetSymbols:
          payload.assetSymbols ?? [],
        signalType: null,
        media_url: payload.mediaFile
          ? URL.createObjectURL(
              payload.mediaFile
            )
          : null,

        profiles: {
          id:
            payload.currentUser?.id ??
            'optimistic-user',
          username:
            payload.currentUser?.username ??
            'anonymous',
          full_name:
            payload.currentUser?.full_name ??
            'Anonymous Trader',

          avatar_url:
            payload.currentUser?.avatar_url ??
            null,
          bio:
            payload.currentUser?.bio ??
            null,
          is_verified:
            payload.currentUser?.is_verified ??
            false,
          monthly_roi:
            payload.currentUser?.monthly_roi ??
            0,
        },
        trade_tags: payload.assetSymbols?.length
          ? {
            asset_symbol: 
              payload.assetSymbols[0],

            signal_type: payload.signalType ?? "Bullish",
          }: null,

        likes_count: 0,
        comments_count: 0,
      }

      queryClient.setQueryData<FeedPost[]>(
        feedKeys.all,
        (old = []) => [
          optimisticPost,
          ...old
        ]
      )

      return {
        previousFeed
      }
    },

    onError: (
      _error,
      _variables,
      context
    ) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(
          feedKeys.all,
          context.previousFeed
        )
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: feedKeys.all
      })
    }
  })
}

interface ToggleLikePayload {
  postId: string
  userId: string
  postAuthorId: string
}

async function toggleLike({
  postId,
  userId,
}: ToggleLikePayload) {
  const { data: existingLike } =
    await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

  if (existingLike) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      liked: false,
      postId,
    }
  }

  const { error } = await supabase
    .from('likes')
    .insert({
      post_id: postId,
      user_id: userId,
    })

  if (error) {
    throw new Error(error.message)
  }

  return {
    liked: true,
    postId,
  }
}

export function useToggleLikeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleLike,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: feedKeys.all,
      })
    },
  })
}