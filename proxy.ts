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

export default function proxy(request: NextRequest) {
  const intlResponse = handleI18n(request);

  // After i18n, `intlResponse` is either a redirect to add the locale prefix
  // or a passthrough rewrite. We only enforce auth on the latter.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
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
