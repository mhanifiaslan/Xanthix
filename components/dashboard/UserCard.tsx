"use client";

import { LogOut } from "lucide-react";
import { userProfile } from "@/lib/mock-data";

export default function UserCard() {
  return (
    <div className="group flex items-center justify-between p-4 mb-4 rounded-xl transition-colors hover:bg-[var(--color-card)] cursor-pointer">
      <div className="flex items-center gap-3">
        <img
          src={userProfile.avatarUrl}
          alt={userProfile.name}
          className="w-10 h-10 rounded-full object-cover border border-white/10"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {userProfile.name}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {userProfile.email}
          </span>
        </div>
      </div>
      <button 
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        aria-label="Çıkış yap"
        onClick={() => console.log('Logout clicked')}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
