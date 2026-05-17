// /middleware.ts

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function proxy(req: Request) {
  const url = new URL(req.url)

  if (!url.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const supabase = await createServerClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: role } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}