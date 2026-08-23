// lib/hooks/useActivityRealtime.ts
// Realtime subscription for Home activity feed (mirrors useFeedRealtime pattern)

'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'

export function useActivityRealtime() {
    const queryClient = useQueryClient()

    useEffect(() => {
        const channel = supabase
            .channel('activity-events-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_events'
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['market-activity'] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])
}