import { NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      const cookieStore = await cookies()
      
      // 1. Initialize the explicit outgoing redirect response instance first
      const response = NextResponse.redirect(`${origin}${next}`)

      // 2. Instantiate a contextual client tied directly to this response instance
      const supabase = createSupabaseServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              
              // Forcefully writes the fresh login cookies into both the server store 
             
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
                response.cookies.set(name, value, options)
              })
            },
          },
        }
      )

      // 3. Execute the code exchange securely
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // Return the exact response instance carrying your live session cookies!
        return response
      }
      
      console.error('Supabase code exchange execution error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=pkce_exchange_failed`)
    } catch (catchErr) {
      console.error('Unexpected callback exception:', catchErr)
      return NextResponse.redirect(`${origin}/login?error=callback_exception`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
