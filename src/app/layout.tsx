import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { WalletButton } from "@/components/WalletButton";
import { WrongNetworkBanner } from "@/components/WrongNetworkBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Viden — Mercado de Predicciones",
  description: "Apuesta con $VDN en el futuro de los eventos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Runs before paint — reads localStorage and applies dark class to avoid flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('viden-theme');document.documentElement.classList.toggle('dark',!t||t==='dark');})();` }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
          <Web3Provider>
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Image src="/icon.png" alt="Viden" width={32} height={32} className="rounded-md" priority />
                    <span className="text-xl font-bold text-foreground">Viden</span>
                  </Link>
                  <NavLinks />
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <WalletButton />
                </div>
              </div>
            </header>
            <WrongNetworkBanner />
            <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
          </Web3Provider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
