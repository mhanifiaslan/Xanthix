'use client';

import { type FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, Sparkles, User, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { startProjectAction, enhanceIdeaAction } from '@/lib/actions/projects';
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
  
  // Wizard State
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [idea, setIdea] = useState('');
  const [inputs, setInputs] = useState<Record<string, Record<string, FieldValue>>>({});
  
  const orgOnly = projectType.visibility === 'org_only';
  const [contextOrgId, setContextOrgId] = useState<string | ''>(() => {
    if (preselectedOrgId && orgs.some((o) => o.id === preselectedOrgId)) {
      return preselectedOrgId;
    }
    if (orgOnly && orgs.length > 0) return orgs[0].id;
    return '';
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const Icon = projectTypeIcon(projectType.iconName);
  const loc = locale as Locale;

  const sectionsRequiringInput = useMemo(
    () => projectType.sections.filter((s) => s.requiresUserInput),
    [projectType.sections],
  );

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (idea.trim().length < 20) {
        setError('Lütfen fikrinizi en az 20 karakterle anlatın.');
        return;
      }
      if (orgOnly && !contextOrgId) {
        setError('Bu proje türü kuruma özel — bir kurum seç.');
        return;
      }
      // If no sections require input, skip step 2
      if (sectionsRequiringInput.length === 0) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      // Validate required inputs
      for (const section of sectionsRequiringInput) {
        const fields = section.userInputSchema?.fields ?? [];
        for (const field of fields) {
          if (field.required) {
            const val = inputs[section.id]?.[field.id];
            if (val === undefined || val === null || val === '') {
              setError(`Lütfen "${section.title[loc] ?? section.title.en}" altındaki zorunlu alanları doldurun.`);
              return;
            }
          }
        }
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (step === 3 && sectionsRequiringInput.length === 0) {
      setStep(1);
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  };

  const handleEnhanceIdea = async () => {
    if (idea.trim().length < 5) {
      setError('Fikri geliştirmek için en azından birkaç kelime yazmalısın.');
      return;
    }
    setError(null);
    setIsEnhancing(true);
    try {
      const { enhancedIdea } = await enhanceIdeaAction({ idea: idea.trim(), outputLanguage: loc });
      setIdea(enhancedIdea);
    } catch (err) {
      setError('Fikir geliştirilirken bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
    <div className="min-h-full pb-12 bg-gradient-to-b from-[var(--color-background)] to-[#111111]">
      {/* Header */}
      <header className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/project-types/${projectType.slug}`}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              {projectType.name[loc] ?? projectType.name.en}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Yeni Proje Sihirbazı
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <StepIndicator currentStep={step} stepNumber={1} label="Fikir" />
          <div className={`w-8 h-px ${step >= 2 ? 'bg-[var(--color-accent)]' : 'bg-white/10'} transition-colors duration-500`} />
          <StepIndicator currentStep={step} stepNumber={2} label="Detaylar" />
          <div className={`w-8 h-px ${step >= 3 ? 'bg-[var(--color-accent)]' : 'bg-white/10'} transition-colors duration-500`} />
          <StepIndicator currentStep={step} stepNumber={3} label="Başlat" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-8 py-8 max-w-3xl mx-auto">
        
        {/* Step 1: Idea & Context */}
        <div className={`transition-all duration-500 ${step === 1 ? 'block opacity-100 translate-x-0' : 'hidden opacity-0 -translate-x-4'}`}>
          <div className="space-y-6">
            <div className="bg-[var(--color-card)] rounded-3xl border border-white/5 p-8 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                  <Icon size={24} className="text-[var(--color-accent)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Proje Fikrini Anlat</h2>
                    <button
                      type="button"
                      onClick={handleEnhanceIdea}
                      disabled={isEnhancing || idea.trim().length < 5}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[var(--color-accent)]/10 to-[#6b4cff]/10 hover:from-[var(--color-accent)]/20 hover:to-[#6b4cff]/20 border border-[var(--color-accent)]/30 rounded-full text-xs font-semibold text-[var(--color-accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />}
                      {isEnhancing ? 'Geliştiriliyor...' : 'Fikri Geliştir'}
                    </button>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Sorunu, çözüm önerini ve hedef kitleyi 2-3 cümleyle yaz. Sihirli değneğe tıklayarak yapay zekanın fikrini zenginleştirmesini sağlayabilirsin.
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={8}
                  placeholder="Örn: Kırsal bölgelerdeki çiftçilerin sulamayı IoT sensörleri ile optimize ettiği akıllı sulama sistemi..."
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-transparent transition-all resize-y shadow-inner"
                />
                <div className="absolute bottom-4 right-4 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-card)] px-2 py-1 rounded-md border border-white/5">
                  {idea.trim().length} karakter
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] rounded-3xl border border-white/5 p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">Bu proje kimin adına?</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                Kişisel cüzdanını mı yoksa takım cüzdanını mı kullanacağını seç.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!orgOnly && (
                  <ContextChoice
                    selected={contextOrgId === ''}
                    onSelect={() => setContextOrgId('')}
                    icon={<User size={18} />}
                    title="Kişisel"
                    hint="Kendi bakiyenden düşer"
                  />
                )}
                {orgs.map((o) => (
                  <ContextChoice
                    key={o.id}
                    selected={contextOrgId === o.id}
                    onSelect={() => setContextOrgId(o.id)}
                    icon={<Building2 size={18} />}
                    title={o.name}
                    hint={`${o.tokenBalance.toLocaleString(locale)} token mevcut`}
                  />
                ))}
              </div>
              {orgs.length === 0 && orgOnly && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-sm text-[var(--color-warning)]">
                  Bu proje türü kuruma özel ve henüz hiçbir kuruma üye değilsin. Lütfen bir kurum oluştur veya davet bekle.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Extra Inputs */}
        <div className={`transition-all duration-500 ${step === 2 ? 'block opacity-100 translate-x-0' : 'hidden opacity-0 translate-x-4'}`}>
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Detayları Belirle</h2>
              <p className="text-[var(--color-text-secondary)] mt-2">
                Yapay zekanın şablonu tam istediğin gibi doldurabilmesi için birkaç spesifik bilgiye daha ihtiyacımız var.
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
        </div>

        {/* Step 3: Summary & Start */}
        <div className={`transition-all duration-500 ${step === 3 ? 'block opacity-100 translate-x-0' : 'hidden opacity-0 translate-x-4'}`}>
          <div className="bg-[var(--color-card)] rounded-3xl border border-white/5 p-8 shadow-xl text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--color-accent)] to-[#6b4cff] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-accent)]/20">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Her Şey Hazır!</h2>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
              Toplam <strong>{projectType.sections.length} bölüm</strong> üretilecek. Tüm süreç birkaç dakika sürebilir, ancak ilerlemeyi anlık olarak izleyebileceksin.
            </p>
            
            <div className="bg-black/20 rounded-2xl border border-white/5 p-6 mb-8 text-left">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Proje Özeti</h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <span className="text-[var(--color-text-secondary)] w-24 shrink-0">Şablon:</span>
                  <span className="text-white font-medium">{projectType.name[loc] ?? projectType.name.en}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[var(--color-text-secondary)] w-24 shrink-0">Cüzdan:</span>
                  <span className="text-white font-medium">
                    {contextOrgId ? orgs.find(o => o.id === contextOrgId)?.name : 'Kişisel Cüzdan'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[var(--color-text-secondary)] w-24 shrink-0">Fikir (Özet):</span>
                  <span className="text-white text-sm line-clamp-2">{idea}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--color-accent)] to-[#6b4cff] hover:opacity-90 text-white text-base font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-accent)]/20"
            >
              {isPending ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              {isPending ? 'Sihir Gerçekleşiyor...' : 'Üretmeye Başla'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm text-[var(--color-error)] animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-error)] shrink-0 animate-pulse" />
            {error}
          </div>
        )}

        {/* Wizard Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
          <button
            type="button"
            onClick={handlePrevStep}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-white transition-colors ${step === 1 ? 'invisible' : ''}`}
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          
          {step < 3 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-gray-200 text-sm font-bold rounded-xl transition-colors"
            >
              İleri <ArrowRight size={16} />
            </button>
          )}
        </div>

      </form>
    </div>
  );
}

function StepIndicator({ currentStep, stepNumber, label }: { currentStep: number; stepNumber: number; label: string }) {
  const isCompleted = currentStep > stepNumber;
  const isActive = currentStep === stepNumber;
  
  return (
    <div className={`flex items-center gap-2 ${isActive ? 'text-[var(--color-accent)]' : isCompleted ? 'text-white' : 'text-[var(--color-text-secondary)]'} transition-colors duration-300`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : isCompleted ? 'border-white bg-white/10' : 'border-white/20 bg-transparent'}`}>
        {isCompleted ? <CheckCircle2 size={12} /> : stepNumber}
      </div>
      <span className="hidden sm:inline-block">{label}</span>
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
    <div className="bg-[var(--color-card)] rounded-3xl border border-white/5 p-8 shadow-lg">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white">
          {section.title[locale] ?? section.title.en}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {section.description[locale] ?? section.description.en}
        </p>
      </div>
      <div className="space-y-5">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              {f.label[locale] ?? f.label.en}
              {f.required && <span className="text-[var(--color-error)] ml-1">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={(values[f.id] as string) ?? ''}
                placeholder={f.placeholder?.[locale] ?? f.placeholder?.en}
                onChange={(e) => onChange(f.id, e.target.value)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all resize-y shadow-inner"
              />
            ) : f.type === 'select' ? (
              <select
                value={(values[f.id] as string) ?? ''}
                onChange={(e) => onChange(f.id, e.target.value)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all shadow-inner"
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
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all shadow-inner"
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
        'group flex items-start gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-300 ' +
        (selected
          ? 'bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent border-[var(--color-accent)]/40 shadow-md'
          : 'bg-[var(--color-background)] border-white/5 hover:border-white/15 hover:bg-white/5')
      }
    >
      <span
        className={
          'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ' +
          (selected
            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
            : 'bg-white/5 text-[var(--color-text-secondary)] group-hover:text-white')
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={
            'text-base font-bold truncate transition-colors ' +
            (selected
              ? 'text-[var(--color-accent)]'
              : 'text-white')
          }
        >
          {title}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
          {hint}
        </p>
      </div>
    </button>
  );
}
