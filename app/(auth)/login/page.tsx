"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bot, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 600));

    const result = login(email, password);
    if (!result.success) {
      setError(result.error ?? "Bir hata olustu.");
      setIsLoading(false);
      return;
    }

    // Redirect based on role
    if (email.toLowerCase() === "admin@test.com") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 mb-4">
          <Bot size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Projectmenager</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Yapay zeka destekli proje yonetim platformu
        </p>
      </div>

      {/* Card */}
      <div className="bg-[var(--color-card)] rounded-2xl border border-white/5 p-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
          Hesabiniza giris yapin
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="kullanici@test.com"
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Sifre
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-xl px-4 py-2.5 pr-11 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Giris yapiliyor...</>
            ) : "Giris Yap"}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 pt-5 border-t border-white/5 space-y-2">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Demo Hesaplar
          </p>
          <button
            onClick={() => { setEmail("kullanici@test.com"); setPassword("test123"); }}
            className="w-full text-left px-4 py-3 rounded-xl bg-[var(--color-background)] border border-white/5 hover:border-white/10 transition-colors group"
          >
            <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
              Kullanici Girisi
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              kullanici@test.com / test123
            </p>
          </button>
          <button
            onClick={() => { setEmail("admin@test.com"); setPassword("admin123"); }}
            className="w-full text-left px-4 py-3 rounded-xl bg-[var(--color-background)] border border-white/5 hover:border-white/10 transition-colors group"
          >
            <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
              Admin Girisi
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              admin@test.com / admin123
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
