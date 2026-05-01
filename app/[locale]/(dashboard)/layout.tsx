import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/getServerSession';
import DashboardLayoutClient from './layout-client';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login`);

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
