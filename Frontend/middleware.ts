import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const jwt = request.cookies.get('jwtToken')
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isHomePage = request.nextUrl.pathname === '/'

  if (!jwt && isHomePage) {
    // Not authenticated, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (jwt && isLoginPage) {
    // Already authenticated, redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }
  // Allow request
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login'],
}
