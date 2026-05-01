"use client";

import UserCard from "./UserCard";
import CreditDisplay from "./CreditDisplay";
import NavMenu from "./NavMenu";

export default function Sidebar() {
  return (
    <aside className="w-[280px] bg-[var(--color-sidebar)] h-full flex flex-col border-r border-white/5 flex-shrink-0">
      <div className="flex-1 flex flex-col pt-4 overflow-y-auto">
        <div className="px-2">
          <UserCard />
        </div>
        <CreditDisplay />
        
        <div className="px-4 mb-3">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Hızlı Proje Türleri
          </h3>
        </div>
        
        <NavMenu />
      </div>
    </aside>
  );
}
