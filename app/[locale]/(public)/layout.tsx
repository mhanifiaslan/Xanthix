export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-[var(--color-background)] text-[var(--color-text-primary)] overflow-x-hidden">
      {children}
    </div>
  );
}
