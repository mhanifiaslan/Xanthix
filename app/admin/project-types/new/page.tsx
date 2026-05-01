"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, ArrowLeft, Save, GripVertical, FileText, Upload, Copy, Sparkles, X, FileUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- AI Cost Config ---
const MODEL_COSTS: Record<string, number> = {
  "claude-sonnet-4.6": 10,
  "claude-opus-4": 25,
  "gpt-4": 20,
  "gemini-2.5-pro": 8
};

const AI_MODELS = [
  { id: "claude-sonnet-4.6", name: "Claude 3.5 Sonnet (Hizli & Yetenekli)", cost: 10 },
  { id: "claude-opus-4", name: "Claude 3 Opus (Derin Dusunur)", cost: 25 },
  { id: "gpt-4", name: "GPT-4 (Genel Amacli)", cost: 20 },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Gorsel & Analiz)", cost: 8 },
];

// --- Validation Schemas ---
const stepSchema = z.object({
  title: z.string().min(3, "Adim basligi en az 3 karakter olmalidir."),
  description: z.string().min(5, "Aciklama girilmesi zorunludur."),
  systemPromptTemplate: z.string().min(10, "Sistem promptu gereklidir."),
  userPromptTemplate: z.string().min(10, "Kullanici prompt sablonu gereklidir."),
  model: z.enum(["gpt-4", "claude-opus-4", "claude-sonnet-4.6", "gemini-2.5-pro"]),
  requiresPreviousContext: z.boolean(),
  estimatedCredits: z.number().min(1),
  requiredUserInputs: z.array(z.object({
    id: z.string().min(1, "Degisken adi zorunludur."),
    label: z.string().min(2, "Etiket zorunludur."),
    type: z.enum(["text", "textarea", "file", "select"]),
    required: z.boolean()
  })).optional(),
  referenceDocuments: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Dosya adi zorunludur."),
    url: z.string()
  })).optional(),
  outputConfig: z.object({
    type: z.enum(["text", "document"]),
    format: z.string().optional(),
    documentTemplate: z.object({
      id: z.string(),
      name: z.string(),
      url: z.string()
    }).optional()
  }).optional()
});

const projectTypeSchema = z.object({
  name: z.string().min(3, "Proje turu adi zorunludur."),
  description: z.string().min(10, "Kisa aciklama gereklidir."),
  budget: z.string().min(1, "Butce araligi belirtilmelidir."),
  icon: z.string().min(1, "Ikon secilmelidir."),
  profitMargin: z.number().min(0, "Kar marji 0'dan kucuk olamaz."),
  credits: z.number().min(0),
  steps: z.array(stepSchema)
});

type FormValues = z.infer<typeof projectTypeSchema>;

