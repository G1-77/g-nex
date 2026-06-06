'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function syncSessionAction(session: { access_token: string; refresh_token: string } | null) {
  const cookieStore = await cookies()

  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Safe to swallow inside a server action routing operation
          }
        },
      },
    }
  )

  if (session) {
    // Forcefully commits the fresh access and refresh tokens into the server cookie jar
    const { error } = await supabaseServer.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    
    if (error) {
      console.error('Server action failed to set token session:', error.message)
      return { success: false, error: error.message }
    }
    return { success: true }
  } else {
    // If logging out, forcefully wipe the server authentication cookies to clear ghost states
    const { error } = await supabaseServer.auth.signOut()
    if (error) return { success: false, error: error.message }
    return { success: true }
  }
}
