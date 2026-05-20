"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useAuth } from "@/context/AuthContext";

// ── Wallet connect explainer modal ────────────────────────────────────────────

const SITE_URL = "https://frontend-three-rho-31.vercel.app";

function WalletConnectModal({ onConnect, onClose }: { onConnect: () => void; onClose: () => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const [inMetaMask, setInMetaMask] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
    setInMetaMask(/MetaMaskMobile/i.test(ua));
  }, []);

  const mmDeepLink = `https://metamask.app.link/dapp/${SITE_URL.replace(/^https?:\/\//, "")}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦊</span>
            <h2 className="text-base font-bold text-foreground">Conectar una wallet</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-alt transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Una <strong className="text-foreground">wallet</strong> te permite retirar tokens VDN a tu propia dirección on-chain.{" "}
            <strong className="text-foreground">No es necesaria para jugar</strong> — tu saldo custodial funciona sin ella.
          </p>

          {isMobile && !inMetaMask ? (
            /* ── Mobile: not inside MetaMask browser ── */
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <p className="text-xs font-semibold text-amber-400 mb-1">En móvil no hay extensiones</p>
                <p className="text-xs text-muted leading-relaxed">
                  Para conectar MetaMask desde el móvil necesitas abrir Viden desde el <strong className="text-foreground">navegador integrado de la app MetaMask</strong>.
                </p>
              </div>
              {[
                { n: "1", title: "Descarga MetaMask", desc: "App gratuita para iOS y Android." },
                { n: "2", title: "Abre el navegador de MetaMask", desc: 'Toca el icono de brújula en la barra inferior de la app.' },
                { n: "3", title: "Navega a Viden", desc: "Escribe la dirección de Viden en la barra de MetaMask y conéctate." },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent-light text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted">{s.desc}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <a href="https://apps.apple.com/app/metamask/id1438144202" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-surface-alt border border-border text-xs font-semibold text-foreground text-center hover:border-accent transition-colors">
                   iOS App Store
                </a>
                <a href="https://play.google.com/store/apps/details?id=io.metamask" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-surface-alt border border-border text-xs font-semibold text-foreground text-center hover:border-accent transition-colors">
                   Google Play
                </a>
              </div>
              <a href={mmDeepLink} target="_blank" rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold text-center transition-colors">
                Abrir en MetaMask →
              </a>
            </div>
          ) : (
            /* ── Desktop or already inside MetaMask browser ── */
            <div className="space-y-3">
              {inMetaMask && (
                <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3">
                  <p className="text-xs font-semibold text-success">Estás en el navegador de MetaMask</p>
                  <p className="text-xs text-muted mt-0.5">Puedes conectarte directamente.</p>
                </div>
              )}
              {[
                { n: "1", title: "Instala MetaMask", desc: "Extensión gratuita para Chrome, Firefox o Brave.", href: "https://metamask.io/download/" },
                { n: "2", title: "Crea tu cuenta", desc: "Sigue los pasos en MetaMask y guarda tu frase secreta." },
                { n: "3", title: "Conéctate aquí", desc: "Haz clic en el botón de abajo y aprueba en MetaMask." },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent-light text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted">{s.desc}{" "}
                      {s.href && <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-accent-light underline underline-offset-2">metamask.io →</a>}
                    </p>
                  </div>
                </div>
              ))}
              <button onClick={() => { onClose(); onConnect(); }}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
                {inMetaMask ? "Conectar MetaMask" : "Ya tengo MetaMask — conectar"}
              </button>
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2 text-xs text-muted hover:text-foreground transition-colors">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Custodial user pill ───────────────────────────────────────────────────────

function CustodialUserMenu() {
  const { user, balance, logout, isAdmin, isLoggedIn } = useAuth();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [open,           setOpen]           = useState(false);
  const [closing,        setClosing]        = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); setClosing(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const closeSidebar = () => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 240);
  };

  if (!user) return null;
  const vdn = balance?.balance_vdn ?? user.balance_vdn;

  const doConnectWallet = () => {
    const connector = connectors.find(c => c.id === "injected") ?? connectors[0];
    if (connector) connect({ connector });
  };

  const handleConnectWallet = () => {
    closeSidebar();
    setTimeout(() => setShowWalletInfo(true), 260);
  };

  // ── Sidebar (mobile) ─────────────────────────────────────────────────────────
  const navItem = (href: string, icon: string, label: string, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link key={href} href={href} onClick={() => setOpen(false)}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-accent/15 text-accent-light"
            : "text-muted hover:text-foreground hover:bg-surface-alt"
        }`}>
        <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${
          active ? "bg-accent/20" : "bg-surface-alt group-hover:bg-border"
        }`}>{icon}</span>
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
      </Link>
    );
  };

  const sidebar = (
    <div className="fixed inset-0 z-[9999] sm:hidden" onClick={closeSidebar}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`} />
      <div
        className={`absolute right-0 top-0 h-full w-[300px] bg-background flex flex-col shadow-2xl ${closing ? "animate-slide-out-right" : "animate-slide-in-right"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent-light font-bold text-base shrink-0">
            {user.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-none">@{user.username}</p>
            <p className="text-xs text-accent-light mt-1 font-medium">
              {vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
              <span className="text-muted font-normal ml-1">≈ ${(vdn * 0.01).toFixed(2)}</span>
            </p>
          </div>
          <button onClick={closeSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-alt transition-colors shrink-0"
            aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Depositar CTA */}
        <div className="px-4 pb-3 shrink-0">
          <Link href="/wallet?open=deposit" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
            <span className="text-base">＋</span> Depositar
          </Link>
        </div>

        <div className="h-px bg-border mx-4 shrink-0" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted px-3 pb-1.5 pt-1">Explorar</p>
          {navItem("/", "🎯", "Mercados", true)}
          {navItem("/feed", "🌐", "Feed")}
          {navItem("/torneos", "🏆", "Torneos")}
          {navItem("/leaderboard", "🥇", "Ranking")}
          {navItem("/logros", "⭐", "Logros")}
          {navItem("/juegos", "🎮", "Juegos")}
          {navItem("/duelos", "⚔️", "Duelos")}

          {isLoggedIn && (
            <Link href="/crear-mercado" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors mt-1">
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-base">＋</span>
              Crear mercado
            </Link>
          )}

          <div className="h-px bg-border my-2 mx-1" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted px-3 pb-1.5 pt-1">Mi cuenta</p>
          {navItem("/perfil", "👤", "Mi perfil")}
          {navItem("/portfolio", "📊", "Portfolio")}
          {navItem("/mis-mercados", "📋", "Mis mercados")}
          {navItem("/wallet", "💰", "Mi Wallet")}

          {isAdmin && (
            <>
              <div className="h-px bg-border my-2 mx-1" />
              {navItem("/admin", "⚙️", "Admin")}
            </>
          )}

          {isConnected && (
            <>
              <div className="h-px bg-border my-2 mx-1" />
              <button onClick={() => { disconnect(); setOpen(false); }}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-alt transition-all w-full">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-alt group-hover:bg-border transition-all">
                  <span className="w-2 h-2 rounded-full bg-success" />
                </span>
                {address?.slice(0, 6)}…{address?.slice(-4)}
                <span className="ml-auto text-[11px] text-muted">Desconectar</span>
              </button>
            </>
          )}
          {!isConnected && (
            <>
              <div className="h-px bg-border my-2 mx-1" />
              <button onClick={handleConnectWallet}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-alt transition-all w-full">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-alt group-hover:bg-border transition-all text-base">🦊</span>
                Conectar wallet
              </button>
            </>
          )}
        </nav>

        {/* Cerrar sesión */}
        <div className="px-3 py-3 border-t border-border">
          <button onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Wallet explainer modal */}
      {mounted && showWalletInfo && createPortal(
        <WalletConnectModal
          onConnect={doConnectWallet}
          onClose={() => setShowWalletInfo(false)}
        />,
        document.body
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors"
      >
        <div className="flex flex-col items-end leading-none">
          <span className="text-xs font-semibold text-foreground">{user.username}</span>
          <span className="text-[10px] text-accent-light">
            {vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
            <span className="text-muted ml-1 hidden sm:inline">(${(vdn * 0.01).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
          </span>
        </div>
        <svg className={`w-3 h-3 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mobile: sidebar via portal */}
      {mounted && open && createPortal(sidebar, document.body)}

      {/* Desktop: dropdown */}
      {open && (
        <>
          <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="hidden sm:block absolute right-0 top-full mt-1 w-52 rounded-xl bg-surface border border-border shadow-xl z-50 overflow-hidden">
            <Link href="/perfil" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
              ✏️ Editar perfil
            </Link>
            <Link href="/wallet" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
              💰 Mi Wallet
            </Link>
            <Link href="/portfolio" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
              📊 Portfolio
            </Link>
            <Link href="/mis-mercados" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
              📋 Mis mercados
            </Link>
            <Link href="/logros" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
              ⭐ Logros
            </Link>
            <div className="border-t border-border" />
            {isConnected ? (
              <button onClick={() => { disconnect(); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                {address?.slice(0, 6)}…{address?.slice(-4)}
                <span className="ml-auto text-xs text-muted">Desconectar</span>
              </button>
            ) : (
              <button onClick={handleConnectWallet}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground flex items-center gap-2">
                🦊 Conectar wallet
              </button>
            )}
            <div className="border-t border-border" />
            <button onClick={() => { logout(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WalletButton() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <div className="w-20 h-9 rounded-lg bg-surface-alt animate-pulse" />;
  }

  if (isLoggedIn) {
    return <CustodialUserMenu />;
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login"
        className="px-3 py-2 rounded-lg border border-border bg-surface-alt text-sm font-medium hover:border-accent transition-colors text-foreground">
        Entrar
      </Link>
      <Link href="/registro"
        className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
        Registrarse
      </Link>
    </div>
  );
}
