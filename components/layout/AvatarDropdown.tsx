'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, Settings, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function AvatarDropdown() {
  const [open, setOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Close When Clicking Outside
  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutside)

    return () => {
      window.removeEventListener('mousedown', handleOutside)
    }
  }, [])

  // Logout Handler
  async function handleLogout() {
    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Avatar Trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="ml-1 h-8 w-8 overflow-hidden rounded-full ring-1 ring-yellow-600/40 transition-all hover:ring-yellow-600 cursor-pointer"
      >
        <Image
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"
          alt="User Profile Avatar"
          width={40}
          height={40}
          style={{ width: '100%', height: '100%' }}
          className="object-cover"
        />
      </button>

      {/* Drop Panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black/40">
          
          {/* User Header */}
          <div className="border-b border-slate-800/50 px-4 py-3">
            <p className="text-sm font-bold text-slate-100">
              @CaptainGhost
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              GNEX Trader Account
            </p>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            
            <Link
              href="/user/CaptainGhost"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white"
            >
              <User className="h-4 w-4 text-slate-500" />
              Profile
            </Link>

            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              Settings
            </button>

            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}