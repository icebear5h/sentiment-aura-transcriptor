import { auth } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export default auth((req: NextRequest & { auth: any }) => {
  const isLoggedIn = !!req.auth
  const isOnRecord = req.nextUrl.pathname.startsWith('/record')

  // Protect /record route
  if (isOnRecord && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
