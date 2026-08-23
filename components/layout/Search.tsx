// components/layout/Search.tsx
// Global search with autocomplete (brief §34).
// Searches users, assets, posts, markets with debounced queries.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, X, User, TrendingUp, MessageSquare, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'

export interface SearchResult {
  type: 'user' | 'asset' | 'post' | 'market'
  id: string
  title: string
  subtitle?: string
  image?: string
  href: string
}

interface SearchProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export default function Search({ placeholder = 'Search crypto, gold, traders...', className, autoFocus = false }: SearchProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const allResults: SearchResult[] = []

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_verified')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(5)
      users?.forEach(u => allResults.push({
        type: 'user',
        id: u.id,
        title: `@${u.username}`,
        subtitle: u.full_name ?? undefined,
        image: u.avatar_url ?? undefined,
        href: `/user/${u.username}`
      }))

      // Search assets
      const { data: assets } = await supabase
        .from('assets')
        .select('symbol, name, type, logo_url')
        .or(`symbol.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(5)
      assets?.forEach(a => allResults.push({
        type: 'asset',
        id: a.symbol,
        title: a.symbol,
        subtitle: a.name,
        image: a.logo_url ?? undefined,
        href: `/markets/${a.symbol.toLowerCase()}`
      }))

      // Search posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, created_at, profiles!inner(username)')
        .ilike('content', `%${searchQuery}%`)
        .limit(3)
      posts?.forEach(p => allResults.push({
        type: 'post',
        id: p.id,
        title: p.content.slice(0, 80) + (p.content.length > 80 ? '...' : ''),
        subtitle: `@${(p.profiles as any).username} · ${new Date(p.created_at).toLocaleDateString()}`,
        href: `/feed/${p.id}`
      }))

      setResults(allResults.slice(0, 10))
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    setSelectedIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(value), 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      const result = results[selectedIndex]
      router.push(result.href)
      setIsOpen(false)
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    }
  }

  const handleResultClick = (href: string) => {
    router.push(href)
    setIsOpen(false)
    setQuery('')
    setResults([])
    inputRef.current?.blur()
  }

  const clearQuery = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4 text-brand" />
      case 'asset': return <TrendingUp className="h-4 w-4 text-success" />
      case 'post': return <MessageSquare className="h-4 w-4 text-text-muted" />
      case 'market': return <TrendingUp className="h-4 w-4 text-crypto" />
    }
  }

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'User'
      case 'asset': return 'Asset'
      case 'post': return 'Post'
      case 'market': return 'Market'
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex items-center gap-2.5 rounded-full bg-surface/40 px-4 py-2 transition-all duration-200 focus-within:ring-1 focus-within:ring-brand/20">
        <SearchIcon className="h-4 w-4 text-text-muted" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-64 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          autoComplete="off"
          aria-label="Search GNEX"
          aria-expanded={isOpen && results.length > 0}
          aria-controls="search-results"
          role="combobox"
        />

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="flex items-center justify-center p-1 rounded-full hover:bg-surface-hover text-text-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (results.length > 0 || isLoading) && (
          <motion.div
            id="search-results"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 gnex-overlay overflow-hidden"
            role="listbox"
          >
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            )}

            {results.length > 0 && (
              <div className="py-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleResultClick(result.href)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      selectedIndex === index ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                    )}
                    role="option"
                    aria-selected={selectedIndex === index}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                      {result.image ? (
                        <Image src={result.image} alt="" fill sizes="32px" className="rounded-lg object-cover" />
                      ) : (
                        getResultIcon(result.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-caption text-text-muted truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-caption text-text-muted uppercase tracking-wider">{getResultTypeLabel(result.type)}</span>
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 && !isLoading && query.length >= 2 && (
              <div className="px-3 py-4 text-center text-text-muted text-sm">
                No results for "{query}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}