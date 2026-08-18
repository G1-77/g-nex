'use client'

import { Newspaper } from 'lucide-react'
import { useNews } from '@/lib/react-query/market/queries.news'
import type { NewsArticle, NewsCategory } from '@/lib/market/news'

const CATEGORY_STYLE: Record<NewsCategory, string> = {
  crypto: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  gold: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
}

function relativeTime(publishedAt: string | null): string {
  if (!publishedAt) return ''
  const diff = Date.now() - new Date(publishedAt).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StoryRow({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0"
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${CATEGORY_STYLE[article.category]}`}
      >
        <Newspaper className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-[10px] text-slate-500">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            {article.source}
          </span>
          <span>·</span>
          <span>{relativeTime(article.publishedAt)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-100 transition-colors group-hover:text-white">
          {article.title}
        </p>
      </div>
    </a>
  )
}

export default function TopStories() {
  const { data: articles, isLoading, isError } = useNews()

  const title = (
    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
      Top Stories <span className="text-slate-600">&gt;</span>
    </h2>
  )

  if (isLoading) {
    return (
      <div>
        {title}
        <div className="mt-2 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-slate-900/60 bg-slate-900/20"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !articles || articles.length === 0) {
    return (
      <div>
        {title}
        <p className="mt-3 font-mono text-xs text-slate-500">
          No market stories available right now.
        </p>
      </div>
    )
  }

  return (
    <div>
      {title}
      <div className="mt-2 divide-y divide-slate-900/60 rounded-xl border border-slate-900/60 bg-slate-900/20 px-4 py-1">
        {articles.slice(0, 3).map((article) => (
          <StoryRow key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}