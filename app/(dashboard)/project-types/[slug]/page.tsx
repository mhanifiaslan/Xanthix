"use client";

import { useParams, useRouter } from "next/navigation";
import { projectTypes, mockProjects } from "@/lib/mock-data";
import { GraduationCap, Microscope, Building2, Plus, ArrowRight, Calendar, Wallet, Globe } from "lucide-react";
import RecentProjectCard from "@/components/dashboard/RecentProjectCard";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  GraduationCap, Microscope, Building2,
};

const typeDetails: Record<string, {
  about: string[];
  whoCanApply: string;
  callDates: string;
  language: string;
  tips: string[];
}> = {
  ka210: {
    about: [
      "Erasmus+ KA210, Avrupa Birligi'nin egitim ve genclik alanindaki kucuk ortaklik hibe programidir.",
      "Bu program sayesinde okullar, STK'lar ve kamu kurumları Avrupa'daki ortaklarıyla yenilikci projeler gelistirebilir.",
      "Hibe miktari 30.000 ile 60.000 EUR arasında degismekte olup 24 aya kadar surebilir.",
    ],
    whoCanApply: "Okullar, sivil toplum kuruluslari, belediyeler ve diger kamu kurumlari (en az 2 ortak ulke gerekli).",
    callDates: "Yilda 2 kez: Mart ve Ekim aylarinda acilis. Son basvuru tarihi genellikle Nisan ve Kasim.",
    language: "Turkce ve Ingilizce (resmi basvuru Ingilizce).",
    tips: [
      "Bu yil yatay oncelikler: iklim degisikligi ve dijital donusum",
      "Ortak kurum kalitesi degerlendirmede kritik — iyi bilinen kurumlarla calis",
      "Butce gercekci ve ayrıntılı olmali",
      "Hedef grup acik ve olculmebilir olmali",
      "Onceki AB projesi deneyimi avantaj saglar",
    ],
  },
  "tubitak-2209a": {
    about: [
      "TUBITAK 2209-A, Turkiye'deki universite ogrencilerine yonelik araştirma projeleri destek programidir.",
      "Lisans ve lisansustu ogrenciler bu program aracilığıyla bilimsel calismalarini finanse edebilir.",
      "Desteklenecek proje butcesi 15.000 TL'ye kadar cikmaktadir.",
    ],
    whoCanApply: "Turkiye'deki universitelerde kayitli lisans ve lisansustu ogrenciler (danisman ogretim uyesi gerekli).",
    callDates: "Yilda 2 kez: Ocak ve Haziran. Basvurular online sistem uzerinden yapilir.",
    language: "Turkce.",
    tips: [
      "Tez konunuzla baglantili bir arastirma sectiyseniz avantajlisiniz",
      "Danisman ogretim uyesinin deneyimi ve yayınları onemli",
      "Arastirma metodolojisi net ve uygulanabilir olmali",
      "Literature tarama bolumu guclu olmali",
      "Butce kalemlerini detayli aciklayin",
    ],
  },
  "kalkinma-ajansi": {
    about: [
      "Kalkinma ajanslari, bolgesel farklilikları azaltmak ve ekonomik buyumeyi desteklemek icin cesitli hibe programlari yurutur.",
      "Her il bolgesi kendi kalkinma ajansina sahiptir ve her biri farkli odak alanlari olan cagrilar duzenler.",
      "Hibe miktarlari 100.000 TL'den 5 milyon TL'ye kadar ulasabilmektedir.",
    ],
    whoCanApply: "KOBIler, yerel yonetimler, universiteler, STKlar ve kooperatifler (bolgeye gore farklilik gosterir).",
    callDates: "Her ajansin ayrı takvimi vardır. Yilda 1-3 kez cagri acilir. Bolgesel kalkınma planına uyum sart.",
    language: "Turkce.",
    tips: [
      "Bolgenin kalkınma planindaki oncelik alanlariyla uyumu kritik",
      "Istihdam yaratma ve katma deger on planda tutulmali",
      "Sozlesmeli personel ve satin alma kurallarina dikkat",
      "Izleme ve degerlendirme plani guclu olmali",
      "Ortak kurumlarin katkilari belgelenebilir olmali",
    ],
  },
};

