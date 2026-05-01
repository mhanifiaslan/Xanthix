"use client";

import { Search, Bell } from "lucide-react";
import { userProfile } from "@/lib/mock-data";

export default function DashboardHeader() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  };

  return (
    <header className="flex items-center justify-between py-6 px-8 bg-[var(--color-background)] sticky top-0 z-10 border-b border-white/5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          {getGreeting()} {userProfile.name.split(' ')[0]} <span className="text-xl">👋</span>
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Bugün 3 aktif projen var
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
          <input 
            type="text" 
            placeholder="Projelerde ara..." 
            className="w-64 bg-[var(--color-card)] border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
          />
        </div>
        
        <button 
          className="relative p-2 rounded-full hover:bg-[var(--color-card)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Bildirimler"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-background)]"></span>
        </button>
      </div>
    </header>
  );
}
