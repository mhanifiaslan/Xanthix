import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getServerSession } from '@/lib/server/getServerSession';
import { routing } from '@/i18n/routing';
import LandingHero from '@/components/landing/LandingHero';

export const dynamic = 'force-dynamic';

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Authenticated visitors don't see the landing — they go straight to their
  // dashboard home. Unauthed visitors fall through to the marketing page.
  const session = await getServerSession();
  if (session) redirect(`/${locale}/home`);

  return <LandingHero />;
}
