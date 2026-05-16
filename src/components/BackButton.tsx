'use client';
import { useRouter, usePathname } from 'next/navigation';

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/') return null;

  return (
    <button
      onClick={() => router.back()}
      aria-label="Volver"
      className="sm:hidden fixed bottom-6 left-4 z-50 flex items-center gap-1.5 pl-3 pr-4 h-11 rounded-full shadow-lg text-sm font-semibold text-foreground bg-surface border border-border backdrop-blur-sm"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Volver
    </button>
  );
}
