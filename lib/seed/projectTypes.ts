import type { ProjectTypeWriteInput } from '@/types/projectType';

/**
 * Seed templates intentionally empty.
 *
 * The previous multilingual seed (TR/EN/ES triplets) was retired when the
 * schema moved to single-language strings. Production project types are now
 * authored through the admin builder (`/admin/project-types`) and the
 * categories defined under `/admin/categories`. Keep this export so
 * `scripts/seed-project-types.ts` still imports cleanly when run in fresh
 * environments — the script will simply create no documents.
 */
export const SEED_PROJECT_TYPES: ProjectTypeWriteInput[] = [];
