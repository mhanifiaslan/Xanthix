// Project (the user's instance, not the template) — still mock until Sprint 3
// wires the /projects collection. ProjectType lives in ./projectType.ts.

export type ProjectStatus = 'taslak' | 'devam eden' | 'tamamlandi';

export interface ProjectFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx';
  size: string;
  updatedAt: string;
}

export interface ProjectSection {
  id: string;
  title: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  typeId: string;
  type: string;
  status: ProjectStatus;
  progress: number;
  lastModified: string;
  budget?: string;
  summary?: string;
  deadline?: string;
  teamMembers?: string[];
  files?: ProjectFile[];
  sections?: ProjectSection[];
}

export type { ProjectType, Section } from './projectType';
