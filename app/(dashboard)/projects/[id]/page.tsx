"use client";

import { useParams, useRouter } from "next/navigation";
import { mockProjects } from "@/lib/mock-data";
import {
  ArrowLeft, Download, CheckCircle2, CircleDashed, FileText,
  Calendar, Wallet, Users, FileDown, File, Sheet, Presentation,
  Clock, Bot, Send, Sparkles, RotateCcw, Copy, CheckCheck, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { ProjectFile } from "@/types";

/* ─── File helpers ─── */
const fileIcons: Record<ProjectFile["type"], React.ElementType> = {
  pdf: FileDown,
  docx: File,
  xlsx: Sheet,
  pptx: Presentation,
};

const fileColors: Record<ProjectFile["type"], string> = {
  pdf: "text-red-400 bg-red-400/10 border-red-400/20",
  docx: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  xlsx: "text-green-400 bg-green-400/10 border-green-400/20",
  pptx: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

/* ─── AI simulation ─── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestedPrompts = [
  "Proje ozetini akademik dille yeniden yaz",
  "Hedef kitleyi genislet",
  "Butce detaylarini ekle",
  "Beklenen ciktilari listele",
  "Metodoloji bolumunu guclendir",
];

function simulateAI(msg: string, projectName: string): string {
  const l = msg.toLowerCase();
  if (l.includes("ozet") || l.includes("yeniden"))
    return `Proje ozeti guncellendi.\n\n"${projectName}" projesi, AB egitim oncelikleri cercevesinde kurumsal kapasiteleri gelistirmeyi ve yenilikci deneyimler sunmayi amaclamaktadir. Acik lisans ile paylasılacak materyaller uretilecektir.`;
  if (l.includes("butce"))
    return `Butce bolumu guncellendi.\n\nProje Yonetimi: 8.000 EUR (%18)\nHareketlilik: 25.000 EUR (%56)\nMateryaller: 7.000 EUR (%16)\nYayim: 5.000 EUR (%10)`;
  if (l.includes("hedef") || l.includes("kitle"))
    return `Hedef kitle genisletildi.\n\nBirincil hedef kitlemiz 14-18 yas arasi lise ogrencileridir. Uc ulkeden toplam 450 ogrenci ve 60 ogretmene dogrudan ulasilmasi planlanmaktadir.`;
  if (l.includes("liste") || l.includes("cikti"))
    return `Ciktilar listelendi:\n\n1. Cevrimici ogrenme platformu\n2. Egitim materyalleri seti (3 dil)\n3. Belgesel film\n4. Etki raporu\n5. 6 ortak etkinlik`;
  if (l.includes("metodoloji") || l.includes("yontem"))
    return `Metodoloji guclendirildi.\n\nKatilimci tasarim yaklasimi ve karma yontem kullanilmaktadir. Nicel veriler anket ve platform analizleriyle, nitel veriler odak gruplariyla toplanacaktir.`;
  return `Komutunuz islendi.\n\n"${msg}" dogrultusunda proje icerigi guncellendi. Degisiklikleri inceleyebilirsiniz.`;
}

/* ─── Main component ─── */
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();

  const project = mockProjects.find((p) => p.id === params.id);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: project
        ? `Merhaba! **"${project.name}"** uzerinde calismaya hazirim.\n\nProjenizin herhangi bir bolumunu revize etmemi isteyin.`
        : "Proje yuklenemedi.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resize logic
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-secondary)]">Proje bulunamadi.</p>
      </div>
    );
  }

  const sections = project.sections ?? [];

  const handleDownload = (fileId: string, fileName: string) => {
    setDownloadingId(fileId);
    setTimeout(() => {
      console.log(`Indirme basladi: ${fileName}`);
      setDownloadingId(null);
    }, 1500);
  };

  const handleDownloadAll = () => {
    setDownloadingId("all");
    setTimeout(() => {
      console.log(`Tum dosyalar ZIP olarak indirildi: ${project.name}`);
      setDownloadingId(null);
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1600));
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: simulateAI(userMsg.content, project.name),
    };
    setMessages((p) => [...p, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusConfig = {
    "tamamlandi": { label: "Tamamlandi", icon: CheckCircle2, color: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20" },
    "devam eden": { label: "Devam Eden", icon: CircleDashed, color: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20" },
    "taslak":    { label: "Taslak",    icon: FileText,     color: "text-[var(--color-text-secondary)] bg-white/5 border-white/10" },
  };
  const status = statusConfig[project.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ═══ LEFT — Scrollable project content ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Sticky top bar */}
        <header className="px-6 py-4 border-b border-white/5 bg-[var(--color-background)] shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="shrink-0 p-2 rounded-lg hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Geri git"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[var(--color-text-primary)] truncate leading-snug">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[var(--color-text-secondary)]">{project.type}</span>
                <span className="text-[var(--color-text-secondary)]">·</span>
                <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", status.color)}>
                  <StatusIcon size={11} /> {status.label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadAll}
            disabled={downloadingId === "all"}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 hover:bg-[var(--color-card)] transition-all disabled:opacity-60 shrink-0"
          >
            <Download size={14} className={cn(downloadingId === "all" && "animate-bounce")} />
            {downloadingId === "all" ? "Indiriliyor..." : "Tumunu Indir"}
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Progress */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">Genel Ilerleme</span>
              <span className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">%{project.progress}</span>
            </div>
            <div className="w-full bg-[var(--color-background)] rounded-full h-2.5 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", project.progress === 100 ? "bg-[var(--color-success)]" : "bg-gradient-to-r from-[var(--color-accent)] to-violet-500")}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            {project.budget && (
              <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                  <Wallet size={14} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Butce</p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{project.budget}</p>
                </div>
              </div>
            )}
            {project.deadline && (
              <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-[var(--color-warning)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Son Tarih</p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {new Date(project.deadline).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-[var(--color-success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Son Guncelleme</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{project.lastModified}</p>
              </div>
            </div>
            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className="bg-[var(--color-card)] rounded-xl border border-white/5 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Users size={14} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Ekip</p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{project.teamMembers.length} kisi</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {project.summary && (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Proje Ozeti</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{project.summary}</p>
            </div>
          )}

          {/* Sections with tabs */}
          {sections.length > 0 && (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex gap-0 overflow-x-auto border-b border-white/5">
                {sections.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(i)}
                    className={cn(
                      "text-xs font-medium px-4 py-3 whitespace-nowrap border-b-2 transition-all shrink-0",
                      activeSection === i
                        ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                        : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:bg-white/5"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
              <div className="p-5">
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                  {sections[activeSection]?.content}
                </p>
              </div>
            </div>
          )}

          {/* Files */}
          {project.files && project.files.length > 0 && (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Proje Dosyalari</h2>
                <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-background)] px-2 py-1 rounded-full border border-white/5">
                  {project.files.length} dosya
                </span>
              </div>
              <div className="space-y-2">
                {project.files.map((file) => {
                  const FileIcon = fileIcons[file.type];
                  const colorClass = fileColors[file.type];
                  const isDownloading = downloadingId === file.id;
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-background)] border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", colorClass)}>
                          <FileIcon size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{file.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{file.size} · {file.updatedAt}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(file.id, file.name)}
                        disabled={isDownloading}
                        className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all"
                        aria-label={`${file.name} indir`}
                      >
                        <Download size={13} className={cn(isDownloading && "animate-bounce")} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══ RIGHT — AI Assistant Panel ═══ */}
      <aside 
        style={{ width: sidebarWidth }}
        className="shrink-0 border-l border-white/5 bg-[var(--color-sidebar)] flex flex-col relative transition-[width] duration-0"
      >
        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-[var(--color-accent)] z-20 opacity-0 hover:opacity-100 transition-opacity"
        />

        {/* AI panel header */}
        <div className="px-4 py-3.5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
              <Bot size={14} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">Antigravity AI</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Proje asistani</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-success)]">
            <span className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full animate-pulse" />
            Aktif
          </span>
        </div>

        {/* Quick prompt chips */}
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            Hizli Komutlar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group",
                  msg.role === "user"
                    ? "bg-[var(--color-accent)] text-white rounded-br-sm"
                    : "bg-[var(--color-card)] border border-white/5 text-[var(--color-text-primary)] rounded-bl-sm"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[var(--color-accent)]">
                    <Sparkles size={11} />
                    <span className="text-xs font-semibold">AI</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 text-[var(--color-text-secondary)] transition-all"
                    aria-label="Kopyala"
                  >
                    {copiedId === msg.id
                      ? <CheckCheck size={11} className="text-[var(--color-success)]" />
                      : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-card)] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--color-text-secondary)]">Analiz ediliyor...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="flex gap-2 items-end bg-[var(--color-card)] rounded-xl border border-white/10 focus-within:border-[var(--color-accent)]/50 transition-colors p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Projeyi revize etmek icin komut yazin..."
              rows={2}
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] resize-none outline-none leading-relaxed px-1 py-1"
            />
            <div className="flex items-center gap-1.5 shrink-0 pb-1">
              <button
                onClick={() => { setInput(""); setMessages((p) => p.slice(0, 1)); }}
                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                aria-label="Sıfırla"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-40"
                aria-label="Gonder"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] text-center mt-1.5">
            Enter gonder · Shift+Enter yeni satir
          </p>
        </div>

      </aside>
    </div>
  );
}
