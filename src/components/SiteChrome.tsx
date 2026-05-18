"use client";
import { usePathname } from "next/navigation";

const CHROMELESS = ["/inversores"];

export function SiteHeader({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (CHROMELESS.includes(p)) return null;
  return <>{children}</>;
}

export function SiteFooter({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (CHROMELESS.includes(p)) return null;
  return <>{children}</>;
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (CHROMELESS.includes(p)) {
    return <main>{children}</main>;
  }
  return <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>;
}

export function SiteBackButton({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (CHROMELESS.includes(p)) return null;
  return <>{children}</>;
}
