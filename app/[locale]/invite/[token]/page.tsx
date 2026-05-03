import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { previewInvitationAction } from '@/lib/actions/organizations';
import { getServerSession } from '@/lib/server/getServerSession';
import { routing } from '@/i18n/routing';
import InviteAcceptClient from './InviteAcceptClient';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const preview = await previewInvitationAction(token);
  const session = await getServerSession();

  return (
    <InviteAcceptClient
      locale={locale}
      token={token}
      preview={preview}
      currentUserEmail={session?.email ?? null}
      currentUserUid={session?.uid ?? null}
    />
  );
}
