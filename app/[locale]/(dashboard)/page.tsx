"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectTypeCard from "@/components/dashboard/ProjectTypeCard";
import RecentProjectCard from "@/components/dashboard/RecentProjectCard";
import ProjectsTable from "@/components/dashboard/ProjectsTable";
import NewProjectModal from "@/components/dashboard/NewProjectModal";
import { projectTypes, mockProjects } from "@/lib/mock-data";
import { ProjectType } from "@/types";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const recentProjects = mockProjects.slice(0, 4);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);

  return (
    <div className="min-h-full pb-12">
      <DashboardHeader />

      <main className="px-8 max-w-7xl mx-auto mt-8">

        {/* Yeni Proje Başlat Bölümü */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
            Yeni Proje Başlat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectTypes.map((type) => (
              <ProjectTypeCard
                key={type.id}
                type={type}
                onSelect={setSelectedProjectType}
              />
            ))}
          </div>
        </section>

        {/* Son Çalıştığın Projeler Bölümü */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Son Çalıştığın Projeler
            </h2>
            <button className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
              Tümünü gör <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
            {recentProjects.map((project) => (
              <div key={project.id} className="snap-start">
                <RecentProjectCard project={project} />
              </div>
            ))}
          </div>
        </section>

        {/* Tüm Projelerim Bölümü */}
        <section>
          <ProjectsTable projects={mockProjects} />
        </section>

      </main>

      {/* Proje Oluşturma Modalı */}
      {selectedProjectType && (
        <NewProjectModal
          projectType={selectedProjectType}
          onClose={() => setSelectedProjectType(null)}
        />
      )}
    </div>
  );
}
