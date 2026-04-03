/**
 * Returns the public base URL for the current deployment.
 *
 * Preference order:
 * 1. Explicit app URL set in Vercel
 * 2. Vercel's production hostname
 * 3. Vercel preview/runtime hostname
 * 4. Request headers / request origin as a final fallback
 */
export function getPublicBaseUrl(request: Request) {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const productionHostname = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHostname) {
    return `https://${productionHostname.replace(/\/$/, '')}`;
  }

  const runtimeHostname = process.env.VERCEL_URL?.trim();
  if (runtimeHostname) {
    return `https://${runtimeHostname.replace(/\/$/, '')}`;
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}
