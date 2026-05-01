"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "user" | "admin";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
}

const MOCK_CREDENTIALS: Record<string, { password: string; user: AuthUser }> = {
  "kullanici@test.com": {
    password: "test123",
    user: { id: "u1", name: "M. Hanifi ASLAN", email: "kullanici@test.com", role: "user" },
  },
  "admin@test.com": {
    password: "admin123",
    user: { id: "admin1", name: "Admin", email: "admin@test.com", role: "admin" },
  },
};

const AUTH_KEY = "pm_auth_user";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const record = MOCK_CREDENTIALS[email.toLowerCase()];
    if (!record || record.password !== password) {
      return { success: false, error: "Email veya sifre yanlis." };
    }
    setUser(record.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(record.user));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
