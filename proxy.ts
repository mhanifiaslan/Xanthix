import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16: this file is `proxy.ts` (formerly `middleware.ts`).
// Responsibilities:
//   1. Detect / persist the user's preferred locale via Accept-Language + cookie.
//   2. Redirect bare paths (/) to the localized equivalent.
//   3. Presence-check the session cookie on protected paths and bounce the
//      user to /login if it's missing. Real verification happens in the
//      protected layout via `getServerSession()` — this is just defense in
//      depth that avoids a wasted server render.
const handleI18n = createIntlMiddleware(routing);

const SESSION_COOKIE = '__session';

const PUBLIC_PATHS = new Set([
  '',
  'login',
  'register',
  'forgot',
]);

// Cloud Run / Firebase App Hosting forwards traffic to the container on
// PORT=8080. Without normalization, Next.js bakes that internal port into
// `request.url`, which then leaks into every redirect Location header — so
// the browser ends up at https://host:8080/... and times out. Strip these
// out of any 3xx Location header before returning the response.
const INTERNAL_PORTS = new Set(['8080', '3000']);

function firstSegmentAfterLocale(pathname: string): string {
  // pathname is always like "/{locale}/..." after the i18n middleware.
  const parts = pathname.split('/').filter(Boolean);
  return parts[1] ?? '';
}

function isPublicPath(pathname: string) {
  const seg = firstSegmentAfterLocale(pathname);
  return PUBLIC_PATHS.has(seg);
}

function isAdminPath(pathname: string) {
  return firstSegmentAfterLocale(pathname) === 'admin';
}

function publicOriginFromHeaders(request: NextRequest): {
  host: string | null;
  proto: string | null;
} {
  // Cloud Run / load balancers set these. Use them as the source of truth
  // when present.
  return {
    host: request.headers.get('x-forwarded-host'),
    proto: request.headers.get('x-forwarded-proto'),
  };
}

function normalizeRedirect(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  if (response.status < 300 || response.status >= 400) return response;

  const location = response.headers.get('location');
  if (!location) return response;

  let url: URL;
  try {
    // Location may be relative; resolve against the current request URL.
    url = new URL(location, request.url);
  } catch {
    return response;
  }

  const { host: forwardedHost, proto: forwardedProto } =
    publicOriginFromHeaders(request);

  let mutated = false;
  if (forwardedHost && url.host !== forwardedHost) {
    url.host = forwardedHost;
    mutated = true;
  }
  if (forwardedProto && url.protocol !== `${forwardedProto}:`) {
    url.protocol = `${forwardedProto}:`;
    mutated = true;
  }
  // Defensive: if there's still an internal port after applying the
  // forwarded host, drop it. Do not drop in local development.
  if (process.env.NODE_ENV !== 'development' && INTERNAL_PORTS.has(url.port)) {
    url.port = '';
    mutated = true;
  }

  if (!mutated) return response;
  response.headers.set('location', url.toString());
  return response;
}

export default function proxy(request: NextRequest) {
  const intlResponse = handleI18n(request);

  // After i18n, `intlResponse` is either a redirect to add the locale prefix
  // or a passthrough rewrite. We only enforce auth on the latter.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return normalizeRedirect(intlResponse, request);
  }

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return intlResponse;

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    // Preserve target so the login page can bounce back after auth.
    const locale = pathname.split('/').filter(Boolean)[0] ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    if (pathname !== `/${locale}/login`) {
      loginUrl.searchParams.set('next', pathname);
    }
    // Strip internal port + apply forwarded origin before returning.
    const { host: forwardedHost, proto: forwardedProto } =
      publicOriginFromHeaders(request);
    if (forwardedHost) loginUrl.host = forwardedHost;
    if (forwardedProto) loginUrl.protocol = `${forwardedProto}:`;
    if (process.env.NODE_ENV !== 'development' && INTERNAL_PORTS.has(loginUrl.port)) {
      loginUrl.port = '';
    }
    return NextResponse.redirect(loginUrl);
  }

  // Admin paths additionally need the cookie to exist; the deeper role check
  // happens in app/[locale]/admin/layout.tsx.
  void isAdminPath; // reserved for upcoming role-aware redirects

  return intlResponse;
}

export const config = {
  // Skip Next.js internals, API routes, static files, and the favicon.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
