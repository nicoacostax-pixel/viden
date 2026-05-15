"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function NavLinks() {
  const { isAdmin } = useAuth();
  return (
    <nav className="hidden sm:flex gap-5 text-sm text-muted">
      <Link href="/" className="hover:text-foreground transition-colors">Mercados</Link>
      <Link href="/portfolio" className="hover:text-foreground transition-colors">Portfolio</Link>
      <Link href="/juegos" className="hover:text-foreground transition-colors">Juegos</Link>
      {isAdmin && (
        <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
      )}
    </nav>
  );
}
