"use client";

import { userProfile } from "@/lib/mock-data";

export default function CreditDisplay() {
  return (
    <div className="mb-6 px-4">
      <div className="bg-[var(--color-card)] rounded-xl p-4 border border-white/5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs text-[var(--color-text-secondary)] block mb-1">
              {userProfile.plan}
            </span>
            <span className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
              {userProfile.credits}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] ml-1">kredi</span>
          </div>
        </div>
        <button 
          onClick={() => console.log('Kredi yükle tıklandı')}
          className="w-full py-2 px-4 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] text-sm font-medium hover:bg-[var(--color-accent)] hover:text-white transition-colors"
        >
          Kredi Yükle
        </button>
      </div>
    </div>
  );
}
