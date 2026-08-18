'use client'

import { useQuery } from '@tanstack/react-query'
import type { NewsArticle } from '@/lib/market/news'

interface NewsResponse {
  articles: NewsArticle[]
}

export function useNews() {
  return useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error('Failed to fetch news')
      const json: NewsResponse = await res.json()
      return json.articles ?? []
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  })
}