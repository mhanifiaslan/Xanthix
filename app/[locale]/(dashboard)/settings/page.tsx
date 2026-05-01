"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { User, Shield, Sliders, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profil", icon: User },
  { id: "security", label: "Guvenlik", icon: Shield },
  { id: "preferences", label: "Tercihler", icon: Sliders },
  { id: "notifications", label: "Bildirimler", icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-full pb-12">
      <header className="px-8 py-6 border-b border-white/5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Ayarlar</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Hesap bilgilerini ve tercihlerini yonet.</p>
      </header>

      <div className="px-8 py-8 max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--color-card)] rounded-xl border border-white/5 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <tab.icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Profil Fotografi</h2>
              <div className="flex items-center gap-4">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.name ?? user.email ?? ""}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 border-2 border-[var(--color-accent)]/30 flex items-center justify-center text-xl font-bold text-[var(--color-accent)]">
                    {initial}
                  </div>
                )}
                <div>
                  <button
                    onClick={() => console.log("Fotograf yukle")}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-white/20 transition-colors"
                  >
                    Fotograf Degistir
                  </button>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">JPG, PNG veya GIF. Maks 2 MB.</p>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Kisisel Bilgiler</h2>
              {[
                { label: "Ad Soyad", value: user?.name ?? "", type: "text" },
                { label: "Email", value: user?.email ?? "", type: "email" },
                { label: "Telefon", value: "", placeholder: "opsiyonel", type: "tel" },
                { label: "Kurum", value: "", placeholder: "Okul, STK veya sirket", type: "text" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
                  />
                </div>
              ))}
              <div className="pt-2">
                <button
                  onClick={() => console.log("Profil kaydedildi")}
                  className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Degisiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Sifre Degistir</h2>
              {["Mevcut Sifre", "Yeni Sifre", "Yeni Sifre (Tekrar)"].map((label) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{label}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
                  />
                </div>
              ))}
              <button
                onClick={() => console.log("Sifre degistirildi")}
                className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Sifreyi Guncelle
              </button>
            </div>

            <div className="bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-[var(--color-error)] mb-2">Tehlikeli Bolge</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">Hesabinizi silmek geri alinamaz bir islemdir.</p>
              <button
                onClick={() => console.log("Hesap silme islemi baslatildi")}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
              >
                Hesabimi Sil
              </button>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-6">
            {[
              { label: "Varsayilan AI Modeli", options: ["claude-sonnet-4.6", "gpt-4", "gemini-2.5-pro"] },
              { label: "Yanitlarda Dil Tonu", options: ["Akademik", "Profesyonel", "Samimi"] },
              { label: "Yanitlarda Uzunluk", options: ["Kisa", "Orta", "Ayrintili"] },
              { label: "Ilk Acilis Sayfasi", options: ["Ana Sayfa", "Projelerim"] },
            ].map((pref) => (
              <div key={pref.label}>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{pref.label}</label>
                <select className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all">
                  {pref.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button
              onClick={() => console.log("Tercihler kaydedildi")}
              className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Kaydet
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-6 space-y-4">
            {[
              { label: "Proje tamamlandiginda email", checked: true },
              { label: "Kredi azaldiginda uyari", checked: true },
              { label: "Yeni ozellik duyurulari", checked: false },
              { label: "Haftalik ozet emaili", checked: true },
              { label: "Pazarlama iletisimi", checked: false },
            ].map((notif) => (
              <label key={notif.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 cursor-pointer group">
                <span className="text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  {notif.label}
                </span>
                <div className={cn(
                  "relative w-10 h-5 rounded-full transition-colors border",
                  notif.checked ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "bg-[var(--color-background)] border-white/10"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    notif.checked ? "left-[22px]" : "left-0.5"
                  )} />
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
