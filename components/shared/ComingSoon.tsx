import { Clock } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({
  title = "Yakin zamanda geliyor",
  description = "Bu ozellik uzerinde calısiyoruz. Kısa sureicinde kullanima acılacak.",
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mb-4">
        <Clock size={24} className="text-[var(--color-accent)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-sm leading-relaxed">{description}</p>
      <span className="mt-4 px-3 py-1 text-xs font-medium rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)]">
        Yakında
      </span>
    </div>
  );
}
