import AnimatedBackground from '@/components/landing/AnimatedBackground';

/**
 * Shared shell for auth pages (login / register / forgot). Provides the same
 * animated background and centered card frame as the public landing.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-[var(--color-background)] flex items-center justify-center px-4 py-12">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
