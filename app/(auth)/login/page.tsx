'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type LoginMethod = 'select' | 'email' | 'phone'

export default function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>('select')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleAuth() {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          // 🟢 FIXED: Routes through our proxy callback pipeline to ensure session cookies are set correctly
          redirectTo: `${window.location.origin}/auth/callback` 
        }
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        ...(method === 'email' ? { email } : { phone }),
        password
      })
      if (error) throw error
      window.location.href = '/'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100 antialiased">
      <div className="w-full max-w-sm rounded-3xl border border-slate-900 bg-slate-900/20 p-6 backdrop-blur-md relative">
        
        {method !== 'select' && (
          <button 
            onClick={() => setMethod('select')} 
            className="absolute top-5 left-5 text-slate-500 hover:text-slate-300 h-7 w-7 rounded-full border border-slate-800 bg-slate-950/40 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="mb-8 text-center mt-2">
          <h1 className="text-2xl font-black tracking-wider text-yellow-600">GNEX</h1>
          <p className="mt-1.5 text-xs text-slate-400 font-medium">Login to access your account</p>
        </div>

        {method === 'select' ? (
          <div className="space-y-2.5">
            <button 
              onClick={handleGoogleAuth} 
              disabled={loading} 
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs font-bold text-slate-200 hover:border-yellow-600/30 hover:bg-slate-900/60 cursor-pointer disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 text-yellow-600" />}
              Continue with Google
            </button>
            <button 
              onClick={() => setMethod('email')} 
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs font-bold text-slate-200 hover:border-yellow-600/30 hover:bg-slate-900/60 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-slate-400" /> Continue with Email
            </button>
            <div className="pt-4 border-t border-slate-900 text-center">
              <Link href="/register" className="text-xs font-medium text-slate-500 hover:text-slate-300">Need an investment account? Register</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              name={method === 'email' ? 'email' : 'tel'}
              id={method === 'email' ? 'email' : 'tel'}
              autoComplete={method === 'email' ? 'email' : 'tel'}
              type={method === 'email' ? 'email' : 'tel'}
              placeholder={method === 'email' ? 'Enter email address' : '+254 700 000000'}
              // Maps directly to the true reactive state memory variable strings, not hardcoded literals
              value={method === 'email' ? email : phone}
              onChange={(e) => method === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-yellow-600/40"
              required
            />
            <input
              name="password"
              id="password"
              autoComplete="current-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-yellow-600/40"
              required
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 py-2.5 text-xs font-black tracking-wide text-slate-950 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
