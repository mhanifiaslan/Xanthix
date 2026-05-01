/**
 * Proje Türü Kartı
 *
 * Dashboard'da listelenen proje türlerini kart olarak gösterir.
 * Tıklandığında yeni proje oluşturma modalını açar.
 *
 * @module components/dashboard/ProjectTypeCard
 */

"use client";

import { ProjectType } from "@/types";
import { GraduationCap, Microscope, Building2, Plus } from "lucide-react";
import React from "react";

interface ProjectTypeCardProps {
  type: ProjectType;
  onSelect: (type: ProjectType) => void;
}

const iconMap: Record<string, React.ElementType> = {
  GraduationCap,
  Microscope,
  Building2,
};

export default function ProjectTypeCard({ type, onSelect }: ProjectTypeCardProps) {
  const IconComponent = iconMap[type.icon] || GraduationCap;

  return (
    <div
      id={`project-type-card-${type.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(type)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(type)}
      className="group relative bg-[var(--color-card)] hover:bg-[#1f2125] p-6 rounded-2xl border border-white/5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--color-accent)]/10"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-white/10 flex items-center justify-center text-[var(--color-accent)] group-hover:scale-110 transition-transform">
          <IconComponent size={24} />
        </div>
        <div className="bg-[var(--color-sidebar)] px-2.5 py-1 rounded-full border border-white/5 text-xs font-medium text-[var(--color-text-secondary)]">
          ~{type.credits} kredi
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-accent)] transition-colors">
        {type.name}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4">
        {type.description}
      </p>

      <div className="flex items-center text-[var(--color-accent)] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus size={16} className="mr-1" /> Başlat
      </div>
    </div>
  );
}
