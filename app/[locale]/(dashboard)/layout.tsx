import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/getServerSession';
import { listProjectTypes } from '@/lib/server/projectTypes';
import Sidebar from '@/components/dashboard/Sidebar';
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

  // Fetch up-front so the sidebar's "Yeni proje başla" group is populated
  // on the server pass — no client flash of stale state.
  const featuredTypes = await listProjectTypes({ orgIds: session.orgIds });
  const isAdmin = session.role === 'admin' || session.role === 'super_admin';

  return (
    <DashboardLayoutClient
      sidebar={
        <Sidebar
          featuredTypes={featuredTypes.slice(0, 4)}
          isAdmin={isAdmin}
        />
      }
    >
      {children}
    </DashboardLayoutClient>
  );
}
