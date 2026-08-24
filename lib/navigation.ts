// lib/navigation.ts
// Shared navigation model for the desktop sidebar and the mobile hamburger
// drawer (GNEX 2.0 structural shell — brief §7). Routes that do not exist yet
// carry `soon: true` and render as disabled entries with a "Soon" chip instead
// of dead links.

import {
  BarChart2,
  BellRing,
  Bookmark,
  Briefcase,
  HelpCircle,
  Home,
  Newspaper,
  Settings,
  Star,
  Trophy,
  User,
  Users,
  Zap,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string | null
  icon: LucideIcon
  soon?: boolean
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Core',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Markets', href: '/markets', icon: BarChart2 },
      { label: 'Trade', href: '/trade', icon: Zap },
      { label: 'Wallet', href: '/wallet', icon: Briefcase }
    ]
  },
  {
    title: 'Community',
    items: [
      { label: 'Discover', href: '/feed', icon: Newspaper },
      { label: 'Traders', href: null, icon: Users, soon: true },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy }
    ]
  },
  {
    title: 'Personal',
    items: [
      { label: 'Watchlist', href: null, icon: Star, soon: true },
      { label: 'Saved', href: null, icon: Bookmark, soon: true },
      { label: 'Price Alerts', href: null, icon: BellRing, soon: true },
      { label: 'Profile', href: null, icon: User }
    ]
  },
  {
    title: 'Utility',
    items: [
      { label: 'Settings', href: null, icon: Settings, soon: true },
      { label: 'Help', href: null, icon: HelpCircle, soon: true }
    ]
  }
]
