import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get response
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Sblocca microfono solo dove serve (es. simulazione interrogazione), altrimenti nega.
  const allowMic =
    request.nextUrl.pathname.startsWith('/interrogazione') ||
    request.nextUrl.pathname.startsWith('/api/interrogazione') ||
    request.nextUrl.pathname.startsWith('/compiti');
  response.headers.set('Permissions-Policy', `camera=(), microphone=(${allowMic ? 'self' : ''}), geolocation=()`)

  // Add caching headers for static assets
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('/images/') ||
    request.nextUrl.pathname.includes('.webp')
  ) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    )
  }

  // Add preload headers for critical assets
  if (request.nextUrl.pathname.includes('/[lezione]')) {
    response.headers.set(
      'Link',
      '</media/KaTeX_Main-Regular.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous, </media/KaTeX_Math-Italic.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous'
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
