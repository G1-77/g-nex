import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const PUBLIC_AUTH_ROUTES = ["/login", "/register"]
const PUBLIC_STATIC_PREFIXES = ['/_next', "/static", "/favicon.ico"]
const PUBLIC_FILE_REGEX = /\.[^/]+$/

export async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // 1. PUBLIC STATIC EXEMPTIONS
  const isStatic =
    PUBLIC_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || 
    PUBLIC_FILE_REGEX.test(pathname)

  if (isStatic) {
    return NextResponse.next()
  }

  // 2. ALLOW OAUTH AND BACKGROUND HANDSHAKES TO SLIP PAST UNINTERRUPTED
  if (pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Initialize an explicit outgoing Next.js response context wrapper
  // This allows our server client's 'setAll' hook to write fresh cookies straight into the request pipeline
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = await createServerClient()

  //SESSION STABILIZER:
  // Calling getUser() inside the middleware forces @supabase/ssr to check token lifespan.
  // If the 60-minute token is expired, the server automatically refreshes it right here
  // and injects the brand new cookie into our 'response' variable object stream.
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user && !error
  const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname)

  // 3. Prevent logged-in users from viewing auth screens
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 4. Discover public auth pages safely
  if (isAuthPage) {
    return response
  }

  // 5. Global protected dashboard gateways
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 6. EXISTING ADMIN ROLE GUARD
  if (pathname.startsWith('/admin')) {
    const { data: role } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!role) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Always return the response object that carries your updated cookies!
  return response
}
