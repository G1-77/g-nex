'use client'

import { useState } from 'react'
import { Loader2, Mail, Phone, Globe, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type AuthMode = 'select' | 'email' | 'phone'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('select')

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGoogleAuth() {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
    } catch (err) {
      console.error(err)
      alert('Google authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) return
    try {
      setLoading(true)
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Verification email sent or account registered successfully!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      window.location.href = '/'
    } catch (error: unknown) {
      console.error(error)

      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneAuth() {
    if (!phone.trim() || !password.trim()) return
    try {
      setLoading(true)
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ phone, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ phone, password })
        if (error) throw error
      }
      window.location.href = '/'
    } catch (error: unknown) {
      console.error(error)

      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100 antialiased">
      <div className="w-full max-w-sm rounded-3xl border border-slate-900 bg-slate-900/20 p-6 backdrop-blur-md relative overflow-hidden">
        
        {/* Back To Portal Choice Button */}
        {mode !== 'select' && (
          <button 
            type="button"
            onClick={() => setMode('select')}
            className="absolute top-5 left-5 text-slate-500 hover:text-slate-300 flex items-center justify-center h-7 w-7 rounded-full border border-slate-800 bg-slate-950/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Header Block */}
        <div className="mb-8 text-center mt-2">
          <h1 className="text-2xl font-black tracking-wider text-yellow-600">GNEX</h1>
          <p className="mt-1.5 text-xs text-slate-400 font-medium">
            {mode === 'select' 
              ? 'Secure Crypto & Gold Trading Gateway' 
              : `${isSignup ? 'Create account' : 'Sign in'} with ${mode}`}
          </p>
        </div>

        {/* COMPONENT 1: CHOICE ENTRY CHANNELS GRID */}
        {mode === 'select' && (
          <div className="space-y-2.5">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-yellow-600/30 hover:bg-slate-900/60 cursor-pointer disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 text-yellow-600" />}
              Continue with Google
            </button>

            <button
              onClick={() => setMode('email')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-yellow-600/30 hover:bg-slate-900/60 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-slate-400" />
              Continue with Email Address
            </button>

            <button
              onClick={() => setMode('phone')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-yellow-600/30 hover:bg-slate-900/60 cursor-pointer"
            >
              <Phone className="h-4 w-4 text-emerald-400" />
              Continue with Mobile Number
            </button>

            {/* SELECTION STATE TOGGLER */}
            <div className="pt-4 border-t border-slate-900 text-center">
              <button
                type="button"
                onClick={() => setIsSignup((prev) => !prev)}
                className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {isSignup ? 'Already have an account? Login' : 'Need an investment account? Register'}
              </button>
            </div>
          </div>
        )}

        {/* COMPONENT 2: DYNAMIC EMAIL SUBFORM LAYOUT */}
        {mode === 'email' && (
          <div className="space-y-3.5">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-yellow-600/40"
            />

            <input
              type="password"
              placeholder="Enter account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-yellow-600/40"
            />

            <button
              onClick={handleEmailAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 py-2.5 text-xs font-black tracking-wide text-slate-950 shadow-md shadow-yellow-600/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSignup ? 'Generate Account Key' : 'Unlock Interface'}
            </button>
          </div>
        )}

        {/* COMPONENT 3: DYNAMIC PHONE SUBFORM LAYOUT */}
        {mode === 'phone' && (
          <div className="space-y-3.5">
            <input
              type="tel"
              placeholder="+254 700 000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-yellow-600/40 font-mono"
            />

            <input
              type="password"
              placeholder="Enter account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-yellow-600/40"
            />

            <button
              onClick={handlePhoneAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 py-2.5 text-xs font-black tracking-wide text-slate-950 shadow-md shadow-yellow-600/5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSignup ? 'Generate Account Key' : 'Unlock Interface'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
