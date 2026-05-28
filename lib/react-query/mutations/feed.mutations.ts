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
  FeedPost
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
}

function getAssetBaselineData(
  asset: AssetSymbol
) {
  switch (asset) {
    case 'BTC':
      return {
        asset_name: 'Bitcoin',
        entry_price: 64000,
        price_change_24h: 3.4
      }

    case 'SOL':
      return {
        asset_name: 'Solana',
        entry_price: 142,
        price_change_24h: 5.1
      }

    case 'XAU':
      return {
        asset_name: 'Spot Gold',
        entry_price: 2350,
        price_change_24h: -0.3
      }

    default:
      return {
        asset_name: 'Unknown Asset',
        entry_price: 0,
        price_change_24h: 0
      }
  }
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

  // =====================================================
  // OPTIONAL MEDIA UPLOAD
  // =====================================================

  if (payload.mediaFile) {
    mediaUrl = await uploadMedia(
      payload.mediaFile
    )
  }

  // =====================================================
  // CREATE POST
  // =====================================================

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

  // =====================================================
  // OPTIONAL TRADE TAG INSERTS
  // =====================================================

  if (
    payload.assetSymbols &&
    payload.assetSymbols.length > 0
  ) {
    const tradeTagPayload =
      payload.assetSymbols.map((symbol) => {
        const baseline =
          getAssetBaselineData(symbol)
        return {
          post_id: postData.id,
          asset_symbol: symbol,
          asset_name:
            baseline.asset_name,
          entry_price:
            baseline.entry_price,
          price_change_24h:
            baseline.price_change_24h
        }
      })

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
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
          bio:
            payload.currentUser?.bio ??
            null,
          is_verified:
            payload.currentUser?.is_verified ??
            false,
          monthly_roi:
            payload.currentUser?.monthly_roi ??
            0,
        }
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