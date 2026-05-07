import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy "/projects/new" route — superseded by "/projects/start" (the chat
 * onboarder). Forward any links / bookmarks through with the same query
 * string so existing flows don't 404.
 */
export default async function NewProjectRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; org?: string }>;
}) {
  const { locale } = await params;
  const { type, org } = await searchParams;
  const qs = new URLSearchParams();
  if (type) qs.set('type', type);
  if (org) qs.set('org', org);
  const target = qs.toString()
    ? `/${locale}/projects/start?${qs.toString()}`
    : `/${locale}/projects/start`;
  redirect(target);
}
