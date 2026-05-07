/**
 * Server-component fallback shown while a (dashboard) page is rendering on
 * the server. Keeps the chrome (sidebar) intact and just animates a
 * lightweight content skeleton so navigation feels instant even when the
 * underlying server fetch takes a beat.
 */
export default function DashboardLoading() {
  return (
    <div className="px-8 py-10 animate-pulse">
      <div className="h-8 w-1/3 max-w-sm bg-[var(--color-card)] rounded-xl" />
      <div className="mt-3 h-4 w-1/2 max-w-md bg-[var(--color-card)]/70 rounded-lg" />

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 bg-[var(--color-card)] rounded-3xl border border-white/5"
          />
        ))}
      </div>
    </div>
  );
}
