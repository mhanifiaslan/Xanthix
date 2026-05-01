import ProjectsTable from "@/components/dashboard/ProjectsTable";
import { mockProjects } from "@/lib/mock-data";
import { FolderGit2 } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="min-h-full pb-12">
      <header className="flex items-center justify-between py-6 px-8 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <FolderGit2 size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Projelerim</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Toplam {mockProjects.length} proje
            </p>
          </div>
        </div>
      </header>

      <main className="px-8 max-w-7xl mx-auto mt-8">
        <ProjectsTable projects={mockProjects} />
      </main>
    </div>
  );
}
