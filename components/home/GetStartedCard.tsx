import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface GetStartedCardProps {
  href: string;
  icon: LucideIcon;
  iconWrapClassName?: string;
  iconClassName?: string;
  title: string;
  subtitle?: string;
}

export default function GetStartedCard({
  href,
  icon: Icon,
  iconWrapClassName,
  iconClassName,
  title,
  subtitle,
}: GetStartedCardProps) {
  return (
    <Link
      href={href}
      className="group relative bg-[var(--color-card)]/70 hover:bg-[var(--color-card)] border border-white/5 hover:border-white/15 rounded-md p-4 transition-all duration-200 flex flex-col gap-3 min-h-[110px]"
    >
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center transition-transform group-hover:scale-105 ${
          iconWrapClassName ?? 'bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 border border-white/10'
        }`}
      >
        <Icon
          size={16}
          className={iconClassName ?? 'text-[var(--color-accent)]'}
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
