import {
  Building2,
  FolderGit2,
  GraduationCap,
  Microscope,
  Rocket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Building2,
  FolderGit2,
  GraduationCap,
  Microscope,
  Rocket,
  Sparkles,
};

export function projectTypeIcon(name: string | undefined): LucideIcon {
  if (!name) return FolderGit2;
  return ICONS[name] ?? FolderGit2;
}
