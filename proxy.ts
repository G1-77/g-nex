import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const PUBLIC_AUTH_ROUTES = ['/login']
const PUBLIC_STATIC_PREFIXES = ['/_next']
const PUBLIC_FILE_REGEX = /\.[^/]+$/

export async function proxy(req: Request) {
  const url = new URL(req.url)
  const pathname = url.pathname

  
  // 1. PUBLIC STATIC EXEMPTIONS
  
  const isStatic =
    PUBLIC_STATIC_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    ) || PUBLIC_FILE_REGEX.test(pathname)

  if (isStatic) {
    return NextResponse.next()
  }

  const supabase = await createServerClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user && !error
  const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname)

  
  // 2. BLOCK AUTH PAGES FOR LOGGED-IN USERS
  
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  
  // 3. ALLOW PUBLIC AUTH PAGES
  
  if (isAuthPage) {
    return NextResponse.next()
  }

  
  // 4. GLOBAL PROTECTED ROUTES
  
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  
  // 5. EXISTING ADMIN ROLE GUARD
  
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

  return NextResponse.next()
}