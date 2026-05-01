"use client";

import { useParams, useRouter } from "next/navigation";
import { mockProjects } from "@/lib/mock-data";
import { ArrowLeft, Bot, Send, Sparkles, RotateCcw, Copy, CheckCheck, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  "Proje özetini daha akademik bir dille yeniden yaz",
  "Bütçe bölümüne daha fazla detay ekle",
  "Hedef kitle paragrafını genişlet",
  "Beklenen çıktıları madde madde listele",
  "Proje metodolojisini güçlendir",
];

function simulateAiResponse(userMessage: string, projectName: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("özet") || lower.includes("yeniden yaz")) {
    return `✅ "${projectName}" projesinin özeti güncellendi.\n\nProje, Avrupa Birliği'nin eğitim ve gençlik alanındaki öncelikli hedefleri çerçevesinde, sürdürülebilir ortaklıklar yoluyla katılımcı kurumların kurumsal kapasitelerini geliştirmeyi ve öğrenenlere yenilikçi deneyimler sunmayı amaçlamaktadır. Proje kapsamında geliştirilen materyaller, açık lisans çerçevesinde erişime sunulacaktır.`;
  }

  if (lower.includes("bütçe")) {
    return `✅ Bütçe bölümü güncellendi.\n\n**Detaylı Bütçe Planı:**\n\n| Kalem | Tutar | Oran |\n|---|---|---|\n| Proje Yönetimi | 8.000 EUR | %18 |\n| Hareketlilik | 25.000 EUR | %56 |\n| Materyaller | 7.000 EUR | %16 |\n| Yayım & Dağıtım | 5.000 EUR | %10 |\n\nTüm bütçe kalemleri AB Sözleşme Yönetmeliği madde 6.2'ye uygun olarak hazırlanmıştır.`;
  }

  if (lower.includes("hedef") || lower.includes("kitle")) {
    return `✅ Hedef kitle bölümü genişletildi.\n\nBu projenin birincil hedef kitlesi, partner ülkelerdeki 14-18 yaş arası lise öğrencileridir. İkincil hedef kitlemiz ise bu öğrencilerin eğitimini şekillendiren öğretmenler ve okul yöneticileridir. Proje süresince 3 ülkeden toplam 450 öğrenci ve 60 öğretmene doğrudan ulaşılması planlanmaktadır.`;
  }

  if (lower.includes("madde") || lower.includes("çıktı") || lower.includes("liste")) {
    return `✅ Çıktılar madde madde listelendi:\n\n1. 🌐 Çok dilli çevrimiçi öğrenme platformu\n2. 📚 3 dilde eğitim materyalleri seti (dijital + basılı)\n3. 🎬 Belgesel film (2 dakika, 3 dil altyazı)\n4. 📊 Proje etki raporu\n5. 🤝 6 ortak çalışma etkinliği\n6. 🏆 Öğrenci başarı sertifika sistemi`;
  }

  if (lower.includes("metodoloji") || lower.includes("yöntem")) {
    return `✅ Metodoloji bölümü güçlendirildi.\n\nProje, katılımcı tasarım (participatory design) yaklaşımını temel alan karma yöntemli bir metodoloji kullanmaktadır. Nicel veriler anket ve platform kullanım analizleriyle, nitel veriler ise odak grupları ve görüşmelerle toplanacaktır. Değerlendirme süreçleri proaktif olarak 3 ayda bir gerçekleştirilecektir.`;
  }

  return `✅ İsteğiniz işlendi.\n\n"${userMessage}" komutu doğrultusunda proje içeriğinde güncelleme yapıldı. Yapay zeka analizi tamamlandı. Değişiklikleri kabul etmek için "Kaydet" butonuna tıklayın.`;
}

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();

  const project = mockProjects.find((p) => p.id === params.id);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Merhaba! **"${project?.name}"** projesi üzerinde çalışmaya hazırım.\n\nBana bir komut verin; projenizin herhangi bir bölümünü revize edebilir, genişletebilir veya yeniden yazabilirim.`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const newWidth = e.clientX;
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

  if (!project) return null;

  const sections = project.sections ?? [];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Mevcut proje içeriğini bağlam olarak gönder
      const projectContext = sections.length > 0
        ? sections.map((s) => `## ${s.title}\n${s.content}`).join("\n\n")
        : project.summary ?? "";

      const res = await fetch("/api/run-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPromptTemplate: `Sen deneyimli bir proje yazarısın. Kullanıcının "${project.type}" türündeki "${project.name}" projesini revize etmesine yardım ediyorsun. Çıktılarını her zaman Türkçe ve profesyonel bir dille ver.`,
          userPromptTemplate: `Mevcut proje içeriği:\n\n{{previous_context}}\n\nKullanıcının isteği: {{kullanici_istegi}}`,
          userInputs: { kullanici_istegi: userMsg.content },
          previousContext: projectContext,
        }),
      });

      const data = await res.json();
      const aiContent = res.ok
        ? data.content
        : `Hata: ${data.error ?? "AI yanıt üretemedi."}`;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[var(--color-sidebar)] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Geri git"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center">
              <Bot size={14} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-none">
                AI Editör
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-xs">
                {project.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-success)]">
            <span className="w-1.5 h-1.5 bg-[var(--color-success)] rounded-full animate-pulse" />
            AI Bağlı
          </span>
        </div>
      </header>

      {/* Split Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sol — Chat Paneli */}
        <div 
          style={{ width: sidebarWidth }}
          className="shrink-0 flex flex-col border-r border-white/5 bg-[var(--color-sidebar)] relative transition-[width] duration-0"
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={startResizing}
            className="absolute right-0 top-0 bottom-0 w-2 -mr-1 cursor-col-resize hover:bg-[var(--color-accent)] z-20 opacity-0 hover:opacity-100 transition-opacity"
          />

          {/* Önerilen Komutlar */}
          <div className="px-4 pt-4 pb-2 border-b border-white/5">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Hızlı Komutlar
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

          {/* Mesaj Listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group",
                    msg.role === "user"
                      ? "bg-[var(--color-accent)] text-white rounded-br-sm"
                      : "bg-[var(--color-card)] border border-white/5 text-[var(--color-text-primary)] rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-2 text-[var(--color-accent)]">
                      <Sparkles size={12} />
                      <span className="text-xs font-semibold">Antigravity AI</span>
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
                        ? <CheckCheck size={12} className="text-[var(--color-success)]" />
                        : <Copy size={12} />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--color-card)] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-[var(--color-accent)]">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs text-[var(--color-text-secondary)]">Analiz ediliyor...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Alanı */}
          <div className="p-4 border-t border-white/5">
            <div className="flex gap-2 items-end bg-[var(--color-card)] rounded-xl border border-white/10 focus-within:border-[var(--color-accent)]/50 transition-colors p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Projeyi revize etmek için komut yazın..."
                rows={2}
                className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] resize-none outline-none leading-relaxed px-2 py-1"
              />
              <div className="flex items-center gap-2 shrink-0 pb-1">
                <button
                  onClick={() => {
                    setInput("");
                    setMessages((prev) => prev.slice(0, 1));
                  }}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
                  aria-label="Sohbeti sıfırla"
                  title="Sıfırla"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Gönder"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] text-center mt-2">
              Enter ile gönder · Shift+Enter yeni satır
            </p>
          </div>
        </div>

        {/* Sağ — Belge Önizleme */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sekme Bar */}
          {sections.length > 0 && (
            <div className="flex gap-1 px-6 pt-4 pb-0 border-b border-white/5 overflow-x-auto">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(i)}
                  className={cn(
                    "text-xs font-medium px-3 py-2 rounded-t-lg whitespace-nowrap border-b-2 transition-all",
                    activeSection === i
                      ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}

          {/* İçerik */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{project.type}</span>
                  {project.budget && (
                    <>
                      <span>·</span>
                      <span>{project.budget}</span>
                    </>
                  )}
                </div>
              </div>

              {sections.length > 0 ? (
                <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    {sections[activeSection]?.title}
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line text-sm">
                      {sections[activeSection]?.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8">
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    {project.summary ?? "Bu proje için henüz içerik eklenmemiş."}
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15 rounded-xl flex items-start gap-3">
                <Sparkles size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Sol paneldeki AI komutlarını kullanarak bu bölümü revize edebilirsiniz. Değişiklikler burada gerçek zamanlı olarak yansıyacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
