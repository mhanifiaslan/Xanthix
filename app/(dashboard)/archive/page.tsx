import ComingSoon from "@/components/shared/ComingSoon";

export default function ArchivePage() {
  return (
    <div className="min-h-full">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Arsiv</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Arsivledigin projeler burada gorunur.</p>
      </header>
      <div className="h-[calc(100vh-120px)]">
        <ComingSoon
          title="Arsiv ozelligi yakin zamanda geliyor"
          description="Projelerinizi arsivleyerek aktif listenizi duzenleyebileceksiniz. Arsivlenen projeler 90 gun boyunca saklanir."
        />
      </div>
    </div>
  );
}
