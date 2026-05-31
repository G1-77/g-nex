import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      const supabase = await createServerClient()
      
      // 🟢 Attempt the server-side authorization code swap transaction
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      
      console.error('Supabase code exchange execution error:', error)
      return NextResponse.redirect(`${origin}/login?error=pkce_exchange_failed`)
    } catch (catchErr) {
      console.error('Unexpected callback exception:', catchErr)
      return NextResponse.redirect(`${origin}/login?error=callback_exception`)
    }
  }

  // 🟢 FALLBACK SECURITY GUARD: Always return an explicit response redirect object
  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
