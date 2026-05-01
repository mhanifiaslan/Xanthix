/**
 * Yeni Proje Oluşturma Modalı
 *
 * Kullanıcı bir proje türü kartına tıkladığında açılan tam ekran modal.
 * ProjectWizard bileşenini barındırır ve tamamlanma sonrası proje editörüne yönlendirir.
 *
 * @module components/dashboard/NewProjectModal
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, GraduationCap, Microscope, Building2 } from "lucide-react";
import { ProjectType } from "@/types";
import ProjectWizard from "./ProjectWizard";
import { mockProjects } from "@/lib/mock-data";

const iconMap: Record<string, React.ElementType> = {
  GraduationCap,
  Microscope,
  Building2,
};

interface NewProjectModalProps {
  projectType: ProjectType;
  onClose: () => void;
}

/**
 * Proje oluşturma modalı.
 *
 * @param projectType - Seçilen proje türü şablonu
 * @param onClose - Modal kapandığında çağrılacak callback
 */
export default function NewProjectModal({ projectType, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const IconComponent = iconMap[projectType.icon] ?? GraduationCap;

  /**
   * Sihirbaz tamamlandığında projeyi mock listeye ekler ve editöre yönlendirir.
   */
  const handleComplete = useCallback(
    (projectName: string, fullContent: string) => {
      // Mock: Yeni proje oluştur ve listeye ekle
      const newProjectId = `p-${Date.now()}`;
      const newProject = {
        id: newProjectId,
        name: projectName || projectType.name,
        typeId: projectType.id,
        type: projectType.name,
        status: "taslak" as const,
        progress: 0,
        lastModified: "Az önce",
        budget: projectType.budget,
        summary: fullContent.slice(0, 200) + "...",
        teamMembers: ["Kullanıcı"],
        sections: fullContent.split("\n\n---\n\n").map((chunk, i) => {
          const lines = chunk.split("\n");
          const title = lines[0].replace(/^#+ /, "") || `Bölüm ${i + 1}`;
          const content = lines.slice(1).join("\n").trim();
          return { id: `s-${i}`, title, content };
        }),
      };

      // Runtime'da mock listeye ekle (gerçek DB olmadığı için)
      mockProjects.unshift(newProject);

      onClose();
      router.push(`/projects/${newProjectId}/editor`);
    },
    [projectType, router, onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[var(--color-background)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
              <IconComponent size={20} />
            </div>
            <div>
              <h2
                id="new-project-modal-title"
                className="text-base font-bold text-[var(--color-text-primary)]"
              >
                {projectType.name}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {projectType.description} · ~{projectType.credits} kredi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Wizard */}
        <div className="flex-1 overflow-hidden">
          <ProjectWizard
            projectType={projectType}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
