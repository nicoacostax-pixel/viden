"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function NavLinks() {
  const { isAdmin, isLoggedIn } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `transition-colors ${
      isActive(href)
        ? "text-foreground font-semibold underline decoration-accent decoration-2 underline-offset-4"
        : "text-muted hover:text-foreground"
    }`;

  return (
    <nav className="hidden sm:flex items-center gap-5 text-sm">
      <Link href="/" className={linkClass("/")}>Mercados</Link>
      {isLoggedIn && (
        <Link
          href="/crear-mercado"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isActive("/crear-mercado")
              ? "bg-accent-hover text-white ring-2 ring-accent/40"
              : "bg-accent hover:bg-accent-hover text-white"
          }`}
        >
          + Crear
        </Link>
      )}
      <Link href="/portfolio" className={linkClass("/portfolio")}>Portfolio</Link>
      <Link href="/juegos" className={linkClass("/juegos")}>Juegos</Link>
      {isLoggedIn && (
        <Link href="/mis-mercados" className={linkClass("/mis-mercados")}>Mis mercados</Link>
      )}
      {isAdmin && (
        <Link href="/admin" className={linkClass("/admin")}>Admin</Link>
      )}
    </nav>
  );
}
