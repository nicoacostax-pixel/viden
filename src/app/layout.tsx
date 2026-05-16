import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { WalletButton } from "@/components/WalletButton";
import { WrongNetworkBanner } from "@/components/WrongNetworkBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { BackButton } from "@/components/BackButton";
import PWAManager from "@/components/PWAManager";
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Viden" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
          <Web3Provider>
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-6">
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
            <footer className="border-t border-border mt-8">
              <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
                <span>© 2026 Viden · Todos los derechos reservados</span>
                <div className="flex items-center gap-4">
                  <Link href="/terminos" className="hover:text-foreground transition-colors">Términos y Condiciones</Link>
                  <Link href="/privacidad" className="hover:text-foreground transition-colors">Política de Privacidad</Link>
                  <a href="mailto:legal@viden.app" className="hover:text-foreground transition-colors">legal@viden.app</a>
                </div>
              </div>
            </footer>
          </Web3Provider>
          </AuthProvider>
        </ThemeProvider>
        <PWAManager />
        <BackButton />
      </body>
    </html>
  );
}
