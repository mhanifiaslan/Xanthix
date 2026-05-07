'use client';

import { type FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Sparkles,
  User as UserIcon,
  Wand2,
} from 'lucide-react';
import { startProjectAction, enhanceIdeaAction } from '@/lib/actions/projects';
import type { Locale } from '@/i18n/routing';

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';
type FieldValue = string | number | boolean;

interface FieldDef {
  id: string;
  label: string;
  placeholder: string;
  type: FieldType;
  required: boolean;
  options: { value: string; label: string }[];
}

interface SectionDef {
  id: string;
  title: string;
  requiresUserInput: boolean;
  fields: FieldDef[];
}

interface ProjectTypeDef {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  tier: string;
  visibility: 'public' | 'org_only';
  sections: SectionDef[];
}

interface OrgOption {
  id: string;
  name: string;
  tokenBalance: number;
}

interface Props {
  locale: string;
  projectType: ProjectTypeDef;
  orgs: OrgOption[];
  preselectedOrgId: string | null;
  initialPrompt: string;
}

/**
 * Notion-AI–style single-prompt starter. The user lands here after clicking
 * a template card; they paste/type their idea, optionally fill any
 * structured fields the template requires, pick a workspace, and hit Start.
 */
export default function SimpleStartForm({
  locale,
  projectType,
  orgs,
  preselectedOrgId,
  initialPrompt,
}: Props) {
  const router = useRouter();
  const t = useTranslations('start');
  const tNew = useTranslations('newProject');
  const loc = locale as Locale;

  const orgOnly = projectType.visibility === 'org_only';
  const eligibleSections = projectType.sections.filter((s) => s.requiresUserInput && s.fields.length > 0);
  const showWorkspacePicker = orgs.length > 0;

  const [idea, setIdea] = useState(initialPrompt);
  const [inputs, setInputs] = useState<Record<string, Record<string, FieldValue>>>({});
  const [contextOrgId, setContextOrgId] = useState<string>(
    orgOnly ? orgs[0]?.id ?? '' : preselectedOrgId ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const setField = (sectionId: string, fieldId: string, value: FieldValue) => {
    setInputs((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [fieldId]: value },
    }));
  };

  const handleEnhance = async () => {
    if (idea.trim().length < 5) {
      setError(tNew('errorEnhanceTooShort'));
      return;
    }
    setError(null);
    setIsEnhancing(true);
    try {
      const { enhancedIdea } = await enhanceIdeaAction({
        idea: idea.trim(),
        outputLanguage: loc,
      });
      setIdea(enhancedIdea);
    } catch {
      setError(tNew('errorEnhanceFailed'));
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (idea.trim().length < 20) {
      setError(tNew('errorIdeaTooShort'));
      return;
    }
    if (orgOnly && !contextOrgId) {
      setError(tNew('errorOrgRequired'));
      return;
    }
    startTransition(async () => {
      try {
        const { projectId } = await startProjectAction(
          {
            projectTypeSlug: projectType.slug,
            idea: idea.trim(),
            userInputs: inputs,
            orgId: contextOrgId || undefined,
          },
          loc,
        );
        router.replace(`/${locale}/projects/${projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : tNew('errorGeneric'));
      }
    });
  };

  return (
    <main className="min-h-full pb-12">
      {/* Header */}
      <header className="px-6 lg:px-10 py-4 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/projects/start`}
          className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label={t('backTitle')}
        >
          <ArrowLeft size={16} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]/70">
            {projectType.tier}
          </p>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
            {projectType.name}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-6 lg:px-10 py-10 max-w-3xl mx-auto space-y-8">
        {/* Hero prompt */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {t('simpleHeading')}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {t('simpleSubheading')}
            </p>
          </div>
          <div className="bg-[var(--color-card)] border border-white/10 rounded-md focus-within:border-[var(--color-accent)]/40 transition-colors">
            <textarea
              value={idea}
              onChange={(e) => {
                setIdea(e.target.value);
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 320)}px`;
              }}
              rows={5}
              placeholder={tNew('ideaPlaceholder')}
              className="w-full resize-none bg-transparent px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleEnhance}
                disabled={isEnhancing || idea.trim().length < 5}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-gradient-to-r from-[var(--color-accent)]/10 to-[#6b4cff]/10 hover:from-[var(--color-accent)]/20 hover:to-[#6b4cff]/20 border border-[var(--color-accent)]/20 text-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {isEnhancing ? tNew('enhancing') : tNew('enhanceIdea')}
              </button>
              <span className="text-[11px] text-[var(--color-text-secondary)] tabular-nums">
                {tNew('characterCount', { count: idea.trim().length })}
              </span>
            </div>
          </div>
        </section>

        {/* Workspace selector */}
        {showWorkspacePicker && (
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70">
              {t('workspaceHeading')}
            </p>
            <div className="flex flex-wrap gap-2">
              {!orgOnly && (
                <WorkspaceChip
                  selected={contextOrgId === ''}
                  onClick={() => setContextOrgId('')}
                  icon={<UserIcon size={13} />}
                  label={t('personalContext')}
                />
              )}
              {orgs.map((o) => (
                <WorkspaceChip
                  key={o.id}
                  selected={contextOrgId === o.id}
                  onClick={() => setContextOrgId(o.id)}
                  icon={<Building2 size={13} />}
                  label={o.name}
                  meta={`${o.tokenBalance.toLocaleString(locale)} tokens`}
                />
              ))}
            </div>
          </section>
        )}

        {/* Optional structured fields */}
        {eligibleSections.length > 0 && (
          <section className="space-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]/70">
                {t('fieldsHeading')}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]/70 mt-0.5">
                {t('fieldsHint')}
              </p>
            </div>
            <div className="space-y-5">
              {eligibleSections.map((section) => (
                <div key={section.id} className="bg-[var(--color-card)]/40 border border-white/5 rounded-md p-4 space-y-3">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.fields.map((f) => (
                      <FieldInput
                        key={f.id}
                        field={f}
                        value={inputs[section.id]?.[f.id] ?? ''}
                        onChange={(v) => setField(section.id, f.id, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || idea.trim().length < 20}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors shadow-lg shadow-[var(--color-accent)]/20"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isPending ? t('submitting2') : t('simpleSubmit')}
          </button>
        </div>
      </form>
    </main>
  );
}

function WorkspaceChip({
  selected,
  onClick,
  icon,
  label,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ' +
        (selected
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
          : 'bg-[var(--color-card)] border-white/10 text-[var(--color-text-primary)] hover:border-white/20')
      }
    >
      {icon}
      <span>{label}</span>
      {meta && (
        <span className="text-[10px] text-[var(--color-text-secondary)]">{meta}</span>
      )}
    </button>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}) {
  const baseClass =
    'w-full bg-[var(--color-background)] border border-white/10 rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all';
  return (
    <div>
      <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
        {field.label}
        {field.required && <span className="text-[var(--color-error)] ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          rows={2}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} resize-y`}
        />
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
          }
          className={baseClass}
        />
      )}
    </div>
  );
}
