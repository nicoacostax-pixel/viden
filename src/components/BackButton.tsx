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
      className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-alt border border-border text-foreground hover:bg-border transition-colors shrink-0"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
