"use client";

import { useState } from "react";
import { projectTypes } from "@/lib/mock-data";
import { mockProjects } from "@/lib/mock-data";
import { GraduationCap, Microscope, Building2, Plus, Edit2, Eye, EyeOff, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const iconMap: Record<string, React.ElementType> = {
  GraduationCap, Microscope, Building2,
};

export default function AdminProjectTypesPage() {
  const [types, setTypes] = useState(projectTypes.map((t) => ({ ...t, active: true })));

  const toggleActive = (id: string) => {
    setTypes((prev) => prev.map((t) => t.id === id ? { ...t, active: !t.active } : t));
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Proje Turleri</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Platforma entegre edilmis proje turlerini yonetin
          </p>
        </div>
        <Link
          href="/admin/project-types/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} />
          Yeni Tur Ekle
        </Link>
      </header>

      <div className="px-8 py-8 max-w-6xl mx-auto space-y-6">

        {/* Ozet satiri */}
        <div className="grid grid-cols-3 gap-4">
          {types.map((t) => {
            const Icon = iconMap[t.icon] || GraduationCap;
            const count = mockProjects.filter((p) => p.typeId === t.id).length;
            return (
              <div key={t.id} className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{count} proje olusturulmus</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kart Listesi */}
        <div className="space-y-4">
          {types.map((type) => {
            const Icon = iconMap[type.icon] || GraduationCap;
            const projectCount = mockProjects.filter((p) => p.typeId === type.id).length;

            return (
              <div
                key={type.id}
                className={cn(
                  "bg-[var(--color-card)] rounded-2xl border p-6 transition-all",
                  type.active ? "border-white/5" : "border-white/5 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                      type.active
                        ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20"
                        : "bg-white/5 border-white/10"
                    )}>
                      <Icon size={20} className={type.active ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{type.name}</h2>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          type.active
                            ? "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20"
                            : "text-[var(--color-text-secondary)] bg-white/5 border-white/10"
                        )}>
                          {type.active ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-3">
                        <span className="text-xs bg-[var(--color-background)] border border-white/5 px-3 py-1 rounded-full text-[var(--color-text-secondary)]">
                          Butce: {type.budget}
                        </span>
                        <span className="text-xs bg-[var(--color-background)] border border-white/5 px-3 py-1 rounded-full text-[var(--color-text-secondary)]">
                          Maliyet: ~{type.credits} kredi
                        </span>
                        <span className="text-xs bg-[var(--color-background)] border border-white/5 px-3 py-1 rounded-full text-[var(--color-text-secondary)]">
                          {projectCount} proje
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => console.log("Duzenle:", type.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
                    >
                      <Edit2 size={12} /> Duzenle
                    </button>
                    <button
                      onClick={() => toggleActive(type.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                        type.active
                          ? "bg-[var(--color-error)]/5 border-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                          : "bg-[var(--color-success)]/5 border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                      )}
                    >
                      {type.active ? <><EyeOff size={12} /> Pasife Al</> : <><Eye size={12} /> Aktife Al</>}
                    </button>
                  </div>
                </div>

                {/* Bolum listesi */}
                <div className="mt-5 pt-5 border-t border-white/5">
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                    Proje Bolum Yapisi
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {type.steps && type.steps.length > 0 ? (
                      type.steps.map((step) => (
                        <span
                          key={step.id}
                          className="text-xs bg-[var(--color-background)] border border-white/5 px-2.5 py-1 rounded-lg text-[var(--color-text-secondary)] flex items-center gap-1"
                        >
                          <span className="w-4 h-4 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-bold flex items-center justify-center">
                            {step.order}
                          </span>
                          {step.title}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--color-text-secondary)] italic">
                        Henuz adim eklenmemis
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
