import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'safeviate-manager.vercel.app';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase() ?? '';
  const isVercelHost = host.endsWith('.vercel.app');
  const isCanonicalHost = host === CANONICAL_HOST;

  if (isVercelHost && !isCanonicalHost) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = CANONICAL_HOST;
    redirectUrl.protocol = 'https';
    redirectUrl.port = '';
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
