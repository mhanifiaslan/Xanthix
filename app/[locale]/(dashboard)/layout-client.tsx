'use client';

import { usePathname } from 'next/navigation';

export default function DashboardLayoutClient({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEditorPage = pathname?.includes('/editor');

  if (isEditorPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {sidebar}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
