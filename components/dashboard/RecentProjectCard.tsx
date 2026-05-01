"use client";

import { Project } from "@/types";
import { Clock, FileText, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentProjectCardProps {
  project: Project;
}

export default function RecentProjectCard({ project }: RecentProjectCardProps) {
  const getStatusIcon = () => {
    switch (project.status) {
      case "tamamlandi":
        return <CheckCircle2 size={16} className="text-[var(--color-success)]" />;
      case "devam eden":
        return <CircleDashed size={16} className="text-[var(--color-warning)]" />;
      case "taslak":
      default:
        return <FileText size={16} className="text-[var(--color-text-secondary)]" />;
    }
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors min-w-[300px] flex-shrink-0 cursor-pointer" onClick={() => console.log(`Proje aç: ${project.name}`)}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-sidebar)] text-[var(--color-text-secondary)] border border-white/5">
          {project.type}
        </span>
        {getStatusIcon()}
      </div>
      
      <h4 className="font-medium text-[var(--color-text-primary)] text-sm mb-4 line-clamp-2 min-h-[40px]">
        {project.name}
      </h4>

      <div className="space-y-3">
        <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1">
          <span>İlerleme</span>
          <span>%{project.progress}</span>
        </div>
        <div className="w-full bg-[var(--color-background)] rounded-full h-1.5 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full",
              project.progress === 100 ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)]"
            )}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] pt-2 border-t border-white/5">
          <Clock size={12} />
          <span>{project.lastModified}</span>
        </div>
      </div>
    </div>
  );
}
