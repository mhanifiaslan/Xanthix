export default function AdminLoading() {
  return (
    <div className="px-8 py-10 animate-pulse">
      <div className="h-8 w-1/4 max-w-xs bg-[var(--color-card)] rounded-xl" />
      <div className="mt-3 h-4 w-2/5 max-w-md bg-[var(--color-card)]/70 rounded-lg" />

      <div className="mt-10 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-[var(--color-card)] rounded-2xl border border-white/5"
          />
        ))}
      </div>
    </div>
  );
}
