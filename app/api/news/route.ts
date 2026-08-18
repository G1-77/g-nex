// /app/api/news/route.ts

import { fetchNewsArticles } from '@/lib/market/news'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const articles = await fetchNewsArticles(20)
    return Response.json({ articles })
  } catch (error) {
    return Response.json(
      { articles: [], error: error instanceof Error ? error.message : 'News fetch failed' },
      { status: 500 }
    )
  }
}