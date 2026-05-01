import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getServerSession } from '@/lib/server/getServerSession';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (session.role !== 'admin' && session.role !== 'super_admin') {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
