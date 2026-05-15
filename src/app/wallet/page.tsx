"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiDeposit, apiCreatePaymentIntent, apiConfirmPayment, apiStripeConfirm, ApiError, type DepositResult } from "@/lib/custodialApi";

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
        <div className="flex gap-2 mt-2">
          {[5, 10, 25, 50, 100].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
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

  const [showDeposit,   setShowDeposit]   = useState(false);
  const [successResult, setSuccessResult] = useState<DepositResult | null>(null);
  const [cancelBanner,  setCancelBanner]  = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/login");
  }, [isLoading, isLoggedIn, router]);

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
        <span className="text-sm text-muted">@{user.username}</span>
      </div>

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

        <button
          onClick={() => setShowDeposit(true)}
          className="w-full mt-4 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
          💳 Depositar
        </button>
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
          📊 Portfolio
        </Link>
      </div>

      {/* Referral */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <p className="text-xs text-muted mb-2">Tu código de referido</p>
        <div className="flex items-center gap-3">
          <code className="text-lg font-black text-accent-light tracking-widest">{user.referral_code}</code>
          <button
            onClick={() => navigator.clipboard.writeText(user.referral_code)}
            className="text-xs text-muted hover:text-foreground border border-border px-2 py-1 rounded-md transition-colors">
            Copiar
          </button>
        </div>
        <p className="text-xs text-muted mt-1">Comparte — tú y tu referido reciben 200 VDN extra</p>
      </div>

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
      {successResult && (
        <SuccessOverlay result={successResult} onClose={() => setSuccessResult(null)} />
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