// --- Subcomponent for Step ---
function StepItem({
  control,
  register,
  index,
  removeStep,
  watch,
  setValue
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  index: number;
  removeStep: (index: number) => void;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const { fields: inputFields, append: appendInput, remove: removeInput } = useFieldArray({
    control,
    name: `steps.${index}.requiredUserInputs`
  });

  const { fields: docFields, append: appendDoc, remove: removeDoc } = useFieldArray({
    control,
    name: `steps.${index}.referenceDocuments`
  });

  const stepInputs = watch(`steps.${index}.requiredUserInputs`) || [];
  const outputType = watch(`steps.${index}.outputConfig.type`);
  const currentModel = watch(`steps.${index}.model`);
  
  // Auto-update base cost when model changes
  const baseCost = MODEL_COSTS[currentModel] || 10;
  
  useEffect(() => {
    setValue(`steps.${index}.estimatedCredits`, baseCost, { shouldDirty: true });
  }, [currentModel, index, setValue, baseCost]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, indexDoc: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue(`steps.${index}.referenceDocuments.${indexDoc}.name`, file.name);
      // Simulate mock upload URL
      setValue(`steps.${index}.referenceDocuments.${indexDoc}.url`, `mock-storage://${Date.now()}_${file.name}`);
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue(`steps.${index}.outputConfig.documentTemplate.name`, file.name);
      setValue(`steps.${index}.outputConfig.documentTemplate.url`, `mock-storage://${Date.now()}_${file.name}`);
    }
  };

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden transition-all relative group mb-6">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
        <button
          type="button"
          onClick={() => removeStep(index)}
          className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-lg hover:bg-[var(--color-error)]/20 transition-colors"
          title="Adimi Sil"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
        <GripVertical size={16} className="text-[var(--color-text-secondary)] cursor-grab" />
        <span className="w-6 h-6 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <input
          {...register(`steps.${index}.title` as const)}
          className="bg-transparent border-none text-base font-semibold text-[var(--color-text-primary)] placeholder:text-white/20 focus:ring-0 outline-none w-1/2"
          placeholder="Adim Basligi (Orn: Literatur Taramasi)"
        />
      </div>

      <div className="p-6 grid grid-cols-2 gap-8">
        {/* Sol Kolon */}
        <div className="col-span-2 lg:col-span-1 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Adim Aciklamasi</label>
            <textarea
              {...register(`steps.${index}.description` as const)}
              rows={2}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none resize-none"
              placeholder="Bu adimda AI ne yapacak?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">AI Modeli</label>
              <select
                {...register(`steps.${index}.model` as const)}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none"
              >
                {AI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.cost} Kredi)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Taban Maliyet (Otomatik)</label>
              <div className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {baseCost} Kredi
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id={`context-${index}`}
              {...register(`steps.${index}.requiresPreviousContext` as const)}
              className="w-4 h-4 rounded bg-white/5 border-white/10 text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
            />
            <label htmlFor={`context-${index}`} className="text-sm text-[var(--color-text-secondary)] cursor-pointer">
              Onceki adimlarin ciktilarini (Context) bu adima dahil et
            </label>
          </div>

          {/* Kullanici Girdi (Inputs) */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Kullanicidan Istenecek Veriler</label>
              <button
                type="button"
                onClick={() => appendInput({ id: "", label: "", type: "textarea", required: true })}
                className="text-xs flex items-center gap-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
              >
                <Plus size={14} /> Girdi Ekle
              </button>
            </div>
            
            {inputFields.map((field, i) => (
              <div key={field.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative group/input">
                <button
                  type="button"
                  onClick={() => removeInput(i)}
                  className="absolute top-2 right-2 p-1.5 text-white/40 hover:text-[var(--color-error)] opacity-0 group-hover/input:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
                <div className="grid grid-cols-2 gap-3 pr-6">
                  <input
                    {...register(`steps.${index}.requiredUserInputs.${i}.label` as const)}
                    className="bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
                    placeholder="Etiket (Orn: Proje Amaci)"
                  />
                  <input
                    {...register(`steps.${index}.requiredUserInputs.${i}.id` as const)}
                    className="bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none font-mono text-[var(--color-accent)]"
                    placeholder="Degisken Adi (Orn: proje_amaci)"
                  />
                  <select
                    {...register(`steps.${index}.requiredUserInputs.${i}.type` as const)}
                    className="bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
                  >
                    <option value="text">Kisa Metin</option>
                    <option value="textarea">Uzun Metin</option>
                    <option value="file">Dosya</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register(`steps.${index}.requiredUserInputs.${i}.required` as const)}
                      className="rounded bg-white/5 border-white/10 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">Zorunlu</span>
                  </div>
                </div>
              </div>
            ))}
            {inputFields.length === 0 && (
              <p className="text-xs text-white/30 italic">Kullanicidan istenen ek bir veri yok.</p>
            )}
          </div>

          {/* Referans Dokumanlar - File Upload */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                <FileText size={14} /> AI Icin Referans Dokumanlar
              </label>
              <button
                type="button"
                onClick={() => appendDoc({ id: `doc-${Date.now()}`, name: "", url: "" })}
                className="text-xs flex items-center gap-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
              >
                <Plus size={14} /> Alan Ekle
              </button>
            </div>

            {docFields.map((field, i) => {
              const currentFileName = watch(`steps.${index}.referenceDocuments.${i}.name`);
              return (
                <div key={field.id} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, i)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)]">
                      <Upload size={14} className="text-[var(--color-accent)]" />
                      <span className="truncate">
                        {currentFileName || "Dosya secin veya surukleyin..."}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoc(i)}
                    className="p-2 text-white/40 hover:text-[var(--color-error)] transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

        </div>

        {/* Sag Kolon - Prompt & Cikti */}
        <div className="col-span-2 lg:col-span-1 space-y-6">
          
          <div className="p-4 rounded-xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
            <h3 className="text-xs font-semibold text-[var(--color-accent)] mb-3 flex items-center gap-2">
              Kullanilabilir Degiskenler
            </h3>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button" 
                onClick={() => copyToClipboard("{{previous_context}}")}
                className="group flex items-center gap-1 text-xs bg-[var(--color-background)] border border-white/10 px-2 py-1 rounded-md text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
              >
                <span className="text-[var(--color-accent)]">{"{{"}</span>previous_context<span className="text-[var(--color-accent)]">{"}}"}</span>
                <Copy size={10} className="opacity-0 group-hover:opacity-100 text-white/50" />
              </button>
              
              {stepInputs.map((inp, idx) => inp.id ? (
                <button 
                  key={idx}
                  type="button" 
                  onClick={() => copyToClipboard(`{{${inp.id}}}`)}
                  className="group flex items-center gap-1 text-xs bg-[var(--color-background)] border border-white/10 px-2 py-1 rounded-md text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
                  title={inp.label}
                >
                  <span className="text-[var(--color-accent)]">{"{{"}</span>{inp.id}<span className="text-[var(--color-accent)]">{"}}"}</span>
                  <Copy size={10} className="opacity-0 group-hover:opacity-100 text-white/50" />
                </button>
              ) : null)}
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-3">
              Degiskene tiklayarak kopyalayabilir, asagidaki prompt alanlarina yapistirarak AI'in o veriyi kullanmasini saglayabilirsiniz.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">System Prompt (Gizli)</span>
            </label>
            <textarea
              {...register(`steps.${index}.systemPromptTemplate` as const)}
              rows={4}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] font-mono focus:border-[var(--color-accent)] outline-none resize-none"
              placeholder="Orn: Sen akademik bir yazarsin. Ciktilari Markdown formatinda ve profesyonel bir dille uret..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">User Prompt Template</span>
            </label>
            <textarea
              {...register(`steps.${index}.userPromptTemplate` as const)}
              rows={5}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] font-mono focus:border-[var(--color-accent)] outline-none resize-none"
              placeholder="Asagidaki verilere gore projeyi yaz: {{user_input}} {{previous_context}}"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Cikti Formati ve Sablonu</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <select
                  {...register(`steps.${index}.outputConfig.type` as const)}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
                >
                  <option value="text">Sadece Metin (Markdown)</option>
                  <option value="document">Hazir Sablon Doldur (DOCX vb.)</option>
                </select>
              </div>
              {outputType === 'document' && (
                <div className="space-y-2">
                  <select
                    {...register(`steps.${index}.outputConfig.format` as const)}
                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
                  >
                    <option value="docx">Word (.docx)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                </div>
              )}
            </div>

            {outputType === 'document' && (
              <div className="mt-3 p-4 border border-dashed border-[var(--color-accent)]/30 rounded-xl bg-[var(--color-accent)]/5">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Sablon Dokuman Yukle</p>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleTemplateUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".docx,.pdf,.doc"
                  />
                  <div className="flex items-center gap-2 bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-3 text-xs text-[var(--color-text-primary)]">
                    <Upload size={16} className="text-[var(--color-accent)]" />
                    <span className="truncate">
                      {watch(`steps.${index}.outputConfig.documentTemplate.name`) || "DOCX/PDF form dosyasini secin veya surukleyin..."}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-2 italic">
                  AI, urettigi icerigi bu bos sablon dokumanin icine yerlestirerek nihai bir dosya olusturacaktir.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function NewProjectTypePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Generator States
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiGuideText, setAiGuideText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(projectTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: "",
      icon: "GraduationCap",
      profitMargin: 20, // Default 20%
      credits: 0,
      steps: [
        {
          title: "",
          description: "",
          systemPromptTemplate: "Sen uzman bir danismansin. Asagidaki yonergeye gore hareket et.",
          userPromptTemplate: "Konu: {{proje_fikri}}",
          model: "claude-sonnet-4.6",
          requiresPreviousContext: false,
          estimatedCredits: 10,
          requiredUserInputs: [
            { id: "proje_fikri", label: "Temel Fikir", type: "textarea", required: true }
          ],
          outputConfig: { type: "text" }
        }
      ]
    }
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "steps"
  });

  const margin = watch("profitMargin") || 0;
  const stepsData = watch("steps") || [];
  
  // Calculate total cost
  useEffect(() => {
    const baseCostTotal = stepsData.reduce((acc, step) => {
      const stepCost = MODEL_COSTS[step.model as string] || 10;
      return acc + stepCost;
    }, 0);
    
    const finalCredits = Math.ceil(baseCostTotal * (1 + margin / 100));
    setValue("credits", finalCredits, { shouldValidate: true });
  }, [stepsData, margin, setValue]);

  const totalCredits = watch("credits");

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      console.log("Kaydedilecek Veri:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Proje Turu Basariyla Kaydedildi!");
      router.push("/admin/project-types");
    } catch (error) {
      console.error(error);
      alert("Bir hata olustu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiGuideText.trim()) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const response = await fetch("/api/generate-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideText: aiGuideText.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI adım üretimi başarısız.");
      }

      if (!data.steps || data.steps.length === 0) {
        throw new Error("AI herhangi bir adım üretemedi. Kılavuz metnini daha detaylı yazmayı deneyin.");
      }

      setValue("steps", data.steps as any, { shouldValidate: true, shouldDirty: true });
      setShowAiGenerator(false);
      setAiGuideText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setAiError(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[var(--color-background)] z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/project-types"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Yeni Proje Turu</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Platforma ozel dinamik AI sablonu olusturun
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSubmitting ? "Kaydediliyor..." : "Taslagi Kaydet"}
        </button>
      </header>

      <div className="px-8 py-8 max-w-6xl mx-auto">
        <form className="space-y-8">
          
          {/* Genel Bilgiler */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
              1. Genel Bilgiler
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Tur Adi</label>
                <input
                  {...register("name")}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all"
                  placeholder="Orn: Erasmus+ KA210"
                />
                {errors.name && <p className="text-xs text-[var(--color-error)] mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Ikon</label>
                <select
                  {...register("icon")}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none"
                >
                  <option value="GraduationCap">Mezuniyet Kepi (Egitim)</option>
                  <option value="Microscope">Mikroskop (Arastirma)</option>
                  <option value="Building2">Bina (Kalkinma)</option>
                </select>
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Ortalama Butce</label>
                <input
                  {...register("budget")}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none"
                  placeholder="Orn: 30.000 EUR"
                />
              </div>

              <div className="space-y-2 col-span-2 lg:col-span-4">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Aciklama</label>
                <textarea
                  {...register("description")}
                  rows={2}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none resize-none"
                  placeholder="Kullanicilarin bu turu anlamasina yardimci olacak kisa aciklama..."
                />
                {errors.description && <p className="text-xs text-[var(--color-error)] mt-1">{errors.description.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Kar Marji (%)</label>
                <input
                  type="number"
                  {...register("profitMargin", { valueAsNumber: true })}
                  className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] outline-none"
                />
              </div>
              
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
                  Toplam Kredi Maliyeti
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50">Otomatik</span>
                </label>
                <div className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                  {totalCredits} Kredi
                </div>
              </div>
            </div>
          </div>

          {/* Adimlar (Agent Yapislandirmasi) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  2. AI Agent Adimlari
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Projeyi olustururken AI'in hangi siralama ve referanslarla calisacagini belirleyin.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAiGenerator(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition-all"
                >
                  <Sparkles size={16} /> AI ile Olustur
                </button>
                <button
                  type="button"
                  onClick={() => appendStep({
                    title: "",
                    description: "",
                    systemPromptTemplate: "",
                    userPromptTemplate: "",
                    model: "claude-sonnet-4.6",
                    requiresPreviousContext: true,
                    estimatedCredits: 10,
                    requiredUserInputs: [],
                    referenceDocuments: [],
                    outputConfig: { type: "text" }
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <Plus size={16} /> Adim Ekle
                </button>
              </div>
            </div>

            {/* AI Generator Panel */}
            {showAiGenerator && (
              <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <button
                  type="button"
                  onClick={() => setShowAiGenerator(false)}
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">AI ile Proje Adimlari Olustur</h3>
                    <p className="text-xs text-indigo-200/70">Proje kilavuzunuzu veya yonergeyi buraya yapistirin, AI tum adimlari otomatik planlasin.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={aiGuideText}
                    onChange={(e) => { setAiGuideText(e.target.value); setAiError(null); }}
                    rows={5}
                    placeholder="Orn: 'Erasmus+ KA210 başvurusu için bir proje planı hazırlayacağım. İlk adımda literatür taranmalı, ikinci adımda bütçe hesaplanmalı, son adımda ise bir Word dosyası olarak dokümantasyon üretilmeli...'"
                    className="w-full bg-black/20 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-indigo-500/50 outline-none resize-none"
                  />

                  {/* Hata Mesajı */}
                  {aiError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                      <X size={14} className="shrink-0 mt-0.5" />
                      {aiError}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-white/70 transition-colors">
                        <FileUp size={14} /> Doküman Yükle (PDF/TXT)
                      </button>
                      <span className="text-[10px] text-white/30 italic">Yakında aktif olacak</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAi || !aiGuideText.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    >
                      {isGeneratingAi ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uretiliyor...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Adimlari Uret
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stepFields.map((field, index) => (
              <StepItem
                key={field.id}
                control={control}
                register={register}
                index={index}
                removeStep={removeStep}
                watch={watch}
                setValue={setValue}
              />
            ))}
            
            {stepFields.length === 0 && (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Henuz hic adim eklenmemis. Bir AI adimi ekleyerek baslayin.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
