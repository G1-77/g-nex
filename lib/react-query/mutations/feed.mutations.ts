// lib/react-query/mutations/feed.mutations.ts
'use client'

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'

import { feedKeys } from '../keys'

import type {
  CreatePostPayload,
  FeedPost,
} from '@/lib/supabase/types'

async function createPost(
  payload: CreatePostPayload
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  /*
   * 1. Create post
   */
  const {
    data: postData,
    error: postError,
  } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content: payload.content,
    })
    .select()
    .single()

  if (postError) {
    throw new Error(postError.message)
  }

  /*
   * 2. Create trade tags
   */
  if (payload.assetSymbol.length > 0) {
    const tradeTagsPayload =
      payload.assetSymbol.map((symbol) => ({
        post_id: postData.id,
        asset_symbol: symbol,
        signal_type: payload.signalType,
      }))

    const { error: tradeTagError } =
      await supabase
        .from('trade_tags')
        .insert(tradeTagsPayload)

    if (tradeTagError) {
      throw new Error(tradeTagError.message)
    }
  }

  return postData
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    unknown,
    Error,
    CreatePostPayload,
    {
      previousFeed:
        | FeedPost[]
        | undefined
    }
  >({
    mutationFn: createPost,

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: feedKeys.all,
      })

      const previousFeed =
        queryClient.getQueryData<FeedPost[]>(
          feedKeys.all
        )

      /*
       * Get authenticated user
       * for optimistic rendering
       */
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      /*
       * Optimistic post
       */
      const optimisticPost: FeedPost = {
        id: crypto.randomUUID(),

        content: payload.content,

        created_at:
          new Date().toISOString(),

        assetSymbols:
          payload.assetSymbol,

        signalType:
          payload.signalType,

        optimistic: true,

        profiles: {
          id: user.id,

          username: 'you',

          full_name: 'You',

          avatar_url:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
        },
      }

      /*
       * Inject instantly
       * into active feed
       */
      queryClient.setQueryData<
        FeedPost[]
      >(
        feedKeys.all,
        (old = []) => [
          optimisticPost,
          ...old,
        ]
      )

      return {
        previousFeed,
      }
    },

    /*
     * Rollback on failure
     */
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

    /*
     * Sync with server truth
     */
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: feedKeys.all,
      })
    },
  })
}