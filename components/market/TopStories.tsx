'use client'

import { Newspaper } from 'lucide-react'
import { useNews } from '@/lib/react-query/market/queries.news'
import type { NewsArticle, NewsCategory } from '@/lib/market/news'

const CATEGORY_STYLE: Record<NewsCategory, string> = {
  crypto: 'bg-emerald-500/10 text-emerald-400',
  gold: 'bg-amber-500/10 text-amber-400',
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
      className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0 gnex-interactive"
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${CATEGORY_STYLE[article.category]}`}>
        <Newspaper className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-caption text-text-muted">
          <span className="font-bold uppercase tracking-wider text-text-secondary">
            {article.source}
          </span>
          <span>·</span>
          <span>{relativeTime(article.publishedAt)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-text-primary transition-colors group-hover:text-brand">
          {article.title}
        </p>
      </div>
    </a>
  )
}

export default function TopStories() {
  const { data: articles, isLoading, isError } = useNews()

  const title = (
    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-text-muted">
      Top Stories <span className="text-text-muted">{'>'}</span>
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
              className="h-14 animate-pulse gnex-card"
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
        <p className="mt-3 font-mono text-caption text-text-muted">
          No market stories available right now.
        </p>
      </div>
    )
  }

  return (
    <div>
      {title}
      <div className="mt-2 gnex-card p-1">
        {articles.slice(0, 3).map((article) => (
          <StoryRow key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}