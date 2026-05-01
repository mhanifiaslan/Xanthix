/**
 * Proje Oluşturma Sihirbazı
 *
 * Admin tarafından tanımlanan proje türü şablonunu kullanarak kullanıcıyı
 * adım adım yönlendirir ve her adımda Gemini AI ile içerik üretir.
 *
 * @module components/dashboard/ProjectWizard
 */

"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useProjectWizard } from "@/lib/project-wizard-store";
import { ProjectType } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectWizardProps {
  projectType: ProjectType;
  onComplete: (projectName: string, content: string) => void;
  onCancel: () => void;
}

/**
 * Basit markdown → HTML renderer (gerçek lib yerine lightweight versiyon)
 */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-base font-semibold text-[var(--color-text-primary)] mt-4">{line.slice(3)}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold text-[var(--color-text-primary)] mt-4">{line.slice(2)}</h2>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold text-[var(--color-text-primary)]">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\. /, "")}</li>;
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function ProjectWizard({ projectType, onComplete, onCancel }: ProjectWizardProps) {
  const {
    state,
    startWizard,
    setProjectName,
    setUserInput,
    runCurrentStep,
    goToNextStep,
    getStepResult,
  } = useProjectWizard();

  // Sihirbazı proje türüyle başlat
  useEffect(() => {
    startWizard(projectType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectType.id]);

  const steps = projectType.steps ?? [];
  const currentStep = steps[state.currentStepIndex];
  const currentResult = getStepResult(state.currentStepIndex);
  const currentInputs = state.userInputsByStep[state.currentStepIndex] ?? {};
  const totalSteps = steps.length;

  // Eğer adım yoksa basit bir fikir formu göster
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
        <AlertCircle size={40} className="text-yellow-400" />
        <p className="text-[var(--color-text-secondary)] text-sm">
          Bu proje türüne henüz AI adımı eklenmemiş. Lütfen admin panelinden adım ekleyin.
        </p>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[var(--color-accent)] hover:underline">
          Geri Dön
        </button>
      </div>
    );
  }

  // Tüm adımlar tamamlandıysa özet göster
  if (state.isComplete) {
    const fullContent = state.stepResults
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map(r => `# ${r.stepTitle}\n\n${r.content}`)
      .join("\n\n---\n\n");

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Proje Tamamlandı!</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Tüm adımlar başarıyla üretildi.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {state.stepResults
                .sort((a, b) => a.stepIndex - b.stepIndex)
                .map((result) => (
                  <div
                    key={result.stepIndex}
                    className="bg-[var(--color-card)] border border-white/5 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {result.stepTitle}
                      </h3>
                    </div>
                    <MarkdownContent content={result.content} />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onComplete(state.projectName || projectType.name, fullContent)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <CheckCircle2 size={16} />
            Projeyi Kaydet ve Düzenle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Adım İlerleme Çubuğu */}
      <div className="px-8 py-5 border-b border-white/5">
        {/* Proje Adı (İlk adımda göster) */}
        {state.currentStepIndex === 0 && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Proje Adı <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              value={state.projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={`Örn: ${projectType.name} - Proje Adım`}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none transition-all"
            />
          </div>
        )}

        {/* Step Bar */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all",
                i < state.currentStepIndex
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : i === state.currentStepIndex
                    ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/40"
                    : "bg-white/5 text-white/30 border border-white/10"
              )}>
                {i < state.currentStepIndex ? (
                  <CheckCircle2 size={14} />
                ) : (
                  i + 1
                )}
              </div>
              <span className={cn(
                "text-xs truncate hidden sm:block",
                i === state.currentStepIndex
                  ? "text-[var(--color-text-primary)] font-medium"
                  : "text-[var(--color-text-secondary)]"
              )}>
                {step.title}
              </span>
              {i < totalSteps - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1",
                  i < state.currentStepIndex ? "bg-green-500/30" : "bg-white/10"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adım İçeriği */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Adım Başlık */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                Adım {state.currentStepIndex + 1} / {totalSteps}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{currentStep.title}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{currentStep.description}</p>
          </div>

          {/* Kullanıcı Girdileri */}
          {currentStep.requiredUserInputs && currentStep.requiredUserInputs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Bu Adım için Bilgilerinizi Girin
              </h3>
              {currentStep.requiredUserInputs.map((input) => (
                <div key={input.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">
                    {input.label}
                    {input.required && <span className="text-[var(--color-error)] ml-1">*</span>}
                  </label>
                  {input.type === "textarea" ? (
                    <textarea
                      rows={4}
                      value={currentInputs[input.id] ?? ""}
                      onChange={(e) => setUserInput(state.currentStepIndex, input.id, e.target.value)}
                      placeholder={`${input.label} girin...`}
                      className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none resize-none transition-all"
                    />
                  ) : (
                    <input
                      type="text"
                      value={currentInputs[input.id] ?? ""}
                      onChange={(e) => setUserInput(state.currentStepIndex, input.id, e.target.value)}
                      placeholder={`${input.label} girin...`}
                      className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none transition-all"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Üret Butonu */}
          <button
            onClick={runCurrentStep}
            disabled={state.isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state.isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                AI içerik üretiyor...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {currentResult ? "Yeniden Üret" : "AI ile Bu Adımı Üret"}
              </>
            )}
          </button>

          {/* Hata Mesajı */}
          {state.generationError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {state.generationError}
            </div>
          )}

          {/* AI Çıktısı */}
          {currentResult && (
            <div className="bg-[var(--color-card)] border border-[var(--color-accent)]/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[var(--color-accent)]">
                  <Sparkles size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">AI Çıktısı</span>
                </div>
                <button
                  onClick={runCurrentStep}
                  disabled={state.isGenerating}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <RefreshCw size={12} />
                  Yenile
                </button>
              </div>
              <MarkdownContent content={currentResult.content} />
            </div>
          )}
        </div>
      </div>

      {/* Alt Butonlar */}
      <div className="p-6 border-t border-white/5 flex justify-between items-center">
        <button
          onClick={state.currentStepIndex === 0 ? onCancel : () => {}}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          {state.currentStepIndex === 0 ? "İptal" : "Geri"}
        </button>

        <button
          onClick={goToNextStep}
          disabled={!currentResult || state.isGenerating}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {state.currentStepIndex === totalSteps - 1 ? "Tamamla" : "Onayla ve Devam Et"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
