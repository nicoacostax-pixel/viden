"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiBuy, ApiError } from "@/lib/custodialApi";

const LMSR_B = 2000 / Math.LN2;

function multiCostFn(shares: number[]): number {
  const max = Math.max(...shares);
  const sum = shares.reduce((acc, s) => acc + Math.exp((s - max) / LMSR_B), 0);
  return LMSR_B * (Math.log(sum) + max / LMSR_B);
}

function multiGetPrices(shares: number[]): number[] {
  const max  = Math.max(...shares);
  const exps = shares.map(s => Math.exp((s - max) / LMSR_B));
  const tot  = exps.reduce((a, v) => a + v, 0);
  return exps.map(e => e / tot);
}

function multiSharesForVDN(shares: number[], targetIdx: number, netVDN: number): number {
  if (netVDN <= 0) return 0;
  const costBefore = multiCostFn(shares);
  const target = costBefore + netVDN;
  const cost = (delta: number) => { const t = [...shares]; t[targetIdx] += delta; return multiCostFn(t); };
  let hi = Math.max(netVDN, 1);
  while (cost(hi) < target) hi *= 2;
  let lo = 0;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (cost(mid) < target) lo = mid; else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  return (lo + hi) / 2;
}

interface Outcome { id: number; label: string; shares: number; ord: number }

export function MultiOutcomePanel({
  marketId, outcomes, isOpen, onTrade,
}: {
  marketId: number;
  outcomes: Outcome[];
  isOpen: boolean;
  onTrade: () => void;
}) {
  const { user, token, balance, isLoggedIn, refreshBalance } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const vdnBalance = balance?.balance_vdn ?? user?.balance_vdn ?? 0;
  const gross = Number(amount) || 0;
  const NET_RATE = 0.96;
  const net = gross * NET_RATE;

  const shares = outcomes.map(o => o.shares);
  const prices = multiGetPrices(shares.length ? shares : outcomes.map(() => 0));

  const selectedIdx = selected !== null ? outcomes.findIndex(o => o.id === selected) : -1;
  const received = selectedIdx >= 0 && gross > 0 ? multiSharesForVDN(shares, selectedIdx, net) : 0;
  const payout = received;
  const profit = payout - gross;

  async function handleBuy() {
    if (!token || !selected || gross <= 0) return;
    const outcome = outcomes.find(o => o.id === selected);
    if (!outcome) return;
    setLoading(true); setError(null);
    try {
      const res = await apiBuy(token, marketId, outcome.label, gross);
      setSuccess(`Compraste ${res.shares_received.toFixed(2)} shares de "${outcome.label}"`);
      setAmount("");
      await refreshBalance();
      onTrade();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al comprar");
    } finally { setLoading(false); }
  }

  if (!isLoggedIn) return null;
  if (!isOpen) return (
    <div className="p-4 rounded-xl bg-surface-alt border border-border text-center text-muted text-sm">
      Este mercado está cerrado.
    </div>
  );

  return (
    <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
      <p className="text-xs text-muted font-semibold uppercase tracking-wider">Selecciona tu opción</p>

      {/* Outcome list */}
      <div className="space-y-2">
        {outcomes.map((o, i) => {
          const pct = (prices[i] * 100).toFixed(1);
          const isSelected = selected === o.id;
          return (
            <button key={o.id} onClick={() => setSelected(o.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? "bg-accent/10 border-accent text-foreground"
                  : "bg-background border-border hover:border-accent/40 text-foreground"
              }`}>
              {/* Progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold truncate">{o.label}</span>
                  <span className={`text-sm font-bold tabular-nums ml-2 shrink-0 ${isSelected ? "text-accent" : "text-muted"}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
              {isSelected && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Amount input */}
      {selected !== null && (
        <>
          <div>
            <label className="text-xs text-muted mb-1 block">Cantidad (VDN)</label>
            <div className="flex gap-2 mb-2">
              {[50, 100, 500].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} disabled={v > vdnBalance}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-30 ${
                    Number(amount) === v ? "bg-accent text-white border-accent" : "bg-surface-alt border-border text-muted hover:text-foreground hover:border-accent/50"
                  }`}>{v}</button>
              ))}
              <button onClick={() => setAmount(String(Math.floor(vdnBalance)))} disabled={vdnBalance <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-30 ${
                  Number(amount) === Math.floor(vdnBalance) && vdnBalance > 0 ? "bg-accent text-white border-accent" : "bg-surface-alt border-border text-muted hover:text-foreground hover:border-accent/50"
                }`}>MAX</button>
            </div>
            <input type="number" inputMode="decimal" min="0" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="Ej: 200"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
          </div>

          {/* Payout preview */}
          {gross > 0 && received > 0 && (
            <div className="rounded-xl p-4 border bg-success/5 border-success/20 space-y-2">
              <div className="text-xs text-muted">Pago si &ldquo;{outcomes.find(o => o.id === selected)?.label}&rdquo; gana</div>
              <div className="text-3xl font-black tabular-nums text-success">{payout.toFixed(2)} VDN</div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-background border border-border text-foreground font-semibold tabular-nums">
                  {gross.toFixed(2)} apostado
                </span>
                <span className="text-muted">+</span>
                <span className="px-2.5 py-1 rounded-lg font-semibold tabular-nums border text-success bg-success/10 border-success/20">
                  {profit >= 0 ? "+" : ""}{profit.toFixed(2)} ganancia
                </span>
              </div>
            </div>
          )}

          {error   && <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success">{success}</div>}

          <button onClick={handleBuy} disabled={loading || gross <= 0 || gross > vdnBalance}
            className="w-full py-3 rounded-xl font-bold text-sm bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50">
            {loading ? "Apostando…" : `Apostar ${gross > 0 ? `${gross} VDN` : ""}`}
          </button>
          <p className="text-xs text-muted text-center">Saldo: {vdnBalance.toLocaleString("es")} VDN</p>
        </>
      )}
    </div>
  );
}
