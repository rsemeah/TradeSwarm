import { isLocalDevBypassEnabled } from '@/lib/env/devBypass'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if (isLocalDevBypassEnabled() && request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
