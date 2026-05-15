"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { useVDNBalance } from "@/hooks/useVDNToken";
import { VDN_TOKEN_ADDRESS } from "@/config/contracts";
import { useAuth } from "@/context/AuthContext";

// ── Add VDN to MetaMask ───────────────────────────────────────────────────────

function AddVDNButton() {
  const { data: walletClient } = useWalletClient();
  const [added, setAdded] = useState(false);

  async function handleClick() {
    try {
      await walletClient?.watchAsset({ type: "ERC20", options: { address: VDN_TOKEN_ADDRESS, symbol: "VDN", decimals: 18 } });
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch { /* user rejected */ }
  }

  if (added) return <span className="text-xs font-medium text-success whitespace-nowrap">¡Añadido! ✓</span>;

  return (
    <button onClick={handleClick} title="Añadir $VDN a MetaMask"
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted hover:text-foreground border border-border hover:border-accent bg-surface-alt transition-colors">
      <svg viewBox="0 0 35 33" className="w-3.5 h-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32.9 1 19.6 10.7l2.4-5.7L32.9 1Z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.1 1l13.2 9.8-2.3-5.8L2.1 1Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28.2 23.5l-3.5 5.4 7.5 2.1 2.1-7.3-6.1-.2ZM1.7 23.7 3.8 31l7.4-2.1-3.4-5.4-6.1.2Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m11.2 14.5-2 3.1 7.2.3-.3-7.7-4.9 4.3ZM23.8 14.5l-5-4.4-.2 7.8 7.2-.3-2-3.1ZM11.2 28.9l4.3-2.1-3.7-2.9-.6 5ZM19.5 26.8l4.3 2.1-.6-5-3.7 2.9Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m23.8 28.9-4.3-2.1.3 2.7v1l4-1.6ZM11.2 28.9l4 1.6v-1l.3-2.7-4.3 2.1Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m15.3 21.8-3.6-1.1 2.5-1.1 1.1 2.2ZM19.7 21.8l1.1-2.2 2.6 1.1-3.7 1.1Z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m11.2 28.9.6-5-4 .1 3.4 4.9ZM23.2 23.9l.6 5 3.4-4.9-4-.1ZM26 17.6l-7.2.3.7 3.9 1.1-2.2 2.6 1.1L26 17.6ZM11.7 20.7l2.5-1.1 1.1 2.2.7-3.9-7.2-.3 2.9 3.1Z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m9 17.6 3 5.9-.1-2.8L9 17.6ZM23.1 20.7l-.1 2.8 3-5.9-2.9 3.1ZM16.2 17.9l-.7 3.9.8 4.3.2-5.7-.3-2.5ZM18.8 17.9l-.2 2.5.1 5.7.9-4.3-.8-3.9Z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m19.7 21.8-.9 4.3.6.5 3.7-2.9.1-2.8-3.5.9ZM11.7 20.9l.1 2.8 3.7 2.9.6-.5-.8-4.3-3.6-.9Z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m19.8 30.5v-1l-.3-.3h-4l-.2.3v1l-4-1.6 1.4 1.2h5.6l1.4-1.2-1.9.4Z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m19.5 26.8-.6-.5h-3.8l-.6.5-.3 2.7.2-.3h4l.3.3-.2-2.7Z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M33.5 11.3 34.6 6l-1.7-5-12.4 9.2 4.8 4 6.7 2 1.5-1.7-.6-.5 1-.9-.8-.6 1-.8-.6-.4ZM.4 6l1.1 5.3-.7.5 1 .8-.8.6 1 .9-.6.5 1.5 1.7 6.7-2 4.8-4L2 1 .4 6Z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m32 19.3-6.7-2 2 3.1-3 5.9 4-.1h6.1l-2.4-6.9ZM9.7 17.3l-6.7 2-2.3 6.9h6.1l4 .1-3-5.9 1.9-3.1ZM18.8 17.9l.4-7.2 2-5.5h-8.5l1.9 5.5.5 7.2.1 2.5v5.7h3.8l.1-5.7-.3-2.5Z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Añadir VDN
    </button>
  );
}

// ── Custodial user pill ───────────────────────────────────────────────────────

function CustodialUserMenu() {
  const { user, balance, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const vdn = balance?.balance_vdn ?? user.balance_vdn;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors"
      >
        <div className="flex flex-col items-end leading-none">
          <span className="text-xs font-semibold text-foreground">{user.username}</span>
          <span className="text-[10px] text-accent-light">{vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
        </div>
        <svg className={`w-3 h-3 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-surface border border-border shadow-xl z-50 overflow-hidden">
          <Link href="/wallet" onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
            💰 Mi Wallet
          </Link>
          <Link href="/portfolio" onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-surface-alt transition-colors text-foreground">
            📊 Portfolio
          </Link>
          <div className="border-t border-border" />
          <button onClick={() => { logout(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ── MetaMask button (for on-chain users) ──────────────────────────────────────

function MetaMaskButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { balanceFormatted } = useVDNBalance();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-muted">On-chain</span>
          <span className="text-xs font-semibold text-accent-light">{balanceFormatted} VDN</span>
        </div>
        <div className="hidden sm:block"><AddVDNButton /></div>
        <button onClick={() => disconnect()}
          className="px-3 py-2 rounded-lg bg-surface-alt border border-border text-xs font-medium hover:border-accent transition-colors">
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
    );
  }

  const connector = connectors.find(c => c.id === "injected") ?? connectors[0];
  return (
    <button onClick={() => connect({ connector })} disabled={isPending}
      className="px-3 py-2 rounded-lg bg-surface-alt border border-border text-xs font-medium hover:border-accent transition-colors disabled:opacity-50">
      {isPending ? "Conectando…" : "MetaMask"}
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WalletButton() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <div className="w-24 h-9 rounded-lg bg-surface-alt animate-pulse" />;
  }

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <MetaMaskButton />
        <CustodialUserMenu />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <MetaMaskButton />
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
