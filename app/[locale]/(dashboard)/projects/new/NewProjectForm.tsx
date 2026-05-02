'use client';

import { type FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { startProjectAction } from '@/lib/actions/projects';
import type { ProjectType, Section } from '@/types/projectType';
import type { Locale } from '@/i18n/routing';
import { projectTypeIcon } from '@/components/shared/ProjectTypeIcon';

type FieldValue = string | number | boolean;

interface OrgOption {
  id: string;
  name: string;
  tokenBalance: number;
}

export default function NewProjectForm({
  projectType,
  locale,
  orgs,
  preselectedOrgId,
}: {
  projectType: ProjectType;
  locale: string;
  orgs: OrgOption[];
  preselectedOrgId: string | null;
}) {
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [inputs, setInputs] = useState<
    Record<string, Record<string, FieldValue>>
  >({});
  const orgOnly = projectType.visibility === 'org_only';
  const [contextOrgId, setContextOrgId] = useState<string | ''>(() => {
    // Org-only types must run in an org context. Pre-select the requested
    // one when it's eligible, else the first eligible org.
    if (preselectedOrgId && orgs.some((o) => o.id === preselectedOrgId)) {
      return preselectedOrgId;
    }
    if (orgOnly && orgs.length > 0) return orgs[0].id;
    return '';
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const Icon = projectTypeIcon(projectType.iconName);
  const loc = locale as Locale;

  const sectionsRequiringInput = useMemo(
    () => projectType.sections.filter((s) => s.requiresUserInput),
    [projectType.sections],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (idea.trim().length < 20) {
      setError('Lütfen fikrinizi en az 20 karakterle anlatın.');
      return;
    }
    if (orgOnly && !contextOrgId) {
      setError('Bu proje türü kuruma özel — bir kurum seç.');
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
        setError(err instanceof Error ? err.message : 'Beklenmedik bir hata oluştu.');
      }
    });
  };

  const setField = (sectionId: string, fieldId: string, value: FieldValue) => {
    setInputs((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [fieldId]: value },
    }));
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center gap-4">
        <Link
          href={`/${locale}/project-types/${projectType.slug}`}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Yeni proje · {projectType.name[loc] ?? projectType.name.en}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Fikrini anlat, AI {projectType.sections.length} bölümü teker teker
            yazsın.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-8 py-8 max-w-3xl mx-auto space-y-8"
      >
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Proje fikrini anlat
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                Sorunu, çözüm önerini ve hedef kitleyi 2-3 cümleyle yaz.
                Detaylandırmak için maddeler de ekleyebilirsin.
              </p>
            </div>
          </div>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={8}
            required
            placeholder="Örn: Kırsal bölgelerdeki çiftçilerin sulamayı IoT sensörleri ve düşük maliyetli mikrodenetleyicilerle optimize ettiği, su tasarrufunu %30 hedefleyen bir akıllı sulama sistemi geliştirmek istiyoruz. Hedef kullanıcılar 5–50 dönüm arası işletmesi olan üreticiler."
            className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y"
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
            {idea.trim().length} / 20+ karakter
          </p>
        </div>

        {/* Context picker — personal vs each eligible org. */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            Bu proje hangi adına?
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Token bakiyesi seçtiğin tarafın cüzdanından düşer. Kurum seçersen
            proje, kurumun tüm üyeleri tarafından görüntülenebilir.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!orgOnly && (
              <ContextChoice
                selected={contextOrgId === ''}
                onSelect={() => setContextOrgId('')}
                icon={<User size={16} />}
                title="Kişisel"
                hint="Kendi token bakiyenden düşer"
              />
            )}
            {orgs.map((o) => (
              <ContextChoice
                key={o.id}
                selected={contextOrgId === o.id}
                onSelect={() => setContextOrgId(o.id)}
                icon={<Building2 size={16} />}
                title={o.name}
                hint={`${o.tokenBalance.toLocaleString(locale)} token bakiyesi`}
              />
            ))}
          </div>
          {orgs.length === 0 && orgOnly && (
            <p className="text-xs text-[var(--color-warning)] mt-3">
              Bu proje türü kuruma özel ve henüz hiçbir kuruma üye değilsin.
              Önce bir kurum oluştur veya bir kuruma davet edilmeyi bekle.
            </p>
          )}
        </div>

        {sectionsRequiringInput.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Birkaç ek bilgi
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]/70 mt-1">
                AI, aşağıdaki cevaplarını ilgili bölümleri yazarken kullanacak.
              </p>
            </div>
            {sectionsRequiringInput.map((s) => (
              <SectionInputCard
                key={s.id}
                section={s}
                locale={loc}
                values={inputs[s.id] ?? {}}
                onChange={(fieldId, value) => setField(s.id, fieldId, value)}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 sticky bottom-4 bg-[var(--color-background)]/90 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {projectType.sections.length} bölüm üretilecek · Yaklaşık birkaç
            dakika sürer.
          </p>
          <button
            type="submit"
            disabled={isPending || idea.trim().length < 20}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {isPending ? 'Başlatılıyor…' : 'Üretmeye başla'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionInputCard({
  section,
  locale,
  values,
  onChange,
}: {
  section: Section;
  locale: Locale;
  values: Record<string, FieldValue>;
  onChange: (fieldId: string, value: FieldValue) => void;
}) {
  const fields = section.userInputSchema?.fields ?? [];
  if (fields.length === 0) return null;

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {section.title[locale] ?? section.title.en}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {section.description[locale] ?? section.description.en}
        </p>
      </div>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              {f.label[locale] ?? f.label.en}
              {f.required && <span className="text-[var(--color-error)] ml-1">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={(values[f.id] as string) ?? ''}
                placeholder={f.placeholder?.[locale] ?? f.placeholder?.en}
                onChange={(e) => onChange(f.id, e.target.value)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y"
              />
            ) : f.type === 'select' ? (
              <select
                value={(values[f.id] as string) ?? ''}
                onChange={(e) => onChange(f.id, e.target.value)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              >
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label[locale] ?? o.label.en}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={(values[f.id] as string | number) ?? ''}
                placeholder={f.placeholder?.[locale] ?? f.placeholder?.en}
                onChange={(e) =>
                  onChange(
                    f.id,
                    f.type === 'number' ? Number(e.target.value) : e.target.value,
                  )
                }
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextChoice({
  selected,
  onSelect,
  icon,
  title,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ' +
        (selected
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40'
          : 'bg-[var(--color-background)] border-white/10 hover:border-white/20')
      }
    >
      <span
        className={
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ' +
          (selected
            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
            : 'bg-white/5 text-[var(--color-text-secondary)]')
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={
            'text-sm font-medium truncate ' +
            (selected
              ? 'text-[var(--color-accent)]'
              : 'text-[var(--color-text-primary)]')
          }
        >
          {title}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {hint}
        </p>
      </div>
    </button>
  );
}
