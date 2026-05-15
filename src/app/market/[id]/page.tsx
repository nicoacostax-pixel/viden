"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import Link from "next/link";
import {
  useMarket,
  usePosition,
  useClaimReward,
  formatVDN,
  getProbability,
  getOutcomeLabel,
} from "@/hooks/usePredictionMarket";
import { useMarketBet } from "@/hooks/useMarketBet";
import { useWrongNetwork } from "@/hooks/useWrongNetwork";
import { TxLink } from "@/components/TxLink";
import { Outcome, EXPLORER_BASE } from "@/config/contracts";
import { useAuth } from "@/context/AuthContext";
import {
  apiPlaceBet, ApiError, BetResult,
  apiGetComments, apiPostComment, apiLikeComment, Comment,
  apiGetTopHolders, TopHolder,
  apiGetPositions, PositionsData,
  apiGetActivity, ActivityItem,
} from "@/lib/custodialApi";
import { getMarket, type ApiMarket } from "@/lib/api";

const VDN_PRICE_USD = 0.01;

// ─── Helpers ────────────────────────────────────────────────────────────────

function useCountdown(closeTime: bigint) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = Number(closeTime) - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setLabel("Cerrado"); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (d === 0) parts.push(`${s}s`);
      setLabel(parts.join(" "));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closeTime]);
  return label;
}

function parseClaimError(error: Error | null): string | null {
  if (!error) return null;
  const msg = error.message;
  if (msg.includes("User rejected"))          return "Transacción rechazada.";
  if (msg.includes("PM__MercadoNoResuelto"))  return "El mercado aún no fue resuelto.";
  if (msg.includes("PM__PerdedorNoPuedeCobrar")) return "Solo el lado ganador puede cobrar.";
  if (msg.includes("PM__YaReclamado"))        return "Ya cobraste tu recompensa.";
  if (msg.includes("PM__NadaQueReclamar"))    return "No tienes posición en este mercado.";
  return "Error inesperado. Intenta de nuevo.";
}

// ─── Pool card ───────────────────────────────────────────────────────────────

