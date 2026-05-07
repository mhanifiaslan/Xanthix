'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Thin top-of-page progress bar that shows whenever an internal navigation
 * is in flight. Listens for left-clicks on same-origin <a> elements; clears
 * itself the moment Next.js's pathname updates. Without this, server-component
 * navigations feel unresponsive — users click the link, nothing visibly
 * changes for ~500ms while the server renders, and they double-click.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      const target = anchor.getAttribute('target');
      if (target && target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same path, only hash change → not a real nav.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      setPending(true);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      // Failsafe: never leave the bar stuck if pathname update is missed.
      safetyTimeoutRef.current = setTimeout(() => setPending(false), 8000);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setPending(false);
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, [pathname]);

  if (!pending) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none overflow-hidden"
    >
      <div className="absolute inset-0 bg-[var(--color-accent)]/15" />
      <motion.div
        className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent"
        initial={{ x: '-50%' }}
        animate={{ x: '350%' }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
