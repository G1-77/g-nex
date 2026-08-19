import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

const PUBLIC_AUTH_ROUTES = ["/login", "/register"]
const PUBLIC_STATIC_PREFIXES = ['/_next', "/static", "/favicon.ico"]
const PUBLIC_FILE_REGEX = /\.[^/]+$/

export async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // 1. PUBLIC STATIC EXEMPTIONS (Bypass for bundle files)
  const isStatic =
    PUBLIC_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || 
    PUBLIC_FILE_REGEX.test(pathname)

  if (isStatic) {
    return NextResponse.next()
  }

  
  if (pathname.startsWith('/auth') || pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // 2. Dynamic response that can be modified with cookies
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Re-initialize the server client matching our current request/response chain
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
        },
      },
    }
  )

  // Force user verification token check checks
  const { data: { user }, error } = await supabase.auth.getUser()

  const isAuthenticated = !!user && !error
  const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname)

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (isAuthPage) {
    return response
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Maintenance mode: block non-staff traffic platform-wide.
  if (pathname !== '/maintenance') {
    const { data: maintenance } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    const inMaintenance =
      maintenance?.value === true ||
      (typeof maintenance?.value === 'object' && maintenance.value !== null &&
        JSON.parse(JSON.stringify(maintenance.value)).enabled === true)

    if (inMaintenance && !user.user_metadata?.is_admin) {
      const { data: staffCheck } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!staffCheck) {
        return NextResponse.redirect(new URL('/maintenance', req.url))
      }
    }
  }

  // Admin security roles routing filter block
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

  return response
}
