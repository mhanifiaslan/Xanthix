'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function UserCard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const initial = (user.name ?? user.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="group flex items-center justify-between p-4 mb-4 rounded-xl transition-colors hover:bg-[var(--color-card)]">
      <div className="flex items-center gap-3 min-w-0">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.name ?? user.email ?? ''}
            className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
            {initial}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {user.name ?? user.email?.split('@')[0]}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)] truncate">
            {user.email}
          </span>
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0"
        aria-label="Sign out"
        onClick={handleSignOut}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
