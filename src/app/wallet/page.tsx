"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiDeposit, apiBuyVdn, ApiError } from "@/lib/custodialApi";

const VDN_PRICE = 0.001;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2) {
  return n.toLocaleString("es", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Deposit modal ─────────────────────────────────────────────────────────────

function DepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState<"demo" | "stripe" | "spei">("demo");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done,    setDone]    = useState(false);

  async function handleDeposit() {
    if (!token || !amount || Number(amount) < 5) {
      setError("Mínimo $5 USD"); return;
    }
    setLoading(true); setError(null);
    try {
      await apiDeposit(token, Number(amount), method);
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al depositar");
    } finally { setLoading(false); }
  }

  if (done) return (
    <Modal title="Depositar USD" onClose={onClose}>
      <div className="text-center py-6 space-y-3">
        <div className="text-5xl">✅</div>
        <p className="text-success font-bold text-lg">¡Depósito acreditado!</p>
        <p className="text-muted text-sm">${amount} USD añadidos a tu cuenta</p>
      </div>
    </Modal>
  );

  return (
    <Modal title="Depositar USD" onClose={onClose}>
      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <div>
        <label className="block text-xs text-muted mb-1.5">Cantidad (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          <input type="number" min="5" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="50.00"
            className="w-full pl-8 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
        {amount && Number(amount) >= 5 && (
          <p className="text-xs text-success mt-1">
            Recibirás {(Number(amount) / VDN_PRICE).toLocaleString()} VDN disponibles
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted mb-2">Método de pago</label>
        <div className="space-y-2">
          {([
            { id: "demo", icon: "🧪", label: "Demo (testnet)", desc: "Acredita directamente — solo para pruebas", available: true },
            { id: "stripe", icon: "💳", label: "Tarjeta de crédito", desc: "Próximamente via Stripe", available: false },
            { id: "spei", icon: "🏦", label: "SPEI", desc: "Próximamente — transferencia bancaria MX", available: false },
          ] as const).map(m => (
            <button key={m.id} onClick={() => m.available && setMethod(m.id)}
              disabled={!m.available}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                method === m.id && m.available
                  ? "border-accent bg-accent/5"
                  : m.available
                  ? "border-border hover:border-border/80"
                  : "border-border opacity-40 cursor-not-allowed"
              }`}>
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted">{m.desc}</p>
              </div>
              {method === m.id && m.available && (
                <div className="w-4 h-4 rounded-full bg-accent flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleDeposit} disabled={loading || !amount || Number(amount) < 5}
        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
        {loading ? "Procesando…" : `Depositar $${amount || "0"} USD`}
      </button>
    </Modal>
  );
}

// ── Buy VDN modal ─────────────────────────────────────────────────────────────

function BuyVdnModal({ balanceUsd, onClose, onSuccess }: { balanceUsd: number; onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [amount,  setAmount]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done,    setDone]    = useState<number | null>(null);

  const vdnAmount = amount ? Number(amount) / VDN_PRICE : 0;

  async function handleBuy() {
    if (!token || !amount || Number(amount) <= 0) return;
    if (Number(amount) > balanceUsd) { setError("Saldo USD insuficiente"); return; }
    setLoading(true); setError(null);
    try {
      const res = await apiBuyVdn(token, Number(amount));
      setDone(res.vdn_purchased);
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al comprar VDN");
    } finally { setLoading(false); }
  }

  if (done !== null) return (
    <Modal title="Comprar VDN" onClose={onClose}>
      <div className="text-center py-6 space-y-3">
        <div className="text-5xl">🪙</div>
        <p className="text-success font-bold text-lg">¡VDN comprados!</p>
        <p className="text-accent-light text-2xl font-black">+{done.toLocaleString()} VDN</p>
        <p className="text-muted text-sm">Añadidos a tu balance</p>
      </div>
    </Modal>
  );

  return (
    <Modal title="Comprar VDN" onClose={onClose}>
      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <div className="p-3 rounded-lg bg-surface-alt border border-border text-sm flex justify-between">
        <span className="text-muted">Tu saldo USD</span>
        <span className="font-semibold text-foreground">${fmt(balanceUsd)}</span>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Gastar (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          <input type="number" min="0.001" max={balanceUsd} step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="10.00"
            className="w-full pl-8 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      {/* Live preview */}
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Precio por VDN</span>
          <span className="text-foreground font-medium">$0.001 USD</span>
        </div>
        <div className="border-t border-accent/20 pt-2 flex justify-between">
          <span className="text-muted text-sm">Recibirás</span>
          <span className="text-accent-light font-black text-lg">
            {vdnAmount > 0 ? vdnAmount.toLocaleString("es", { maximumFractionDigits: 0 }) : "—"} VDN
          </span>
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2">
        {[5, 10, 50].map(v => (
          <button key={v} onClick={() => setAmount(String(Math.min(v, balanceUsd)))}
            disabled={balanceUsd < v}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-accent transition-colors disabled:opacity-40">
            ${v}
          </button>
        ))}
        <button onClick={() => setAmount(String(balanceUsd))} disabled={balanceUsd <= 0}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-accent transition-colors disabled:opacity-40">
          MAX
        </button>
      </div>

      <button onClick={handleBuy} disabled={loading || !amount || Number(amount) <= 0 || Number(amount) > balanceUsd}
        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
        {loading ? "Comprando…" : `Comprar ${vdnAmount > 0 ? vdnAmount.toLocaleString("es", { maximumFractionDigits: 0 }) + " VDN" : "VDN"}`}
      </button>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { user, token, balance, isLoggedIn, isLoading, refreshBalance } = useAuth();
  const router = useRouter();

  const [modal, setModal] = useState<"deposit" | "buy" | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

  const refresh = useCallback(async () => {
    await refreshBalance();
  }, [refreshBalance]);

  if (isLoading || !user || !isLoggedIn) {
    return <div className="text-center text-muted py-20">Cargando…</div>;
  }

  const usd = balance?.balance_usd ?? user.balance_usd;
  const vdn = balance?.balance_vdn ?? user.balance_vdn;
  const vesting = balance?.balance_vdn_vesting ?? user.balance_vdn_vesting;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mi Wallet</h1>
        <span className="text-sm text-muted">@{user.username}</span>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* USD balance */}
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted mb-1">Balance USD</p>
              <p className="text-4xl font-black text-foreground">${fmt(usd)}</p>
            </div>
            <span className="text-3xl">💵</span>
          </div>
          <button onClick={() => setModal("deposit")}
            className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors">
            + Depositar USD
          </button>
        </div>

        {/* VDN balance */}
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted mb-1">Balance VDN</p>
              <p className="text-4xl font-black text-accent-light">
                {vdn.toLocaleString("es", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-muted mt-1">≈ ${fmt(vdn * VDN_PRICE)} USD</p>
            </div>
            <span className="text-3xl">🪙</span>
          </div>
          {vesting > 0 && (
            <div className="mb-3 p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning flex justify-between">
              <span>⏳ En vesting</span>
              <span className="font-semibold">{vesting.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
            </div>
          )}
          <button onClick={() => setModal("buy")} disabled={usd <= 0}
            className="w-full py-2.5 rounded-xl bg-success hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-40">
            Comprar VDN con USD
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-border text-center">
          <p className="text-xs text-muted mb-1">Total depositado</p>
          <p className="font-bold text-foreground">${fmt(balance?.total_deposited_usd ?? 0)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border text-center">
          <p className="text-xs text-muted mb-1">Total apostado</p>
          <p className="font-bold text-foreground">
            {(balance?.total_wagered_vdn ?? 0).toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link href="/" className="flex-1 py-3 rounded-xl bg-surface border border-border text-sm text-center font-medium hover:border-accent transition-colors text-foreground">
          🎯 Ver Mercados
        </Link>
        <Link href="/portfolio" className="flex-1 py-3 rounded-xl bg-surface border border-border text-sm text-center font-medium hover:border-accent transition-colors text-foreground">
          📊 Mi Portfolio
        </Link>
      </div>

      {/* Referral code */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <p className="text-xs text-muted mb-2">Tu código de referido</p>
        <div className="flex items-center gap-3">
          <code className="text-lg font-black text-accent-light tracking-widest">
            {user.referral_code}
          </code>
          <button onClick={() => navigator.clipboard.writeText(user.referral_code)}
            className="text-xs text-muted hover:text-foreground border border-border px-2 py-1 rounded-md transition-colors">
            Copiar
          </button>
        </div>
        <p className="text-xs text-muted mt-1">Comparte este código — tú y tu referido reciben 200 VDN extra</p>
      </div>

      {/* Modals */}
      {modal === "deposit" && (
        <DepositModal onClose={() => setModal(null)} onSuccess={refresh} />
      )}
      {modal === "buy" && (
        <BuyVdnModal balanceUsd={usd} onClose={() => setModal(null)} onSuccess={refresh} />
      )}
    </div>
  );
}
