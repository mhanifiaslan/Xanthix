"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types";
import { MoreHorizontal, FileText, CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectsTableProps {
  projects: Project[];
}

type FilterType = 'Tümü' | 'Devam Edenler' | 'Taslaklar' | 'Tamamlananlar';

const tabs: FilterType[] = ['Tümü', 'Devam Edenler', 'Taslaklar', 'Tamamlananlar'];

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  const [activeTab, setActiveTab] = useState<FilterType>('Tümü');
  const router = useRouter();

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'Tümü') return true;
    if (activeTab === 'Devam Edenler' && project.status === 'devam eden') return true;
    if (activeTab === 'Taslaklar' && project.status === 'taslak') return true;
    if (activeTab === 'Tamamlananlar' && project.status === 'tamamlandi') return true;
    return false;
  });

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case "tamamlandi":
        return (
          <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-medium border border-[var(--color-success)]/20">
            <CheckCircle2 size={12} /> Tamamlandı
          </span>
        );
      case "devam eden":
        return (
          <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md bg-[var(--color-warning)]/10 text-[var(--color-warning)] text-xs font-medium border border-[var(--color-warning)]/20">
            <CircleDashed size={12} /> Devam Eden
          </span>
        );
      case "taslak":
      default:
        return (
          <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md bg-white/5 text-[var(--color-text-secondary)] text-xs font-medium border border-white/10">
            <FileText size={12} /> Taslak
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden mt-8">
      <div className="px-6 pt-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Tüm Projelerim
        </h2>
        <div className="flex space-x-1 p-1 bg-[var(--color-background)] rounded-lg border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === tab
                  ? "bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-[var(--color-sidebar)]/50">
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Proje Adı</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Tür</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Durum</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">İlerleme</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Son Güncelleme</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProjects.map((project) => (
              <tr
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors flex items-center gap-2">
                    {project.name}
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {project.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(project.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-[var(--color-background)] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          project.progress === 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"
                        )}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] tabular-nums">
                      %{project.progress}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {project.lastModified}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] rounded-md transition-colors"
                    aria-label="Daha fazla işlem"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProjects.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-secondary)] text-sm">
            Bu kategoride proje bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
