/**
 * Proje Oluşturma Sihirbazı State Yönetimi
 *
 * Kullanıcının proje türü seçiminden başlayarak tüm adımların
 * tamamlanmasına kadar olan süreci yönetir.
 *
 * @module lib/project-wizard-store
 */

import { useState, useCallback } from "react";
import { ProjectType, ProjectTypeStep, StepResult } from "@/types";

export interface WizardState {
  projectType: ProjectType | null;
  projectName: string;
  currentStepIndex: number;
  stepResults: StepResult[];
  userInputsByStep: Record<number, Record<string, string>>;
  isGenerating: boolean;
  generationError: string | null;
  isComplete: boolean;
}

const INITIAL_STATE: WizardState = {
  projectType: null,
  projectName: "",
  currentStepIndex: 0,
  stepResults: [],
  userInputsByStep: {},
  isGenerating: false,
  generationError: null,
  isComplete: false,
};

/**
 * Proje sihirbazı için state yönetim hook'u.
 *
 * @returns Sihirbaz state'i ve kontrol fonksiyonları
 */
export function useProjectWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  /** Sihirbazı belirli bir proje türüyle başlatır */
  const startWizard = useCallback((projectType: ProjectType) => {
    setState({
      ...INITIAL_STATE,
      projectType,
    });
  }, []);

  /** Sihirbazı sıfırlar */
  const resetWizard = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  /** Proje adını günceller */
  const setProjectName = useCallback((name: string) => {
    setState(prev => ({ ...prev, projectName: name }));
  }, []);

  /** Belirli bir adım için kullanıcı girdisini günceller */
  const setUserInput = useCallback((stepIndex: number, inputId: string, value: string) => {
    setState(prev => ({
      ...prev,
      userInputsByStep: {
        ...prev.userInputsByStep,
        [stepIndex]: {
          ...(prev.userInputsByStep[stepIndex] ?? {}),
          [inputId]: value,
        },
      },
    }));
  }, []);

  /**
   * Mevcut adımı Gemini API aracılığıyla çalıştırır.
   * Önceki tüm adımların çıktılarını bağlam olarak gönderir.
   */
  const runCurrentStep = useCallback(async () => {
    const { projectType, currentStepIndex, stepResults, userInputsByStep } = state;
    if (!projectType?.steps) return;

    const step: ProjectTypeStep = projectType.steps[currentStepIndex];
    if (!step) return;

    setState(prev => ({ ...prev, isGenerating: true, generationError: null }));

    // Önceki adımların çıktılarını birleştir
    const previousContext = stepResults
      .map(r => `=== ${r.stepTitle} ===\n${r.content}`)
      .join("\n\n");

    const userInputs = userInputsByStep[currentStepIndex] ?? {};

    try {
      const res = await fetch("/api/run-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPromptTemplate: step.systemPromptTemplate,
          userPromptTemplate: step.userPromptTemplate,
          userInputs,
          previousContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI adım hatası");

      const newResult: StepResult = {
        stepIndex: currentStepIndex,
        stepTitle: step.title,
        content: data.content,
        userInputs,
      };

      setState(prev => ({
        ...prev,
        stepResults: [
          ...prev.stepResults.filter(r => r.stepIndex !== currentStepIndex),
          newResult,
        ],
        isGenerating: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setState(prev => ({ ...prev, isGenerating: false, generationError: message }));
    }
  }, [state]);

  /** Sonraki adıma geçer veya sihirbazı tamamlar */
  const goToNextStep = useCallback(() => {
    const { projectType, currentStepIndex } = state;
    const totalSteps = projectType?.steps?.length ?? 0;

    if (currentStepIndex < totalSteps - 1) {
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
      }));
    } else {
      setState(prev => ({ ...prev, isComplete: true }));
    }
  }, [state]);

  /** Belirli bir adımın AI çıktısı (varsa) */
  const getStepResult = useCallback(
    (stepIndex: number) => state.stepResults.find(r => r.stepIndex === stepIndex),
    [state.stepResults]
  );

  return {
    state,
    startWizard,
    resetWizard,
    setProjectName,
    setUserInput,
    runCurrentStep,
    goToNextStep,
    getStepResult,
  };
}
