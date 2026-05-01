import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr', 'es'] as const,
  defaultLocale: 'en',
  // Always include the locale prefix, even for the default locale.
  // This keeps URLs deterministic and SEO consistent across markets.
  localePrefix: 'always',
  // Auto-detect the locale from the Accept-Language header for first visits.
  // Subsequent visits respect the NEXT_LOCALE cookie set by next-intl.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
