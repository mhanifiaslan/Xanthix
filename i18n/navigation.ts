import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware drop-in replacements for next/link, useRouter, etc.
// Import from "@/i18n/navigation" instead of "next/link" / "next/navigation"
// when you need URLs that automatically respect the active locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
