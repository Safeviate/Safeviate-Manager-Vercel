import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const resolveCanonicalHost = () => {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  if (!configuredUrl) return '';

  try {
    return new URL(configuredUrl).host.toLowerCase();
  } catch {
    return '';
  }
};

export function middleware(request: NextRequest) {
  const canonicalHost = resolveCanonicalHost();
  const host = request.headers.get('host')?.toLowerCase() ?? '';
  const isVercelHost = host.endsWith('.vercel.app');
  const isCanonicalHost = canonicalHost && host === canonicalHost;

  if (canonicalHost && isVercelHost && !isCanonicalHost) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = canonicalHost;
    redirectUrl.protocol = 'https';
    redirectUrl.port = '';
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/|login).*)'],
};
