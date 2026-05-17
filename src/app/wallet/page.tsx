"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "wagmi";
import { apiDeposit, apiCreatePaymentIntent, apiConfirmPayment, apiStripeConfirm, apiWithdraw, apiGetTransactions, ApiError, type DepositResult, type WithdrawResult, type Transaction } from "@/lib/custodialApi";
import { DailyStreak } from "@/components/DailyStreak";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const VDN_PRICE = 0.01;

function fmt(n: number, dec = 2) {
  return n.toLocaleString("es", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Coin rain animation ───────────────────────────────────────────────────────

function CoinRain({ vdn }: { vdn: number }) {
  const coins = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="relative flex flex-col items-center py-8 overflow-hidden select-none">
      {/* Falling coins */}
      {coins.map(i => (
        <span
          key={i}
          className="absolute text-2xl animate-bounce"
          style={{
            left: `${8 + (i % 6) * 16}%`,
            top:  `${Math.random() * 60}%`,
            animationDelay: `${(i * 0.12).toFixed(2)}s`,
            animationDuration: `${0.6 + (i % 3) * 0.2}s`,
          }}
        >
          🪙
        </span>
      ))}
      <div className="relative z-10 text-center space-y-2 mt-4">
        <div className="text-5xl font-black text-success animate-pulse">
          +{vdn.toLocaleString("es", { maximumFractionDigits: 0 })}
        </div>
        <div className="text-2xl font-bold text-success">VDN</div>
        <p className="text-sm text-muted">Acreditados a tu cuenta</p>
      </div>
    </div>
  );
}

// ── Tutorial para nuevos usuarios ────────────────────────────────────────────

function WalletTutorial({ onDeposit, onClose }: { onDeposit: () => void; onClose: () => void }) {
  const steps = [
    { icon: "🪙", title: "¿Qué son los VDN?",    desc: "VDN es la moneda de Viden. 1 VDN = $0.01 USD. Los usas para apostar en mercados de predicción." },
    { icon: "💳", title: "Agrega saldo",           desc: "Deposita desde $1 USD con tu tarjeta de crédito o débito. El saldo llega al instante." },
    { icon: "🎯", title: "Elige un mercado",       desc: "Explora los mercados activos y apuesta SÍ o NO según tu predicción." },
    { icon: "🏆", title: "Cobra tus ganancias",    desc: "Si aciertas, recibes tu apuesta más una parte del pool perdedor. Los VDN se acreditan automáticamente." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-accent/10 to-transparent border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <h2 className="text-sm font-bold text-foreground">¿Cómo funciona Viden?</h2>
              <p className="text-xs text-muted mt-0.5">Tu guía para empezar en 4 pasos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-alt transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-alt flex items-center justify-center text-xl shrink-0">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-accent/20 text-accent-light text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 bg-surface-alt border-t border-border space-y-2">
          <button onClick={onDeposit}
            className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors">
            💳 Depositar ahora
          </button>
          <p className="text-[11px] text-muted text-center">Mínimo $1 USD · Pago seguro con Stripe · Sin comisiones ocultas</p>
        </div>
      </div>
    </div>
  );
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

// ── Stripe inline card form ───────────────────────────────────────────────────

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

function StripeCardForm({ usdNum, vdnPreview, onSuccess, onCancel }: {
  usdNum: number; vdnPreview: number;
  onSuccess: (r: DepositResult) => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const cardRef   = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const cardElRef = useRef<any>(null);
  const [ready,   setReady]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    function mount() {
      const s  = (window as any).Stripe(STRIPE_PK);
      const el = s.elements().create("card", {
        style: {
          base: {
            color: "#f1f5f9",
            fontFamily: "inherit",
            fontSize: "15px",
            "::placeholder": { color: "#64748b" },
          },
          invalid: { color: "#f87171" },
        },
      });
      el.mount(cardRef.current!);
      el.on("ready", () => setReady(true));
      stripeRef.current = s;
      cardElRef.current = el;
    }

    if ((window as any).Stripe) { mount(); return; }
    const script    = document.createElement("script");
    script.src      = "https://js.stripe.com/v3/";
    script.onload   = mount;
    document.head.appendChild(script);
    return () => { cardElRef.current?.destroy(); };
  }, []);

  async function handlePay() {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const { client_secret, payment_intent_id } = await apiCreatePaymentIntent(token, usdNum);
      const { error: stripeErr } = await stripeRef.current.confirmCardPayment(client_secret, {
        payment_method: { card: cardElRef.current },
      });
      if (stripeErr) { setError(stripeErr.message ?? "Error al procesar"); setLoading(false); return; }
      const result = await apiConfirmPayment(token, payment_intent_id);
      onSuccess(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al procesar el pago");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-success/5 border border-success/20 flex justify-between items-center">
        <span className="text-sm text-muted">Pagarás <span className="font-bold text-foreground">${fmt(usdNum)}</span> y recibirás</span>
        <span className="text-xl font-black text-success">{vdnPreview.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
      </div>

      <div>
        <label className="block text-xs text-muted mb-2">Datos de tarjeta</label>
        <div
          ref={cardRef}
          className="p-3.5 rounded-lg bg-background border border-border focus-within:border-accent transition-colors min-h-[46px]"
        />
        {!ready && <p className="text-xs text-muted mt-1">Cargando formulario seguro…</p>}
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <div className="flex gap-2">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={handlePay} disabled={loading || !ready}
          className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? "Procesando…" : `Pagar $${fmt(usdNum)}`}
        </button>
      </div>

      <p className="text-center text-[10px] text-muted flex items-center justify-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        Pago seguro con Stripe · TLS 1.3
      </p>
    </div>
  );
}

// ── Reinvestment bonus banner ─────────────────────────────────────────────────

function ReinvestBanner({ expiresAt, onDeposit }: { expiresAt: number; onDeposit: () => void }) {
  const [left, setLeft] = useState(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  if (left <= 0) return null;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/8 p-4 flex items-center gap-4">
      <span className="text-3xl shrink-0">🎁</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">¡Bono de reinversión activo!</p>
        <p className="text-xs text-muted mt-0.5">Tu próxima apuesta recibe <strong className="text-accent-light">+8% extra en VDN</strong></p>
        <p className="text-xs text-muted mt-1">Expira en <span className="font-mono text-foreground">{h > 0 ? `${h}h ` : ""}{fmt(m)}:{fmt(s)}</span></p>
      </div>
      <a href="/" className="shrink-0 px-3 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors">
        Apostar →
      </a>
    </div>
  );
}

// ── Withdraw modal ────────────────────────────────────────────────────────────

const MIN_WITHDRAW    = 500;
const WAGER_REQUIRED  = 1500;
const EXPLORER        = "https://amoy.polygonscan.com";

function WithdrawModal({ balance, wagered, onClose, onSuccess }: {
  balance: number;
  wagered: number;
  onClose: () => void;
  onSuccess: (r: WithdrawResult) => void;
}) {
  const { token } = useAuth();
  const { address: mmAddress } = useAccount();

  const [amount,   setAmount]   = useState("");
  const [addr,     setAddr]     = useState(mmAddress ?? "");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const vdnNum       = parseFloat(amount) || 0;
  const usdEq        = vdnNum * VDN_PRICE;
  const wagerMet     = wagered >= WAGER_REQUIRED;
  const wagerPct     = Math.min(100, Math.round((wagered / WAGER_REQUIRED) * 100));
  const wagerRemain  = Math.max(0, WAGER_REQUIRED - wagered);
  const canSend      = wagerMet && vdnNum >= MIN_WITHDRAW && vdnNum <= balance && addr.length > 0 && !loading;

  async function handleWithdraw() {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const result = await apiWithdraw(token, vdnNum, addr.trim());
      onSuccess(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al procesar el retiro");
      setLoading(false);
    }
  }

  return (
    <Modal title="Retirar VDN" onClose={onClose}>
      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      {/* Wagering requirement gate */}
      {!wagerMet && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">🔒</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Requisito de apuesta no cumplido</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Para retirar debes haber apostado al menos <strong className="text-foreground">{WAGER_REQUIRED} VDN</strong> en mercados.
                Faltan <strong className="text-warning">{wagerRemain.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</strong> por apostar.
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>Progreso</span>
              <span className="font-semibold text-foreground">{wagered.toLocaleString("es", { maximumFractionDigits: 0 })} / {WAGER_REQUIRED} VDN</span>
            </div>
            <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
              <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${wagerPct}%` }} />
            </div>
          </div>
          <a href="/" onClick={onClose}
            className="block w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold text-center transition-colors">
            Ir a apostar →
          </a>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs text-muted mb-1.5">Cantidad a retirar (VDN)</label>
        <div className="relative">
          <input
            type="number" min={MIN_WITHDRAW} step="100" value={amount}
            onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()}
            placeholder={String(MIN_WITHDRAW)}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-lg font-semibold"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted">≈ ${usdEq.toFixed(2)} USD</span>
          <button onClick={() => setAmount(String(Math.floor(balance)))}
            className="text-xs text-accent-light hover:underline">
            Máx: {balance.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[500, 1000, 5000, 10000].filter(v => v <= balance).map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                amount === String(v) ? "border-accent text-accent bg-accent/5" : "border-border hover:border-accent text-muted hover:text-foreground"
              }`}>
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>
      </div>

      {/* Destination address */}
      <div>
        <label className="block text-xs text-muted mb-1.5">Dirección de destino (Polygon)</label>
        {mmAddress && (
          <button onClick={() => setAddr(mmAddress)}
            className={`mb-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              addr === mmAddress ? "border-accent bg-accent/5 text-accent-light" : "border-border hover:border-accent text-muted"
            }`}>
            <span>🦊</span>
            <span className="font-mono text-xs truncate">{mmAddress}</span>
            {addr !== mmAddress && <span className="ml-auto text-xs shrink-0">Usar esta</span>}
            {addr === mmAddress && <span className="ml-auto text-xs shrink-0 text-accent-light">✓ Seleccionada</span>}
          </button>
        )}
        <input
          type="text" value={addr}
          onChange={e => setAddr(e.target.value)}
          placeholder="0x…"
          className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors font-mono"
        />
      </div>

      {/* Info strip */}
      <div className="p-3 rounded-xl bg-surface-alt border border-border space-y-1.5 text-xs text-muted">
        <div className="flex justify-between"><span>Red</span><span className="text-foreground font-medium">Polygon Amoy</span></div>
        <div className="flex justify-between"><span>Gas</span><span className="text-success font-medium">Gratis (lo paga Viden)</span></div>
        <div className="flex justify-between"><span>Mínimo</span><span className="text-foreground font-medium">{MIN_WITHDRAW} VDN</span></div>
        <div className="flex justify-between"><span>Cooldown</span><span className="text-foreground font-medium">1 retiro / 24h</span></div>
      </div>

      <p className="text-[11px] text-muted text-center leading-relaxed">
        ⚠️ Los retiros son irreversibles. Verifica que la dirección sea correcta y que soporte la red Polygon.
      </p>

      <div className="flex gap-2">
        <button onClick={onClose} disabled={loading}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={handleWithdraw} disabled={!canSend}
          className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? "Enviando…" : `Retirar ${vdnNum > 0 ? vdnNum.toLocaleString("es", { maximumFractionDigits: 0 }) : ""} VDN`}
        </button>
      </div>
    </Modal>
  );
}

// ── Withdraw success overlay ──────────────────────────────────────────────────

function WithdrawSuccess({ result, onClose }: { result: WithdrawResult; onClose: () => void }) {
  return (
    <Modal title="¡Retiro enviado!" onClose={onClose}>
      <div className="text-center py-4">
        <span className="text-5xl">🚀</span>
        <p className="mt-3 text-2xl font-black text-foreground">
          {result.amount_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
        </p>
        <p className="text-sm text-muted mt-1">≈ ${result.amount_usd.toFixed(2)} USD · enviados on-chain</p>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-3 rounded-lg bg-surface-alt">
          <span className="text-muted">Destino</span>
          <span className="font-mono text-xs text-foreground">{result.to_address.slice(0,8)}…{result.to_address.slice(-6)}</span>
        </div>
        <div className="flex justify-between p-3 rounded-lg bg-surface-alt">
          <span className="text-muted">Nuevo balance</span>
          <span className="font-semibold text-accent-light">{result.new_balance_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
        </div>
      </div>
      <a href={result.explorer_url} target="_blank" rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:border-accent transition-colors">
        Ver en Polygonscan →
      </a>
      <button onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors">
        Cerrar
      </button>
    </Modal>
  );
}

// ── Transaction history ───────────────────────────────────────────────────────

const TX_TYPE_LABEL: Record<string, { label: string; color: string; sign: string }> = {
  deposit:  { label: "Depósito",  color: "text-success",      sign: "+" },
  buy_vdn:  { label: "Compra",    color: "text-success",      sign: "+" },
  withdraw: { label: "Retiro",    color: "text-danger",       sign: "-" },
  bet:      { label: "Apuesta",   color: "text-muted",        sign: "-" },
  win:      { label: "Premio",    color: "text-success",      sign: "+" },
  refund:   { label: "Reembolso", color: "text-accent-light", sign: "+" },
};

function TxHistory({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return null;
  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Historial de movimientos</h2>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {transactions.map(tx => {
          const meta = TX_TYPE_LABEL[tx.type] ?? { label: tx.type, color: "text-muted", sign: "" };
          const vdn  = tx.amount_vdn;
          return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{tx.description || meta.label}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {new Date(tx.created_at * 1000).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                  {tx.tx_hash && (
                    <a href={`${EXPLORER}/tx/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-accent-light hover:underline">txn →</a>
                  )}
                </p>
              </div>
              {vdn != null && (
                <span className={`text-xs font-bold tabular-nums shrink-0 ${meta.color}`}>
                  {meta.sign}{Math.abs(vdn).toLocaleString("es", { maximumFractionDigits: 0 })} VDN
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Deposit modal ─────────────────────────────────────────────────────────────

function DepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (r: DepositResult) => void }) {
  const { token } = useAuth();
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState<"demo" | "stripe" | "spei">("stripe");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  const usdNum     = parseFloat(amount) || 0;
  const vdnPreview = usdNum > 0 ? usdNum / VDN_PRICE : 0;

  async function handleConfirm() {
    if (!token || usdNum < 5) { setError("Mínimo $5 USD"); return; }
    if (method === "stripe") { setShowCard(true); return; }

    setLoading(true); setError(null);
    try {
      const result = await apiDeposit(token, usdNum, method);
      onSuccess(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al depositar");
      setLoading(false);
    }
  }

  const METHODS = [
    { id: "stripe" as const, icon: "💳", label: "Tarjeta", desc: "Visa, Mastercard, débito — procesado por Stripe", active: true },
    { id: "spei"   as const, icon: "🏦", label: "SPEI",    desc: "Transferencia bancaria MX — próximamente",       active: false },
    { id: "demo"   as const, icon: "🧪", label: "Demo",    desc: "Acredita directamente — solo para pruebas",      active: true },
  ];

  if (showCard) {
    return (
      <Modal title="Pagar con tarjeta" onClose={onClose}>
        <StripeCardForm
          usdNum={usdNum}
          vdnPreview={vdnPreview}
          onSuccess={onSuccess}
          onCancel={() => setShowCard(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Comprar VDN" onClose={onClose}>
      {error && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      {/* Amount input */}
      <div>
        <label className="block text-xs text-muted mb-1.5">¿Cuánto quieres depositar? (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
          <input
            type="number" min="5" step="1" value={amount}
            onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()}
            placeholder="10"
            className="w-full pl-8 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-lg font-semibold"
          />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
          {[5, 10, 25, 50, 100].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                amount === String(v)
                  ? "border-accent text-accent bg-accent/5"
                  : "border-border hover:border-accent text-muted hover:text-foreground"
              }`}>
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* VDN preview */}
      {vdnPreview > 0 ? (
        <div className="p-4 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
          <span className="text-sm text-muted">Recibirás</span>
          <span className="text-xl font-black text-success">
            {vdnPreview.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </span>
        </div>
      ) : (
        <div className="text-center text-xs text-muted">1 VDN = $0.01 USD · Mínimo $5</div>
      )}

      {/* Payment methods */}
      <div className="space-y-2">
        {METHODS.map(m => (
          <button key={m.id}
            onClick={() => m.active && setMethod(m.id)}
            disabled={!m.active}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
              method === m.id && m.active
                ? "border-accent bg-accent/5"
                : m.active
                ? "border-border hover:border-muted"
                : "border-border opacity-40 cursor-not-allowed"
            }`}>
            <span className="text-xl">{m.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{m.label}</p>
              <p className="text-xs text-muted">{m.desc}</p>
            </div>
            {method === m.id && m.active && <div className="w-4 h-4 rounded-full bg-accent shrink-0" />}
            {!m.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-alt text-muted border border-border">Pronto</span>}
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading || usdNum < 5}
        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
        {loading ? "Procesando…"
          : method === "stripe" ? `Continuar → $${fmt(usdNum)}`
          : `Comprar ${vdnPreview > 0 ? vdnPreview.toLocaleString("es", { maximumFractionDigits: 0 }) + " VDN" : "VDN"}`}
      </button>
    </Modal>
  );
}

// ── Success overlay ───────────────────────────────────────────────────────────

function SuccessOverlay({ result, onClose }: { result: DepositResult; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <Modal title="¡Compra exitosa!" onClose={onClose}>
      <CoinRain vdn={result.vdn_received} />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-3 rounded-lg bg-surface-alt">
          <span className="text-muted">Pagaste</span>
          <span className="font-semibold">${fmt(result.usd_paid)} USD</span>
        </div>
        <div className="flex justify-between p-3 rounded-lg bg-success/10 border border-success/20">
          <span className="text-muted">Recibiste</span>
          <span className="font-bold text-success">+{result.vdn_received.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
        </div>
        <div className="flex justify-between p-3 rounded-lg bg-surface-alt">
          <span className="text-muted">Nuevo balance</span>
          <span className="font-semibold text-accent-light">{result.new_balance_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
        </div>
      </div>
      <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors">
        Continuar
      </button>
    </Modal>
  );
}

// ── Page inner ────────────────────────────────────────────────────────────────

function WalletInner() {
  const { user, token, balance, isLoggedIn, isLoading, refreshBalance } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [showDeposit,      setShowDeposit]      = useState(false);
  const [showWithdraw,     setShowWithdraw]     = useState(false);
  const [withdrawResult,   setWithdrawResult]   = useState<WithdrawResult | null>(null);
  const [successResult,    setSuccessResult]     = useState<DepositResult | null>(null);
  const [cancelBanner,     setCancelBanner]      = useState(false);
  const [showInstallBonus, setShowInstallBonus]  = useState(false);
  const [showTutorial,     setShowTutorial]      = useState(false);
  const [transactions,     setTransactions]      = useState<Transaction[]>([]);
  const [referralInfo,     setReferralInfo]      = useState<{
    referral_code: string;
    levels: { l1: { total: number; converted: number; bonus_per_conversion: number }; l2: { total: number; converted: number; bonus_per_conversion: number }; l3: { total: number; converted: number; bonus_per_conversion: number } };
    total_referrals: number;
    total_earned_vdn: number;
  } | null>(null);
  const [refCopied,        setRefCopied]         = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

  // Show install bonus card if not yet claimed
  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      const claimed = localStorage.getItem('install_bonus_claimed');
      setShowInstallBonus(!claimed);
      // Show tutorial automatically only the first time
      const seen = localStorage.getItem('wallet_tutorial_seen');
      if (!seen) { setShowTutorial(true); localStorage.setItem('wallet_tutorial_seen', '1'); }
    }
  }, [isLoggedIn]);

  // Load referral info
  useEffect(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API_URL}/api/users/referral`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setReferralInfo)
      .catch(() => {});
  }, [token, isLoggedIn]);

  // Load transaction history
  useEffect(() => {
    if (!token || !isLoggedIn) return;
    apiGetTransactions(token).then(d => setTransactions(d.transactions)).catch(() => {});
  }, [token, isLoggedIn, successResult, withdrawResult]);

  // After Stripe redirect: confirm payment and credit VDN
  useEffect(() => {
    const deposito   = searchParams.get("deposito");
    const session_id = searchParams.get("session_id");
    if (deposito === "exitoso" && session_id && token) {
      apiStripeConfirm(token, session_id)
        .then((result: DepositResult) => {
          setSuccessResult(result);
          refreshBalance();
        })
        .catch(() => refreshBalance());
    } else if (deposito === "cancelado") {
      setCancelBanner(true);
      setTimeout(() => setCancelBanner(false), 4000);
    } else if (deposito === "exitoso") {
      refreshBalance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = useCallback(async (result: DepositResult) => {
    setShowDeposit(false);
    setSuccessResult(result);
    await refreshBalance();
  }, [refreshBalance]);

  if (isLoading || !user || !isLoggedIn) {
    return <div className="text-center text-muted py-20">Cargando…</div>;
  }

  const vdn     = balance?.balance_vdn     ?? user.balance_vdn;
  const vesting = balance?.balance_vdn_vesting ?? user.balance_vdn_vesting;
  const usdEq   = vdn * VDN_PRICE;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mi Wallet</h1>
        <button onClick={() => setShowTutorial(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:border-accent transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 16v-4m0-4h.01"/>
          </svg>
          ¿Cómo funciona?
        </button>
      </div>

      {/* Reinvestment bonus banner */}
      {balance?.reinvest_bonus_active && balance.reinvest_bonus_expires_at && (
        <ReinvestBanner expiresAt={balance.reinvest_bonus_expires_at} onDeposit={() => setShowDeposit(true)} />
      )}

      {/* Install bonus card */}
      {showInstallBonus && (
        <div style={{ background: 'linear-gradient(135deg, #4C7A58, #3B6145)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '36px' }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>500 VDN esperándote</div>
            <div style={{ color: '#C4B5FD', fontSize: '13px' }}>Instala Viden como app · Valor: $5.00 USD · Solo una vez</div>
          </div>
          <button onClick={() => window.dispatchEvent(new Event('pwa-install-trigger'))} style={{ background: '#3A9E6A', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 14px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            📲 Instalar
          </button>
        </div>
      )}

      {/* VDN balance card */}
      <div className="p-6 rounded-2xl bg-surface border border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted mb-1">Balance VDN</p>
            <p className="text-5xl font-black text-accent-light tabular-nums">
              {vdn.toLocaleString("es", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-muted mt-1">≈ ${fmt(usdEq)} USD</p>
          </div>
          <span className="text-4xl">🪙</span>
        </div>

        {vesting > 0 && (
          <div className="mb-4 p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning flex justify-between">
            <span>⏳ En vesting</span>
            <span className="font-semibold">{vesting.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowDeposit(true)}
            className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            💳 Depositar
          </button>
          <button onClick={() => setShowWithdraw(true)} disabled={vdn < MIN_WITHDRAW}
            className="flex-1 py-3 rounded-xl border border-border bg-surface-alt hover:border-accent text-sm font-bold text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            ↗ Retirar
          </button>
        </div>
      </div>

      {/* Tutorial */}
      {showTutorial && <WalletTutorial onDeposit={() => { setShowDeposit(true); setShowTutorial(false); }} onClose={() => setShowTutorial(false)} />}

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

      {/* Historial de movimientos */}
      <TxHistory transactions={transactions} />

      {/* Racha diaria */}
      <DailyStreak />

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/" className="py-3 rounded-xl bg-surface border border-border text-xs text-center font-medium hover:border-accent transition-colors text-foreground">
          🎯 Mercados
        </Link>
        <Link href="/portfolio" className="py-3 rounded-xl bg-surface border border-border text-xs text-center font-medium hover:border-accent transition-colors text-foreground">
          📊 Portfolio
        </Link>
        <Link href={`/u/${user.username}`} className="py-3 rounded-xl bg-surface border border-border text-xs text-center font-medium hover:border-accent transition-colors text-foreground">
          👤 Mi perfil
        </Link>
      </div>

      {/* Referral */}
      {referralInfo && (
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">🔗 Invita amigos</p>
              <p className="text-xs text-muted">Gana VDN cuando tus referidos hagan su primera apuesta</p>
            </div>
            {referralInfo.total_earned_vdn > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                +{referralInfo.total_earned_vdn} VDN ganados
              </span>
            )}
          </div>

          {/* Link */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border">
            <code className="flex-1 text-xs text-accent-light font-mono truncate">
              {typeof window !== "undefined" ? `${window.location.origin}/registro?ref=${referralInfo.referral_code}` : `viden.app/registro?ref=${referralInfo.referral_code}`}
            </code>
            <button
              onClick={() => {
                const url = `${window.location.origin}/registro?ref=${referralInfo.referral_code}`;
                if (navigator.share) navigator.share({ title: "Únete a Viden", url });
                else { navigator.clipboard.writeText(url); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }
              }}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">
              {refCopied ? "✓ Copiado" : "Compartir"}
            </button>
          </div>

          {/* Niveles */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: "Nivel 1", key: "l1" as const, bonus: 200, color: "text-warning" },
              { label: "Nivel 2", key: "l2" as const, bonus: 75,  color: "text-accent-light" },
              { label: "Nivel 3", key: "l3" as const, bonus: 25,  color: "text-muted" },
            ]).map(({ label, key, bonus, color }) => (
              <div key={key} className="p-3 rounded-xl bg-background border border-border text-center">
                <div className={`text-lg font-black tabular-nums ${color}`}>{referralInfo.levels[key].converted}</div>
                <div className="text-[10px] text-muted">de {referralInfo.levels[key].total}</div>
                <div className="text-[10px] font-semibold text-foreground mt-1">{label}</div>
                <div className="text-[10px] text-success">+{bonus} VDN</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted text-center">El bono se acredita cuando el referido hace su primera apuesta</p>
        </div>
      )}

      {/* Cancelled banner */}
      {cancelBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-surface border border-border shadow-xl text-sm text-muted">
          Pago cancelado — no se realizó ningún cargo.
        </div>
      )}

      {/* Modals */}
      {showDeposit && (
        <DepositModal onClose={() => setShowDeposit(false)} onSuccess={handleSuccess} />
      )}
      {showWithdraw && (
        <WithdrawModal
          balance={vdn}
          wagered={balance?.total_wagered_vdn ?? 0}
          onClose={() => setShowWithdraw(false)}
          onSuccess={r => { setShowWithdraw(false); setWithdrawResult(r); refreshBalance(); }}
        />
      )}
      {successResult && (
        <SuccessOverlay result={successResult} onClose={() => setSuccessResult(null)} />
      )}
      {withdrawResult && (
        <WithdrawSuccess result={withdrawResult} onClose={() => setWithdrawResult(null)} />
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted py-20">Cargando…</div>}>
      <WalletInner />
    </Suspense>
  );
}
