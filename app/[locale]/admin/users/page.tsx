'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AdminUserView {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  disabled: boolean;
  tokenBalance: number;
  projectCount: number;
  createdAt: string | null;
  lastSignInAt: string | null;
}

async function fetchUsers(): Promise<AdminUserView[]> {
  const res = await fetch('/api/admin/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusOptions = ['Tümü', 'Aktif', 'Pasif'];

  const filtered = users.filter((u) => {
    const matchSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'Tümü' ||
      (statusFilter === 'Aktif' && !u.disabled) ||
      (statusFilter === 'Pasif' && u.disabled);
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Kullanıcılar</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {loading ? 'Yükleniyor…' : `Toplam ${users.length} kullanıcı`}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors">
          <UserPlus size={15} />
          Kullanıcı Ekle
        </button>
      </header>

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-5">

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad veya email ile ara..."
              className="w-full bg-[var(--color-card)] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            />
          </div>
          <div className="flex gap-2">
            {statusOptions.map((p) => (
              <button
                key={p}
                onClick={() => setStatusFilter(p)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  statusFilter === p
                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                    : 'bg-[var(--color-card)] border-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/10'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
                {['Kullanıcı', 'Token Bakiyesi', 'Proje', 'Son Giriş', 'Durum'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-[var(--color-text-secondary)]">
                    Yükleniyor…
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr
                  key={user.uid}
                  onClick={() => router.push(`admin/users/${user.uid}`)}
                  className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] shrink-0">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.displayName}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                    {user.tokenBalance.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-[var(--color-text-primary)]">
                    {user.projectCount}
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--color-text-secondary)]">
                    {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-full border',
                      user.disabled
                        ? 'text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20'
                        : 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20'
                    )}>
                      {user.disabled ? 'Pasif' : 'Aktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--color-text-secondary)]">
              Sonuç bulunamadı.
            </div>
          )}
        </div>

        {/* Özet */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Aktif', value: users.filter((u) => !u.disabled).length, color: 'text-[var(--color-success)]' },
            { label: 'Pasif', value: users.filter((u) => u.disabled).length, color: 'text-[var(--color-error)]' },
            { label: 'Toplam', value: users.length, color: 'text-[var(--color-accent)]' },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 text-center">
              <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