export default function ProjectTypePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const type = projectTypes.find((t) => t.id === slug);
  const details = typeDetails[slug];

  if (!type || !details) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-secondary)]">Proje turu bulunamadi.</p>
      </div>
    );
  }

  const IconComponent = iconMap[type.icon] || GraduationCap;
  const typeProjects = mockProjects.filter((p) => p.typeId === slug);

  return (
    <div className="min-h-full pb-12">
      {/* Hero Header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-[var(--color-accent)]/5 to-transparent">
        <div className="px-8 py-8 max-w-5xl mx-auto">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center shrink-0">
              <IconComponent size={26} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{type.name}</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">{type.description}</p>

              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] border border-white/5 px-3 py-1.5 rounded-full">
                  <Wallet size={12} className="text-[var(--color-accent)]" />
                  {type.budget}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] border border-white/5 px-3 py-1.5 rounded-full">
                  <Calendar size={12} className="text-[var(--color-warning)]" />
                  {details.callDates.split(".")[0]}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] border border-white/5 px-3 py-1.5 rounded-full">
                  <Globe size={12} className="text-[var(--color-success)]" />
                  {details.language}
                </div>
              </div>
            </div>
            <button
              onClick={() => console.log(`Yeni ${type.name} projesi baslatildi`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
            >
              <Plus size={16} />
              Yeni Proje Basla
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sol — Detaylar */}
          <div className="lg:col-span-2 space-y-6">

            {/* Program hakkinda */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Program Hakkinda</h2>
              <div className="space-y-3">
                {details.about.map((para, i) => (
                  <p key={i} className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{para}</p>
                ))}
              </div>
            </div>

            {/* Kimler basvurabilir */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Kimler Basvurabilir?</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{details.whoCanApply}</p>
            </div>

            {/* Ipuclari */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Basari Icin 5 Ipucu</h2>
              <ul className="space-y-3">
                {details.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sag — Platform kullanimi */}
          <div className="space-y-6">
            {/* Platform ile neler yapabilirsin */}
            <div className="bg-gradient-to-b from-[var(--color-accent)]/10 to-[var(--color-card)] rounded-2xl border border-[var(--color-accent)]/20 p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Platform ile Neler Yapabilirsin?
              </h2>
              <ul className="space-y-2.5">
                {[
                  "Tam basvuru taslagi (8-10 bolum)",
                  "Degerlendirici perspektifli analiz",
                  "Butce planlama asistani",
                  "Ortak profil olusturma",
                  "Yapay zeka revizyonlari",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tahmini maliyet</p>
                <p className="text-2xl font-bold text-[var(--color-accent)] tabular-nums">
                  ~{type.credits} <span className="text-sm font-normal text-[var(--color-text-secondary)]">kredi</span>
                </p>
              </div>
            </div>

            {/* Cagri tarihleri */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Cagri Tarihleri</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{details.callDates}</p>
            </div>
          </div>
        </div>

        {/* Bu turdeki projelerim */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Bu Turdeki Projelerim
              {typeProjects.length > 0 && (
                <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">({typeProjects.length})</span>
              )}
            </h2>
            {typeProjects.length > 0 && (
              <button
                onClick={() => router.push("/projects")}
                className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
              >
                Tumunu gor <ArrowRight size={14} />
              </button>
            )}
          </div>

          {typeProjects.length > 0 ? (
            <div className="flex gap-5 overflow-x-auto pb-4">
              {typeProjects.map((p) => (
                <div key={p.id} className="snap-start shrink-0">
                  <RecentProjectCard project={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8 text-center">
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">Bu turde henuz proje olusturmadiniz.</p>
              <button
                onClick={() => console.log(`Yeni ${type.name} projesi baslatildi`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus size={15} /> Ilk Projeni Olustur
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
