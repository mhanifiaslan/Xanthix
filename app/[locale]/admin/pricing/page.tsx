'use client';

import { useState } from 'react';
import { PricingPackage } from '@/types/admin';
import { Plus, Edit2, Star, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// TODO: Load from Firestore `pricingConfig` collection via server action.
const DEFAULT_PACKAGES: PricingPackage[] = [];

export default function AdminPricingPage() {
  const [packages, setPackages] = useState<PricingPackage[]>(DEFAULT_PACKAGES);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PricingPackage>>({});


  const toggleActive = (id: string) => {
    setPackages((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const togglePopular = (id: string) => {
    setPackages((prev) =>
      prev.map((p) => ({ ...p, isPopular: p.id === id ? !p.isPopular : false }))
    );
  };

  const startEdit = (pkg: PricingPackage) => {
    setEditing(pkg.id);
    setEditData({ price: pkg.price, credits: pkg.credits, bonus: pkg.bonus });
  };

  const saveEdit = (id: string) => {
    setPackages((prev) => prev.map((p) => p.id === id ? { ...p, ...editData } : p));
    setEditing(null);
  };

  const totalRevenue = packages.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Fiyatlandirma</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Kredi paketlerini ve kampanyalari yonetin</p>
        </div>
        <button
          onClick={() => console.log("Yeni paket ekle")}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          Yeni Paket
        </button>
      </header>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

        {/* Paket Kartlari */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "bg-[var(--color-card)] rounded-2xl border p-6 transition-all relative",
                pkg.isPopular ? "border-[var(--color-accent)]/40" : "border-white/5",
                !pkg.isActive && "opacity-50"
              )}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 left-6 flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[var(--color-accent)] text-white rounded-full">
                  <Star size={10} fill="white" /> En Populer
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{pkg.name}</h2>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border",
                    pkg.isActive
                      ? "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20"
                      : "text-[var(--color-error)] bg-[var(--color-error)]/10 border-[var(--color-error)]/20"
                  )}>
                    {pkg.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(pkg)}
                    className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors"
                    title="Duzenle"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(pkg.id)}
                    className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                    title={pkg.isActive ? "Pasife al" : "Aktife al"}
                  >
                    {pkg.isActive ? <ToggleRight size={18} className="text-[var(--color-success)]" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>

              {editing === pkg.id ? (
                /* Inline edit formu */
                <div className="space-y-3 mb-4">
                  {[
                    { label: "Fiyat (TL)", key: "price" as const },
                    { label: "Kredi", key: "credits" as const },
                    { label: "Bonus Kredi", key: "bonus" as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">{label}</label>
                      <input
                        type="number"
                        value={editData[key] ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, [key]: Number(e.target.value) }))}
                        className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(pkg.id)} className="flex-1 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-lg transition-colors">
                      Kaydet
                    </button>
                    <button onClick={() => setEditing(null)} className="flex-1 py-2 border border-white/10 text-[var(--color-text-secondary)] text-sm rounded-lg hover:border-white/20 transition-colors">
                      Iptal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold tabular-nums text-[var(--color-text-primary)]">
                      {pkg.credits.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">kredi</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-success)] mb-2">
                      <Zap size={11} fill="currentColor" />
                      +{pkg.bonus} bonus kredi dahil
                    </div>
                  )}
                  <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-3">
                    {pkg.price === 0 ? "Ucretsiz" : `${pkg.price.toLocaleString("tr-TR")} TL`}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => togglePopular(pkg.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                    pkg.isPopular
                      ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20"
                      : "text-[var(--color-text-secondary)] border-white/10 hover:border-white/20"
                  )}
                >
                  <Star size={11} className={pkg.isPopular ? "fill-current" : ""} />
                  {pkg.isPopular ? "En Populer" : "Populer Yap"}
                </button>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {pkg.price > 0 ? `${(pkg.price / pkg.credits).toFixed(2)} TL/kredi` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Toplam bilgisi */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Paket Ozeti</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-[var(--color-background)] rounded-xl border border-white/5 p-4">
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">{pkg.name}</p>
                <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                  {pkg.credits} kredi
                </p>
                <p className="text-xs text-[var(--color-accent)] mt-1">
                  {pkg.price === 0 ? "Ucretsiz" : `${pkg.price} TL`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Kampanya kodlari — Yakinda */}
        <div className="bg-[var(--color-card)]/50 rounded-2xl border border-white/5 border-dashed p-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Kampanya ve Indirim Kodlari</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Bu ozellik yakin zamanda eklenecek.</p>
          <span className="mt-3 inline-block px-3 py-1 text-xs font-bold bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full uppercase tracking-wide">
            Yakinida
          </span>
        </div>

      </div>
    </div>
  );
}