function PoolCard({
  totalPoolYes,
  totalPoolNo,
}: {
  totalPoolYes: bigint;
  totalPoolNo: bigint;
}) {
  const { yes, no } = getProbability(totalPoolYes, totalPoolNo);
  const total = totalPoolYes + totalPoolNo;

  return (
    <div className="p-5 rounded-xl bg-surface border border-border mb-6">
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-success font-semibold">SÍ {yes}%</span>
        <span className="text-muted text-xs">Pool total: <span className="text-foreground font-medium">{formatVDN(total)} VDN</span></span>
        <span className="text-danger font-semibold">NO {no}%</span>
      </div>
      <div className="h-3 rounded-full bg-danger/40 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-success transition-all duration-500"
          style={{ width: `${yes}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="text-muted text-xs mb-1">Pool SÍ</div>
          <div className="text-success font-semibold">{formatVDN(totalPoolYes)} VDN</div>
        </div>
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
          <div className="text-muted text-xs mb-1">Pool NO</div>
          <div className="text-danger font-semibold">{formatVDN(totalPoolNo)} VDN</div>
        </div>
      </div>
    </div>
  );
}

// ─── Fee breakdown ───────────────────────────────────────────────────────────

function FeeBreakdown({ amount }: { amount: bigint }) {
  if (amount === 0n) return null;
  const burn     = (amount * 200n) / 10000n;
  const treasury = (amount * 200n) / 10000n;
  const pool     = amount - burn - treasury;
  return (
    <div className="mt-3 p-3 rounded-lg bg-background border border-border space-y-1 text-xs">
      <div className="flex justify-between text-muted">
        <span>🔥 Quema (2%)</span>
        <span className="text-danger">−{formatVDN(burn)} VDN</span>
      </div>
      <div className="flex justify-between text-muted">
        <span>🏦 Treasury (2%)</span>
        <span className="text-warning">−{formatVDN(treasury)} VDN</span>
      </div>
      <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
        <span className="text-foreground">Entra al pool (96%)</span>
        <span className="text-success">+{formatVDN(pool)} VDN</span>
      </div>
    </div>
  );
}

// ─── Custodial bet form ──────────────────────────────────────────────────────

function CustodialBetForm({ marketId }: { marketId: number }) {
  const { user, token, balance, isLoggedIn, refreshBalance } = useAuth();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BetResult | null>(null);

  const vdnBalance = balance?.balance_vdn ?? user?.balance_vdn ?? 0;
  const parsedAmount = Number(amount) || 0;
  const usdEquiv = parsedAmount * VDN_PRICE_USD;
  const netVdn   = parsedAmount * 0.96;
  const burnVdn  = parsedAmount * 0.02;
  const feeVdn   = parsedAmount * 0.02;
  const overBalance = parsedAmount > vdnBalance;

  if (!isLoggedIn) {
    return (
      <div className="p-5 rounded-xl bg-surface border border-border mb-6 text-center space-y-3">
        <p className="text-muted text-sm">Inicia sesión para apostar con VDN</p>
        <Link href="/login"
          className="inline-block px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="p-5 rounded-xl bg-success/10 border border-success/30 mb-6 space-y-4">
        <div className="text-center">
          <p className="text-2xl mb-1">🎯</p>
          <p className="text-success font-bold text-lg">¡Apuesta realizada!</p>
          <p className="text-sm text-muted mt-1">
            Apostaste <strong>{parsedAmount.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</strong> por{" "}
            <strong className={side === "yes" ? "text-success" : "text-danger"}>
              {side === "yes" ? "SÍ" : "NO"}
            </strong>
          </p>
          <p className="text-xs text-muted mt-1">
            {done.net_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN netos entraron al pool
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setDone(null); setAmount(""); }}
            className="py-2.5 rounded-lg bg-surface-alt border border-border text-sm font-medium hover:border-accent transition-colors">
            Nueva apuesta
          </button>
          <Link href="/portfolio"
            className="py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors text-center">
            Ver Portfolio →
          </Link>
        </div>
      </div>
    );
  }

  async function handleBet() {
    if (!token || parsedAmount <= 0 || overBalance) return;
    setLoading(true); setError(null);
    try {
      const res = await apiPlaceBet(token, marketId, side, parsedAmount);
      setDone(res);
      await refreshBalance();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al apostar");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-5 rounded-xl bg-surface border border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Colocar apuesta</h2>
        <span className="text-xs text-muted">
          Saldo:{" "}
          <span className="text-accent-light font-semibold">
            {vdnBalance.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </span>
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
      )}

      {/* YES / NO toggle */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(["yes", "no"] as const).map(s => (
          <button key={s} onClick={() => setSide(s)}
            className={`py-3 rounded-lg font-bold text-sm transition-all ${
              s === "yes"
                ? side === "yes"
                  ? "bg-success text-white shadow-lg shadow-success/20"
                  : "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                : side === "no"
                  ? "bg-danger text-white shadow-lg shadow-danger/20"
                  : "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
            }`}>
            {s === "yes" ? "SÍ" : "NO"}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-muted">Monto (VDN)</label>
          <button onClick={() => setAmount(String(Math.floor(vdnBalance)))}
            className="text-xs text-accent-light underline hover:text-accent">
            MAX
          </button>
        </div>
        <input type="number" min="0" step="any" value={amount}
          onChange={e => setAmount(e.target.value)}
          onFocus={e => e.target.select()}
          placeholder="Ej: 1000"
          className={`w-full px-4 py-3 rounded-lg bg-background border text-foreground placeholder:text-muted focus:outline-none transition-colors ${
            overBalance ? "border-danger focus:border-danger" : "border-border focus:border-accent"
          }`} />
        {parsedAmount > 0 && !overBalance && (
          <p className="text-xs text-muted mt-1">≈ ${usdEquiv.toFixed(4)} USD</p>
        )}
        {overBalance && (
          <p className="text-xs text-danger mt-1">
            Fondos insuficientes. Tu balance es {vdnBalance.toLocaleString("es", { maximumFractionDigits: 0 })} VDN.
          </p>
        )}
      </div>

      {/* Fee breakdown */}
      {parsedAmount > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-background border border-border space-y-1 text-xs">
          <div className="flex justify-between text-muted">
            <span>🔥 Quema (2%)</span>
            <span className="text-danger">−{burnVdn.toLocaleString("es", { maximumFractionDigits: 2 })} VDN</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>🏦 Treasury (2%)</span>
            <span className="text-warning">−{feeVdn.toLocaleString("es", { maximumFractionDigits: 2 })} VDN</span>
          </div>
          <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
            <span className="text-foreground">Entra al pool (96%)</span>
            <span className="text-success">+{netVdn.toLocaleString("es", { maximumFractionDigits: 2 })} VDN</span>
          </div>
        </div>
      )}

      <button onClick={handleBet} disabled={loading || parsedAmount <= 0 || overBalance}
        className={`mt-4 w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
          side === "yes"
            ? "bg-success hover:bg-green-500 text-white"
            : "bg-danger hover:bg-red-500 text-white"
        }`}>
        {loading ? "Apostando…" : `Apostar por ${side === "yes" ? "SÍ" : "NO"}`}
      </button>
    </div>
  );
}

// ─── Bet form (MetaMask / on-chain) ──────────────────────────────────────────

function BetForm({
  marketId,
  existingPosition,
}: {
  marketId: bigint;
  existingPosition: { netAmount: bigint; isYes: boolean } | null;
}) {
  const { isConnected } = useAccount();
  const { isWrongNetwork } = useWrongNetwork();
  const bet = useMarketBet();

  const [side, setSide] = useState<boolean>(true);
  const [amount, setAmount] = useState("");
  const [approveFlash, setApproveFlash] = useState(false);

  const parsedAmount = amount ? parseEther(amount) : 0n;
  const overBalance = parsedAmount > 0n && parsedAmount > bet.balance;
  const needsApprove = parsedAmount > 0n && bet.allowance < parsedAmount;
  const canAct = isConnected && !isWrongNetwork && parsedAmount > 0n && !overBalance;

  // Show approve flash when step moves to "approved"
  useEffect(() => {
    if (bet.step !== "approved") return;
    setApproveFlash(true);
    const t = setTimeout(() => setApproveFlash(false), 2000);
    return () => clearTimeout(t);
  }, [bet.step]);

  // Lock side to existing position if user already bet
  const effectiveSide =
    existingPosition && existingPosition.netAmount > 0n
      ? existingPosition.isYes
      : side;

  if (bet.isSuccess && bet.betHash) {
    return (
      <div className="p-5 rounded-xl bg-success/10 border border-success/30 space-y-4">
        <div className="text-center">
          <p className="text-2xl mb-1">🎯</p>
          <p className="text-success font-bold text-lg">¡Apuesta realizada!</p>
          <p className="text-sm text-muted mt-1">
            Apostaste por <strong className={effectiveSide ? "text-success" : "text-danger"}>
              {effectiveSide ? "SÍ" : "NO"}
            </strong> · {formatVDN((parsedAmount * 9600n) / 10000n)} VDN en el pool
          </p>
        </div>
        <div className="text-center">
          <TxLink hash={bet.betHash} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={bet.reset}
            className="py-2.5 rounded-lg bg-surface-alt border border-border text-sm font-medium hover:border-accent transition-colors"
          >
            Nueva apuesta
          </button>
          <Link
            href="/portfolio"
            className="py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors text-center"
          >
            Ver Portfolio →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-surface border border-border mb-6">
      <h2 className="font-semibold text-foreground mb-4">Colocar apuesta</h2>

      {!isConnected && (
        <p className="text-muted text-sm text-center py-4">
          Conecta tu wallet para apostar.
        </p>
      )}

      {isConnected && (
        <>
          {/* Existing position banner */}
          {existingPosition && existingPosition.netAmount > 0n && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              existingPosition.isYes
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger"
            }`}>
              Tu posición actual: <strong>{formatVDN(existingPosition.netAmount)} VDN netos</strong> en{" "}
              {existingPosition.isYes ? "SÍ" : "NO"}. Puedes añadir más al mismo lado.
            </div>
          )}

          {/* YES / NO toggle */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[true, false].map((isYes) => {
              const locked = existingPosition && existingPosition.netAmount > 0n;
              const active = effectiveSide === isYes;
              return (
                <button
                  key={String(isYes)}
                  onClick={() => !locked && setSide(isYes)}
                  disabled={!!locked && !active}
                  className={`py-3 rounded-lg font-bold text-sm transition-all ${
                    isYes
                      ? active
                        ? "bg-success text-white shadow-lg shadow-success/20"
                        : "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                      : active
                        ? "bg-danger text-white shadow-lg shadow-danger/20"
                        : "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isYes ? "SÍ" : "NO"}
                </button>
              );
            })}
          </div>

          {/* Amount input */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-muted">Monto (VDN)</label>
              <span className="text-xs text-muted">
                Balance:{" "}
                <button
                  onClick={() =>
                    setAmount(Number(formatEther(bet.balance)).toFixed(2))
                  }
                  className="text-accent-light underline hover:text-accent"
                >
                  {formatVDN(bet.balance)} VDN
                </button>
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                // Reset flow if user changes amount after approve
                if (bet.step === "approved" || bet.step === "error") bet.reset();
              }}
              onFocus={e => e.target.select()}
              placeholder="Ej: 1000"
              className={`w-full px-4 py-3 rounded-lg bg-background border text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                overBalance
                  ? "border-danger focus:border-danger"
                  : "border-border focus:border-accent"
              }`}
            />
            {overBalance && (
              <p className="text-xs text-danger mt-1">
                Fondos insuficientes. Tu balance es {formatVDN(bet.balance)} VDN.
              </p>
            )}
          </div>

          {/* Fee breakdown */}
          <FeeBreakdown amount={parsedAmount} />

          {/* Action buttons */}
          <div className="mt-4 space-y-2">
            {/* PASO 1 — Approve (only if not yet approved) */}
            {bet.step !== "approved" && needsApprove && (
              <button
                onClick={() => bet.execute(marketId, effectiveSide, parsedAmount)}
                disabled={!canAct || bet.isApproving}
                title={isWrongNetwork ? "Cambia a Polygon Amoy para continuar" : undefined}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-warning hover:bg-yellow-400 text-black disabled:opacity-50"
              >
                {bet.isApproving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Aprobando VDN…
                  </span>
                ) : (
                  "1. Aprobar VDN"
                )}
              </button>
            )}

            {/* Approve confirmed flash */}
            {approveFlash && (
              <div className="w-full py-3 rounded-lg font-semibold text-sm text-center bg-success text-white">
                Aprobación confirmada ✓
              </div>
            )}
            {bet.approveHash && !approveFlash && (
              <div className="text-center">
                <TxLink hash={bet.approveHash} />
              </div>
            )}

            {/* PASO 2 — Bet: direct (if allowance ok) OR after approve */}
            {(!needsApprove || bet.step === "approved") && !approveFlash && (
              <button
                onClick={() =>
                  bet.step === "approved"
                    ? bet.confirmBet()
                    : bet.execute(marketId, effectiveSide, parsedAmount)
                }
                disabled={!canAct || bet.isBetting}
                title={isWrongNetwork ? "Cambia a Polygon Amoy para continuar" : undefined}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
                  effectiveSide
                    ? "bg-success hover:bg-green-500 text-white"
                    : "bg-danger hover:bg-red-500 text-white"
                }`}
              >
                {bet.isBetting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Confirmando apuesta…
                  </span>
                ) : (
                  `Apostar por ${effectiveSide ? "SÍ" : "NO"}`
                )}
              </button>
            )}

            {/* Error */}
            {bet.isError && bet.errorMsg && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <p className="text-xs text-danger">{bet.errorMsg}</p>
                <button
                  onClick={bet.reset}
                  className="text-xs text-accent-light underline mt-1"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

// ─── Tabs helpers ─────────────────────────────────────────────────────────────

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-alt ${className ?? ""}`} />;
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab({ marketId }: { marketId: number }) {
  const { user, token, isLoggedIn } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetComments(marketId, sort);
      setComments(data.comments);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [marketId, sort]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!token || !text.trim()) return;
    setSubmitting(true);
    try {
      const { comment } = await apiPostComment(token, marketId, text.trim());
      setComments(prev => [comment, ...prev]);
      setText("");
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  async function handleLike(commentId: number) {
    if (!token) return;
    try {
      const { like_count } = await apiLikeComment(token, marketId, commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count } : c));
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center justify-end gap-1 text-xs">
        <span className="text-muted mr-1">Ordenar:</span>
        {(["recent", "popular"] as const).map(s => (
          <button key={s} onClick={() => setSort(s)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              sort === s ? "bg-accent/20 text-accent-light font-medium" : "text-muted hover:text-foreground"
            }`}>
            {s === "recent" ? "Más reciente" : "Más popular"}
          </button>
        ))}
      </div>

      {/* Comment input */}
      {isLoggedIn ? (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-sm font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Añade un comentario…" maxLength={500}
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
            <button onClick={handleSubmit} disabled={submitting || !text.trim()}
              className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors disabled:opacity-50">
              {submitting ? "…" : "Publicar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-surface-alt border border-border text-sm text-center text-muted">
          <Link href="/login" className="text-accent-light hover:underline">Inicia sesión</Link>{" "}para comentar
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">💬</p>
          <p className="text-muted text-sm">Sé el primero en comentar</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                {c.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">@{c.username}</span>
                  <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/90 break-words leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => handleLike(c.id)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {c.like_count > 0 ? c.like_count : ""}
                  </button>
                  <button className="text-xs text-muted hover:text-foreground transition-colors">Responder</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Holders tab ──────────────────────────────────────────────────────────

function TopHoldersTab({ marketId }: { marketId: number }) {
  const { user } = useAuth();
  const [holders, setHolders] = useState<TopHolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetTopHolders(marketId)
      .then(({ holders }) => setHolders(holders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId]);

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
    </div>
  );

  if (holders.length === 0) return (
    <div className="text-center py-10 space-y-2">
      <p className="text-3xl">🏆</p>
      <p className="text-muted text-sm">Aún no hay apuestas en este mercado</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {holders.map((h, i) => (
        <div key={`${h.username}-${h.side}`}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            h.username === user?.username ? "border-accent bg-accent/5" : "border-border bg-surface"
          }`}>
          <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${
            i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted"
          }`}>
            #{i + 1}
          </span>
          <span className="flex-1 text-sm font-medium text-foreground">
            @{h.username}
            {h.username === user?.username && (
              <span className="ml-1.5 text-xs text-accent-light">(tú)</span>
            )}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            h.side === "yes" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
          }`}>
            {h.side === "yes" ? "SÍ" : "NO"}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {h.total_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Positions tab ────────────────────────────────────────────────────────────

function ProbChart({ history }: { history: { timestamp: number; probability_yes: number }[] }) {
  if (history.length < 2) return (
    <p className="text-xs text-muted text-center py-4">Se necesitan más apuestas para mostrar el gráfico</p>
  );

  const W = 400, H = 60, PAD = 4;
  const minT = history[0].timestamp;
  const maxT = history[history.length - 1].timestamp;
  const rangeT = maxT - minT || 1;

  const pts = history.map(p => ({
    x: PAD + ((p.timestamp - minT) / rangeT) * (W - PAD * 2),
    y: PAD + (1 - p.probability_yes) * (H - PAD * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#chartGrad)" />
      <path d={line} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PositionsTab({ marketId }: { marketId: number }) {
  const [data, setData] = useState<PositionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPositions(marketId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-6" />
      <Skeleton className="h-20" />
    </div>
  );

  if (!data) return null;

  const yesP = Math.round(data.yes.probability * 100);
  const noP  = Math.round(data.no.probability  * 100);
  const empty = data.yes.count + data.no.count === 0;

  if (empty) return (
    <div className="text-center py-10 space-y-2">
      <p className="text-3xl">📊</p>
      <p className="text-muted text-sm">Aún no hay apuestas en este mercado</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Pool stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-success font-bold">SÍ</span>
            <span className="text-success text-2xl font-black">{yesP}%</span>
          </div>
          <p className="text-sm text-foreground font-semibold">
            {data.yes.total_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </p>
          <p className="text-xs text-muted">${data.yes.total_usd.toFixed(2)} USD</p>
          <p className="text-xs text-muted mt-1">{data.yes.count} apostador{data.yes.count !== 1 ? "es" : ""}</p>
        </div>
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-danger font-bold">NO</span>
            <span className="text-danger text-2xl font-black">{noP}%</span>
          </div>
          <p className="text-sm text-foreground font-semibold">
            {data.no.total_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </p>
          <p className="text-xs text-muted">${data.no.total_usd.toFixed(2)} USD</p>
          <p className="text-xs text-muted mt-1">{data.no.count} apostador{data.no.count !== 1 ? "es" : ""}</p>
        </div>
      </div>

      {/* Probability bar */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>SÍ {yesP}%</span>
          <span>NO {noP}%</span>
        </div>
        <div className="h-3 rounded-full bg-danger/30 overflow-hidden">
          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${yesP}%` }} />
        </div>
      </div>

      {/* Probability chart */}
      {data.history.length >= 2 && (
        <div>
          <p className="text-xs text-muted mb-2">Probabilidad SÍ a lo largo del tiempo</p>
          <div className="rounded-xl border border-border bg-background p-3 overflow-hidden">
            <ProbChart history={data.history} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ marketId }: { marketId: number }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(() => {
    apiGetActivity(marketId)
      .then(({ activity }) => setActivity(activity))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  function icon(item: ActivityItem) {
    if (item.type === "claim")     return "🏆";
    if (item.type === "resolved")  return "✅";
    if (item.type === "cancelled") return "❌";
    return item.side === "yes" ? "🟢" : "🔴";
  }

  function label(item: ActivityItem) {
    const fmt = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 0 });
    if (item.type === "claim")     return `@${item.username} cobró ${fmt(item.amount!)} VDN`;
    if (item.type === "resolved")  return `Mercado resuelto como ${item.side === "yes" ? "SÍ" : "NO"}`;
    if (item.type === "cancelled") return "Mercado cancelado";
    return `@${item.username} apostó ${fmt(item.amount!)} VDN a ${item.side === "yes" ? "SÍ" : "NO"}`;
  }

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-11" />)}
    </div>
  );

  if (activity.length === 0) return (
    <div className="text-center py-10 space-y-2">
      <p className="text-3xl">⚡</p>
      <p className="text-muted text-sm">Sin actividad aún</p>
    </div>
  );

  return (
    <div>
      <div className="space-y-0.5">
        {activity.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors">
            <span className="text-base flex-shrink-0">{icon(item)}</span>
            <p className="flex-1 text-sm text-foreground">{label(item)}</p>
            <span className="text-xs text-muted whitespace-nowrap">{timeAgo(item.timestamp)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted mt-3">Actualiza cada 30 s</p>
    </div>
  );
}

// ─── Tabs wrapper ─────────────────────────────────────────────────────────────

function MarketTabs({ marketId }: { marketId: number }) {
  const [tab, setTab] = useState<"comments" | "holders" | "positions" | "activity">("comments");

  const tabs = [
    { id: "comments"  as const, label: "Comentarios" },
    { id: "holders"   as const, label: "Top Holders" },
    { id: "positions" as const, label: "Posiciones" },
    { id: "activity"  as const, label: "Actividad" },
  ];

  return (
    <div className="mt-8">
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-accent text-accent-light"
                : "border-transparent text-muted hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "comments"  && <CommentsTab  marketId={marketId} />}
      {tab === "holders"   && <TopHoldersTab marketId={marketId} />}
      {tab === "positions" && <PositionsTab  marketId={marketId} />}
      {tab === "activity"  && <ActivityTab   marketId={marketId} />}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketDetail() {
  const params = useParams();
  const marketId = BigInt(params.id as string);
  const { address } = useAccount();
  const { isLoggedIn } = useAuth();

  // Custodial market data (REST API) — source of truth for timestamps/status
  const [custodialMkt, setCustodialMkt] = useState<ApiMarket | null>(null);
  const [custodialLoading, setCustodialLoading] = useState(true);

  useEffect(() => {
    setCustodialLoading(true);
    getMarket(Number(params.id as string))
      .then(({ market }) => setCustodialMkt(market))
      .catch(() => {})
      .finally(() => setCustodialLoading(false));
  }, [params.id]);

  const { market, isLoading: chainLoading, refetch: refetchMarket } = useMarket(marketId);
  const { position, refetch: refetchPos } = usePosition(marketId, address);
  const claim = useClaimReward();

  // Prefer custodial API timestamps over on-chain (which returns 0 for custodial markets)
  const effectiveCloseTime   = custodialMkt ? BigInt(custodialMkt.closeTime)   : (market?.closeTime   ?? 0n);
  const effectiveResolveTime = custodialMkt ? BigInt(custodialMkt.resolveTime) : (market?.resolveTime ?? 0n);
  const effectiveQuestion    = custodialMkt?.question || market?.question || "";

  const countdown = useCountdown(effectiveCloseTime);

  useEffect(() => {
    if (claim.isSuccess) refetchPos();
  }, [claim.isSuccess, refetchPos]);

  const isLoading = custodialLoading && chainLoading;

  if (isLoading)
    return <div className="text-center text-muted py-20">Cargando mercado…</div>;
  if (!custodialMkt && !market)
    return <div className="text-center text-muted py-20">Mercado no encontrado.</div>;

  const now = Math.floor(Date.now() / 1000);

  // Use custodial status when available; fall back to on-chain outcome
  const isOpen = custodialMkt
    ? custodialMkt.status === "OPEN"
    : (market?.outcome === Outcome.OPEN);
  const isClosed = now >= Number(effectiveCloseTime);

  const canClaim =
    market &&
    position &&
    position.netAmount > 0n &&
    !position.claimed &&
    (market.outcome === Outcome.CANCELLED || market.resolved);

  const userWon =
    market?.resolved &&
    position &&
    ((market.outcome === Outcome.YES && position.isYes) ||
      (market.outcome === Outcome.NO && !position.isYes));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4">
        <Link href="/" className="hover:text-foreground transition-colors">
          Mercados
        </Link>
        <span>/</span>
        <span>#{String(marketId)}</span>
      </div>

      {/* Question */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug mb-4">
        {effectiveQuestion}
      </h1>

      {/* Status + countdown */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOpen && !isClosed
              ? "bg-success/10 text-success"
              : (market?.outcome === Outcome.CANCELLED || custodialMkt?.status === "CANCELLED")
              ? "bg-muted/20 text-muted"
              : "bg-accent/10 text-accent-light"
          }`}
        >
          {isOpen && !isClosed
            ? "Abierto"
            : custodialMkt
            ? (custodialMkt.status === "YES" ? "SÍ ganó" : custodialMkt.status === "NO" ? "NO ganó" : custodialMkt.status === "CANCELLED" ? "Cancelado" : "Cerrado")
            : getOutcomeLabel(market?.outcome ?? Outcome.OPEN)}
        </span>

        {isOpen && !isClosed && (
          <span className="flex items-center gap-1.5 text-sm text-warning font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            Cierra en {countdown}
          </span>
        )}

        {isOpen && isClosed && (
          <span className="text-sm text-muted">
            Cerrado · pendiente de resolución
          </span>
        )}
      </div>

      {/* Pool visualization */}
      <PoolCard
        totalPoolYes={market?.totalPoolYes ?? 0n}
        totalPoolNo={market?.totalPoolNo ?? 0n}
      />

      {/* Bet form — only when market is open AND bets still accepted */}
      {isOpen && !isClosed && (
        isLoggedIn
          ? <CustodialBetForm marketId={Number(marketId)} />
          : <BetForm
              marketId={marketId}
              existingPosition={
                position && position.netAmount > 0n
                  ? { netAmount: position.netAmount, isYes: position.isYes }
                  : null
              }
            />
      )}

      {/* Claim reward */}
      {canClaim && (
        <div className="p-5 rounded-xl bg-surface border border-border mb-6">
          <h2 className="font-semibold text-foreground mb-3">
            {market?.outcome === Outcome.CANCELLED
              ? "Reembolso disponible"
              : userWon
              ? "🏆 ¡Ganaste! Cobra tu recompensa"
              : "Cobrar"}
          </h2>
          <p className="text-sm text-muted mb-4">
            {market?.outcome === Outcome.CANCELLED
              ? `Recibirás ${formatVDN(position!.netAmount)} VDN (tu 96% neto de vuelta).`
              : "Tu recompensa es proporcional al porcentaje del pool ganador que aportaste."}
          </p>
          <button
            onClick={() => claim.claim(marketId)}
            disabled={claim.isPending || claim.isConfirming}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {claim.isPending || claim.isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Procesando…
              </span>
            ) : (
              "Cobrar"
            )}
          </button>
          {claim.hash && (
            <div className="mt-2 text-center">
              <TxLink hash={claim.hash} />
            </div>
          )}
          {claim.isSuccess && (
            <p className="mt-2 text-xs text-success text-center">
              ¡Recompensa cobrada exitosamente!
            </p>
          )}
          {claim.error && (
            <p className="mt-2 text-xs text-danger text-center">
              {parseClaimError(claim.error)}
            </p>
          )}
        </div>
      )}

      {position?.claimed && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm text-center mb-6">
          Ya cobraste tu recompensa en este mercado.
        </div>
      )}

      {/* Market metadata */}
      <div className="p-4 rounded-lg bg-surface border border-border text-xs text-muted space-y-1.5">
        <div className="flex justify-between">
          <span>Creador</span>
          {market?.creator && market.creator !== "0x0000000000000000000000000000000000000000" ? (
            <a
              href={`${EXPLORER_BASE}/address/${market.creator}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-light hover:underline"
            >
              {market.creator.slice(0, 8)}…{market.creator.slice(-6)}
            </a>
          ) : (
            <span className="text-foreground">{custodialMkt?.creator ?? "admin"}</span>
          )}
        </div>
        <div className="flex justify-between">
          <span>Cierre de apuestas</span>
          <span className="text-foreground">
            {new Date(Number(effectiveCloseTime) * 1000).toLocaleString("es")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Resolución mínima</span>
          <span className="text-foreground">
            {new Date(Number(effectiveResolveTime) * 1000).toLocaleString("es")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Contrato</span>
          <a
            href={`${EXPLORER_BASE}/address/0x080D8A100fc43b17b08B5ED57842c6a5247beF26`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light hover:underline"
          >
            0x080D…eF26
          </a>
        </div>
      </div>

      {/* Social tabs */}
      <MarketTabs marketId={Number(marketId)} />
    </div>
  );
}
