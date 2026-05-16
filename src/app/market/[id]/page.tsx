"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  useMarket, useClaimReward, getOutcomeLabel,
} from "@/hooks/usePredictionMarket";
import { useWrongNetwork } from "@/hooks/useWrongNetwork";
import { TxLink } from "@/components/TxLink";
import { Outcome, EXPLORER_BASE } from "@/config/contracts";
import { useAuth } from "@/context/AuthContext";
import {
  apiBuy, apiSell, apiMyPositions,
  apiGetMarketPrice, apiGetPriceHistory,
  apiGetComments, apiPostComment, apiLikeComment,
  apiGetTopHolders, apiGetActivity,
  ApiError,
  type BuyResult, type SellResult, type LmsrPosition,
  type MarketPrice, type PriceHistoryPoint,
  type Comment, type TopHolder, type ActivityItem,
} from "@/lib/custodialApi";
import { getMarket, type ApiMarket } from "@/lib/api";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, ReferenceDot,
} from "recharts";

const VDN_PRICE_USD = 0.01;

// ─── Client-side LMSR math ────────────────────────────────────────────────────

const LMSR_B = 2000 / Math.LN2; // ≈ 2885.39

function lmsrCostFn(qYes: number, qNo: number) {
  const rY = qYes / LMSR_B, rN = qNo / LMSR_B;
  const mx = Math.max(rY, rN);
  return LMSR_B * (mx + Math.log(Math.exp(rY - mx) + Math.exp(rN - mx)));
}

function lmsrGetPrice(qYes: number, qNo: number) {
  const rY = qYes / LMSR_B, rN = qNo / LMSR_B;
  const mx = Math.max(rY, rN);
  const eY = Math.exp(rY - mx), eN = Math.exp(rN - mx);
  const s  = eY + eN;
  return { pY: eY / s, pN: eN / s };
}

function lmsrSharesForVDN(qYes: number, qNo: number, side: "yes" | "no", net: number) {
  if (net <= 0) return 0;
  let lo = 0, hi = net * 1.01;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const before = lmsrCostFn(qYes, qNo);
    const after  = side === "yes" ? lmsrCostFn(qYes + mid, qNo) : lmsrCostFn(qYes, qNo + mid);
    if (after - before < net) lo = mid; else hi = mid;
  }
  return lo;
}

function lmsrSellReturn(qYes: number, qNo: number, side: "yes" | "no", delta: number) {
  const before = lmsrCostFn(qYes, qNo);
  const after  = side === "yes" ? lmsrCostFn(qYes - delta, qNo) : lmsrCostFn(qYes, qNo - delta);
  return Math.max(0, before - after);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountdown(closeTime: number) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = closeTime - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setLabel("Cerrado"); return; }
      const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600),
            m = Math.floor((diff % 3600) / 60), s = diff % 60;
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-alt ${className ?? ""}`} />;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function fmt2(n: number) { return n.toLocaleString("es", { maximumFractionDigits: 2 }); }
function fmt0(n: number) { return n.toLocaleString("es", { maximumFractionDigits: 0 }); }

// ─── LMSR Price bar ──────────────────────────────────────────────────────────

function PriceBar({ pctYes, pctNo }: { pctYes: number; pctNo: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-left">
          <span className="text-success font-black text-4xl tabular-nums">{pctYes.toFixed(1)}%</span>
          <div className="text-xs text-muted mt-0.5">SÍ</div>
        </div>
        <div className="flex-1 mx-4">
          <div className="h-3 rounded-full bg-danger/30 overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${pctYes}%` }} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-danger font-black text-4xl tabular-nums">{pctNo.toFixed(1)}%</span>
          <div className="text-xs text-muted mt-0.5">NO</div>
        </div>
      </div>
    </div>
  );
}

// ─── LMSR Price chart ─────────────────────────────────────────────────────────

function fmtTs(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("es", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function PriceChart({ history }: { history: PriceHistoryPoint[] }) {
  const pts = (() => {
    if (history.length === 0) return [];
    // need at least 2 points to draw a line — duplicate if only 1
    const base = history.length === 1
      ? [history[0], { ...history[0], timestamp: history[0].timestamp + 60 }]
      : history;
    return base.map(p => ({ ts: p.timestamp, v: Math.round(p.price_yes * 100) }));
  })();

  if (pts.length === 0) return (
    <p className="text-xs text-muted text-center py-4">Aún no hay historial</p>
  );

  const lastPt   = pts[pts.length - 1];
  const currentPct = lastPt.v.toFixed(1);

  return (
    <div className="rounded-xl bg-background border border-border p-4">
      <div className="flex justify-between text-xs text-muted mb-3">
        <span>Probabilidad SÍ</span>
        <span className="text-success font-semibold">{currentPct}%</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={pts} margin={{ top: 6, right: 44, bottom: 4, left: 0 }}>
          <CartesianGrid
            stroke="rgba(0,0,0,0.06)"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            tickFormatter={fmtTs}
            tick={{ fill: "#9CA3AF", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickCount={4}
          />
          <YAxis
            orientation="right"
            domain={[0, 100]}
            ticks={[20, 40, 60, 80, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fill: "#9CA3AF", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={lastPt.ts}
            y={lastPt.v}
            r={4}
            fill="#10B981"
            stroke="#10B981"
            strokeWidth={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Buy/Sell form (custodial LMSR) ──────────────────────────────────────────

function LmsrTradingPanel({
  marketId, qYes, qNo, isOpen, onTrade,
}: {
  marketId: number; qYes: number; qNo: number; isOpen: boolean; onTrade: () => void;
}) {
  const { user, token, balance, isLoggedIn, refreshBalance } = useAuth();
  const [tab, setTab]   = useState<"buy" | "sell">("buy");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<LmsrPosition[]>([]);

  const vdnBalance = balance?.balance_vdn ?? user?.balance_vdn ?? 0;
  const gross = Number(amount) || 0;
  const BURN  = 0.02, FEE = 0.02, NET_RATE = 0.96;

  // Client-side LMSR preview (buy)
  const net      = gross * NET_RATE;
  const burned   = gross * BURN;
  const fee      = gross * FEE;
  const received = gross > 0 ? lmsrSharesForVDN(qYes, qNo, side, net) : 0;
  const avgPrice = received > 0 ? net / received : 0;
  const { pY: pYesAfter, pN: pNoAfter } = received > 0
    ? lmsrGetPrice(side === "yes" ? qYes + received : qYes, side === "no" ? qNo + received : qNo)
    : lmsrGetPrice(qYes, qNo);
  const potentialGain = received - net;

  // Client-side LMSR preview (sell)
  const sharesToSell = Number(sellShares) || 0;
  const myPosSide = myPos.find(p => p.side === side);
  const myShares  = myPosSide?.shares ?? 0;
  const SELL_FEE  = 0.01;
  const lmsrReturn = sharesToSell > 0 ? lmsrSellReturn(qYes, qNo, side, sharesToSell) : 0;
  const sellFeeAmt = lmsrReturn * SELL_FEE;
  const netReceived = lmsrReturn * (1 - SELL_FEE);
  const entryPrice = myPosSide?.avg_entry_price ?? 0;
  const sellCostBasis = entryPrice * sharesToSell;
  const pnl = netReceived - sellCostBasis;

  useEffect(() => {
    if (!token || !isLoggedIn) return;
    apiMyPositions(token).then(({ positions }) => {
      setMyPos(positions.filter(p => p.market_id === marketId));
    }).catch(() => {});
  }, [token, isLoggedIn, marketId, success]);

  async function handleBuy() {
    if (!token || gross <= 0 || gross > vdnBalance) return;
    setLoading(true); setError(null);
    try {
      const res = await apiBuy(token, marketId, side, gross);
      setSuccess(`Compraste ${res.shares_received.toFixed(2)} shares de ${side.toUpperCase()}`);
      setAmount("");
      await refreshBalance();
      onTrade();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al comprar");
    } finally { setLoading(false); }
  }

  async function handleSell() {
    if (!token || sharesToSell <= 0 || sharesToSell > myShares) return;
    setLoading(true); setError(null);
    try {
      const res = await apiSell(token, marketId, side, sharesToSell);
      setSuccess(`Vendiste ${res.shares_sold.toFixed(2)} shares y recibiste ${res.net_received.toFixed(2)} VDN`);
      setSellShares("");
      await refreshBalance();
      onTrade();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al vender");
    } finally { setLoading(false); }
  }

  if (!isLoggedIn) return (
    <div className="p-5 rounded-xl bg-surface border border-border text-center space-y-3">
      <p className="text-muted text-sm">Inicia sesión para operar</p>
      <Link href="/login" className="inline-block px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
        Iniciar sesión
      </Link>
    </div>
  );

  if (!isOpen) return (
    <div className="p-4 rounded-xl bg-surface-alt border border-border text-center text-muted text-sm">
      Este mercado está cerrado — ya no se pueden realizar operaciones.
    </div>
  );

  return (
    <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-background border border-border">
          {(["buy", "sell"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}>
              {t === "buy" ? "Comprar" : "Vender"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">
          Saldo: <span className="text-accent-light font-semibold">{fmt0(vdnBalance)} VDN</span>
        </span>
      </div>

      {/* SÍ / NO toggle */}
      <div className="grid grid-cols-2 gap-3">
        {(["yes", "no"] as const).map(s => (
          <button key={s} onClick={() => setSide(s)}
            className={`py-2.5 rounded-lg font-bold text-sm transition-all ${
              s === "yes"
                ? side === "yes" ? "bg-success text-white shadow-lg shadow-success/20" : "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                : side === "no"  ? "bg-danger text-white shadow-lg shadow-danger/20"  : "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
            }`}>
            {s === "yes" ? "SÍ" : "NO"}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success">{success}</div>
      )}

      {/* BUY TAB */}
      {tab === "buy" && (
        <>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-muted">Cantidad a invertir (VDN)</label>
              <button onClick={() => setAmount(String(Math.floor(vdnBalance)))}
                className="text-xs text-accent-light underline hover:text-accent">MAX</button>
            </div>
            <input type="number" inputMode="decimal" min="0" value={amount}
              onChange={e => setAmount(e.target.value)} onFocus={e => e.target.select()}
              placeholder="Ej: 1000"
              className={`w-full px-4 py-3 rounded-lg bg-background border text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                gross > vdnBalance ? "border-danger" : "border-border focus:border-accent"
              }`} />
          </div>

          {gross > 0 && (
            <div className="rounded-lg bg-background border border-border p-3 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-sm mb-2">
                <span>Shares que recibirás</span>
                <span className={side === "yes" ? "text-success" : "text-danger"}>{fmt2(received)} shares</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Precio promedio por share</span>
                <span className="text-foreground">{(avgPrice * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Precio {side === "yes" ? "SÍ" : "NO"} después</span>
                <span className="text-foreground">{((side === "yes" ? pYesAfter : pNoAfter) * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Ganancia si acierta</span>
                <span className={potentialGain > 0 ? "text-success" : "text-foreground"}>
                  {potentialGain > 0 ? "+" : ""}{fmt2(potentialGain)} VDN
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-muted">
                <span>🔥 Quema (2%)</span>
                <span className="text-danger">−{fmt2(burned)} VDN</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>🏦 Treasury (2%)</span>
                <span className="text-warning">−{fmt2(fee)} VDN</span>
              </div>
              <div className="flex justify-between font-medium border-t border-border pt-1">
                <span>Va al pool</span>
                <span className="text-success">+{fmt2(net)} VDN</span>
              </div>
            </div>
          )}

          <button onClick={handleBuy}
            disabled={loading || gross <= 0 || gross > vdnBalance}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
              side === "yes" ? "bg-success hover:bg-green-500 text-white" : "bg-danger hover:bg-red-500 text-white"
            }`}>
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner />Comprando…</span>
              : `Comprar ${side === "yes" ? "SÍ" : "NO"}`}
          </button>
        </>
      )}

      {/* SELL TAB */}
      {tab === "sell" && (
        <>
          {myShares > 0 ? (
            <>
              <div className="p-3 rounded-lg bg-surface-alt border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Tus shares de {side === "yes" ? "SÍ" : "NO"}</span>
                  <span className="font-semibold text-foreground">{fmt2(myShares)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Precio entrada promedio</span>
                  <span>{(entryPrice * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-muted">Shares a vender</label>
                  <button onClick={() => setSellShares(String(myShares))}
                    className="text-xs text-accent-light underline hover:text-accent">TODO</button>
                </div>
                <input type="number" inputMode="decimal" min="0" max={myShares}
                  value={sellShares} onChange={e => setSellShares(e.target.value)}
                  onFocus={e => e.target.select()} placeholder={`Máx: ${fmt2(myShares)}`}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
              </div>

              {sharesToSell > 0 && (
                <div className="rounded-lg bg-background border border-border p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-sm mb-2">
                    <span>Recibirás</span>
                    <span className="text-foreground">{fmt2(netReceived)} VDN</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>PnL vs entrada</span>
                    <span className={pnl >= 0 ? "text-success font-medium" : "text-danger font-medium"}>
                      {pnl >= 0 ? "+" : ""}{fmt2(pnl)} VDN ({pnl >= 0 ? "+" : ""}{sellCostBasis > 0 ? ((pnl / sellCostBasis) * 100).toFixed(1) : "0"}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>🏦 Fee salida (1%)</span>
                    <span className="text-warning">−{fmt2(sellFeeAmt)} VDN</span>
                  </div>
                </div>
              )}

              <button onClick={handleSell}
                disabled={loading || sharesToSell <= 0 || sharesToSell > myShares}
                className="w-full py-3 rounded-lg bg-surface-alt border border-border hover:border-danger text-danger font-semibold text-sm transition-all disabled:opacity-50">
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner />Vendiendo…</span>
                  : `Vender ${sharesToSell > 0 ? fmt2(sharesToSell) + " shares" : ""}`}
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-muted text-sm">
              No tienes shares de {side === "yes" ? "SÍ" : "NO"} para vender.
              <br />
              <button onClick={() => setTab("buy")} className="text-accent-light underline mt-2 text-xs">
                Ir a Comprar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Mi posición card ─────────────────────────────────────────────────────────

function MyPositionCard({ marketId, qYes, qNo, isOpen, onSell }: {
  marketId: number; qYes: number; qNo: number; isOpen: boolean; onSell: () => void;
}) {
  const { token, isLoggedIn } = useAuth();
  const [positions, setPositions] = useState<LmsrPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!token) return;
    apiMyPositions(token)
      .then(({ positions: ps }) => setPositions(ps.filter(p => p.market_id === marketId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, marketId]);

  useEffect(() => { if (isLoggedIn) reload(); else setLoading(false); }, [isLoggedIn, reload]);

  if (!isLoggedIn || loading) return null;
  if (positions.length === 0) return null;

  return (
    <div className="space-y-2">
      {positions.map(pos => {
        const curP = lmsrGetPrice(qYes, qNo);
        const curPrice = pos.side === "yes" ? curP.pY : curP.pN;
        const curValue = pos.shares * curPrice;
        const pnl      = curValue - pos.cost_basis;
        const pnlPct   = pos.cost_basis > 0 ? (pnl / pos.cost_basis) * 100 : 0;
        const isGreen  = pnl >= 0;

        return (
          <div key={pos.side}
            className={`p-4 rounded-xl border ${isGreen ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  pos.side === "yes" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                }`}>
                  {pos.side === "yes" ? "SÍ" : "NO"}
                </span>
                <span className="text-sm font-semibold text-foreground">{fmt2(pos.shares)} shares</span>
              </div>
              <span className={`text-sm font-bold ${isGreen ? "text-success" : "text-danger"}`}>
                {isGreen ? "+" : ""}{fmt2(pnl)} VDN ({isGreen ? "+" : ""}{pnlPct.toFixed(1)}%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-muted">
              <div>
                <div className="text-foreground font-medium">{(pos.avg_entry_price * 100).toFixed(1)}%</div>
                <div>Entrada</div>
              </div>
              <div>
                <div className="text-foreground font-medium">{(curPrice * 100).toFixed(1)}%</div>
                <div>Precio actual</div>
              </div>
              <div>
                <div className="text-foreground font-medium">{fmt2(curValue)} VDN</div>
                <div>Valor actual</div>
              </div>
            </div>
            {isOpen && (
              <button onClick={onSell}
                className="mt-3 w-full py-2 rounded-lg text-xs font-medium border border-border hover:border-danger text-muted hover:text-danger transition-colors">
                Vender posición →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab({ marketId }: { marketId: number }) {
  const { user, token, isLoggedIn } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiGetComments(marketId, sort); setComments(d.comments); }
    catch { /* silent */ } finally { setLoading(false); }
  }, [marketId, sort]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!token || !text.trim()) return;
    setSubmitting(true);
    try { const { comment } = await apiPostComment(token, marketId, text.trim()); setComments(p => [comment, ...p]); setText(""); }
    catch { /* silent */ } finally { setSubmitting(false); }
  }

  async function handleLike(id: number) {
    if (!token) return;
    try { const { like_count } = await apiLikeComment(token, marketId, id); setComments(p => p.map(c => c.id === id ? { ...c, like_count } : c)); }
    catch { /* silent */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1 text-xs">
        <span className="text-muted mr-1">Ordenar:</span>
        {(["recent", "popular"] as const).map(s => (
          <button key={s} onClick={() => setSort(s)}
            className={`px-2.5 py-1 rounded-md transition-colors ${sort === s ? "bg-accent/20 text-accent-light font-medium" : "text-muted hover:text-foreground"}`}>
            {s === "recent" ? "Reciente" : "Popular"}
          </button>
        ))}
      </div>
      {isLoggedIn ? (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-sm font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
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
          <Link href="/login" className="text-accent-light hover:underline">Inicia sesión</Link> para comentar
        </div>
      )}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">💬 Sé el primero en comentar</div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                {c.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold">@{c.username}</span>
                  <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/90 break-words leading-relaxed">{c.text}</p>
                <button onClick={() => handleLike(c.id)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors mt-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {c.like_count > 0 ? c.like_count : ""}
                </button>
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
    apiGetTopHolders(marketId).then(({ holders }) => setHolders(holders)).catch(() => {}).finally(() => setLoading(false));
  }, [marketId]);

  if (loading) return <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  if (holders.length === 0) return <div className="text-center py-8 text-muted text-sm">🏆 Aún no hay apuestas</div>;

  return (
    <div className="space-y-2">
      {holders.map((h, i) => (
        <div key={`${h.username}-${h.side}`}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${h.username === user?.username ? "border-accent bg-accent/5" : "border-border bg-surface"}`}>
          <span className={`text-sm font-bold w-6 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted"}`}>#{i+1}</span>
          <span className="flex-1 text-sm font-medium">@{h.username}{h.username === user?.username && <span className="ml-1 text-xs text-accent-light">(tú)</span>}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${h.side === "yes" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}`}>
            {h.side === "yes" ? "SÍ" : "NO"}
          </span>
          <span className="text-sm font-semibold tabular-nums">{fmt0(h.total_vdn)} VDN</span>
        </div>
      ))}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ marketId }: { marketId: number }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const load = useCallback(() => {
    apiGetActivity(marketId).then(({ activity }) => setActivity(activity)).catch(() => {}).finally(() => setLoading(false));
  }, [marketId]);
  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const icon  = (i: ActivityItem) => i.type === "claim" ? "🏆" : i.type === "resolved" ? "✅" : i.type === "cancelled" ? "❌" : i.side === "yes" ? "🟢" : "🔴";
  const label = (i: ActivityItem) => {
    if (i.type === "claim")     return `@${i.username} cobró ${fmt0(i.amount!)} VDN`;
    if (i.type === "resolved")  return `Mercado resuelto: ${i.side === "yes" ? "SÍ" : "NO"}`;
    if (i.type === "cancelled") return "Mercado cancelado";
    return `@${i.username} apostó ${fmt0(i.amount!)} VDN a ${i.side === "yes" ? "SÍ" : "NO"}`;
  };

  if (loading) return <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11" />)}</div>;
  if (activity.length === 0) return <div className="text-center py-8 text-muted text-sm">⚡ Sin actividad aún</div>;

  return (
    <div className="space-y-0.5">
      {activity.map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors">
          <span className="text-base flex-shrink-0">{icon(item)}</span>
          <p className="flex-1 text-sm text-foreground">{label(item)}</p>
          <span className="text-xs text-muted whitespace-nowrap">{timeAgo(item.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tabs wrapper ─────────────────────────────────────────────────────────────

function MarketTabs({ marketId }: { marketId: number }) {
  const [tab, setTab] = useState<"comments" | "holders" | "activity">("comments");
  const tabs = [
    { id: "comments" as const, label: "Comentarios" },
    { id: "holders"  as const, label: "Top Holders"  },
    { id: "activity" as const, label: "Actividad"    },
  ];
  return (
    <div className="mt-8">
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id ? "border-accent text-accent-light" : "border-transparent text-muted hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "comments" && <CommentsTab  marketId={marketId} />}
      {tab === "holders"  && <TopHoldersTab marketId={marketId} />}
      {tab === "activity" && <ActivityTab   marketId={marketId} />}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketDetail() {
  const params   = useParams();
  const numId    = Number(params.id as string);
  const { isLoggedIn } = useAuth();

  // Custodial market data
  const [custodialMkt, setCustodialMkt] = useState<ApiMarket | null>(null);
  const [custodialLoading, setCustodialLoading] = useState(true);

  // LMSR live price
  const [lmsrPrice, setLmsrPrice] = useState<MarketPrice | null>(null);
  const [history, setHistory]     = useState<PriceHistoryPoint[]>([]);

  // Sell panel trigger from position card
  const [forceSell, setForceSell] = useState(false);

  const loadPrice = useCallback(() => {
    apiGetMarketPrice(numId).then(setLmsrPrice).catch(() => {});
    apiGetPriceHistory(numId).then(({ history }) => setHistory(history)).catch(() => {});
  }, [numId]);

  useEffect(() => {
    setCustodialLoading(true);
    getMarket(numId)
      .then(({ market }) => setCustodialMkt(market))
      .catch(() => {})
      .finally(() => setCustodialLoading(false));
    loadPrice();
    const id = setInterval(loadPrice, 5_000);
    return () => clearInterval(id);
  }, [numId, loadPrice]);

  const effectiveCloseTime   = custodialMkt?.closeTime   ?? 0;
  const effectiveResolveTime = custodialMkt?.resolveTime ?? 0;
  const effectiveQuestion    = custodialMkt?.question    ?? "";
  const countdown = useCountdown(effectiveCloseTime);
  const now       = Math.floor(Date.now() / 1000);
  const isOpen    = custodialMkt?.status === "OPEN";
  const isClosed  = now >= effectiveCloseTime;

  const qYes = lmsrPrice?.shares_yes ?? 0;
  const qNo  = lmsrPrice?.shares_no  ?? 0;
  const pctYes = lmsrPrice?.pct_yes ?? 50;
  const pctNo  = lmsrPrice?.pct_no  ?? 50;

  if (custodialLoading)
    return <div className="text-center text-muted py-20">Cargando mercado…</div>;
  if (!custodialMkt)
    return <div className="text-center text-muted py-20">Mercado no encontrado.</div>;

  const statusLabel =
    custodialMkt.status === "YES"       ? "SÍ ganó" :
    custodialMkt.status === "NO"        ? "NO ganó" :
    custodialMkt.status === "CANCELLED" ? "Cancelado" :
    isClosed                            ? "Cerrado · pendiente de resolución" : "Abierto";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4">
        <Link href="/" className="hover:text-foreground transition-colors">Mercados</Link>
        <span>/</span>
        <span>#{numId}</span>
        {custodialMkt.publicId && <span className="text-xs font-mono">{custodialMkt.publicId}</span>}
      </div>

      {/* Title */}
      <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-snug mb-4">
        {effectiveQuestion}
      </h1>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isOpen && !isClosed ? "bg-success/10 text-success" :
          custodialMkt.status === "CANCELLED" ? "bg-muted/20 text-muted" : "bg-accent/10 text-accent-light"
        }`}>
          {statusLabel}
        </span>
        {isOpen && !isClosed && (
          <span className="flex items-center gap-1.5 text-sm text-warning font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse inline-block" />
            Cierra en {countdown}
          </span>
        )}
      </div>

      {/* ── LMSR Price — lo más importante ── */}
      <div className="p-5 rounded-xl bg-surface border border-border mb-4">
        <PriceBar pctYes={pctYes} pctNo={pctNo} />
        <div className="mt-3 text-xs text-muted text-center">
          Actualiza cada 5 s · Precio LMSR en tiempo real
        </div>
        <div className="mt-4">
          <PriceChart history={history} />
        </div>
      </div>

      {/* Pool volume */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        {[
          { label: "Pool total", value: `${fmt0(lmsrPrice?.pool_total_vdn ?? 2000)} VDN` },
          { label: "Shares SÍ", value: fmt2(qYes) },
          { label: "Shares NO", value: fmt2(qNo)  },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-lg bg-surface-alt border border-border">
            <div className="text-xs text-muted mb-1">{label}</div>
            <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Mi posición (si tiene shares) */}
      {isLoggedIn && (
        <div className="mb-4">
          <MyPositionCard
            marketId={numId} qYes={qYes} qNo={qNo} isOpen={isOpen && !isClosed}
            onSell={() => setForceSell(true)}
          />
        </div>
      )}

      {/* Buy/Sell panel */}
      {isOpen && !isClosed && (
        <div className="mb-6">
          <LmsrTradingPanel
            marketId={numId} qYes={qYes} qNo={qNo}
            isOpen={isOpen && !isClosed}
            onTrade={() => { loadPrice(); setForceSell(false); }}
          />
        </div>
      )}

      {/* Resolved/Cancelled state */}
      {(!isOpen || isClosed) && custodialMkt.status !== "OPEN" && (
        <div className="p-4 rounded-xl bg-surface border border-border mb-6 text-center">
          <p className="text-sm text-muted">
            {custodialMkt.status === "YES" && "🏆 SÍ ganó — si tienes shares de SÍ, contacta soporte para canjear."}
            {custodialMkt.status === "NO"  && "🏆 NO ganó — si tienes shares de NO, contacta soporte para canjear."}
            {custodialMkt.status === "CANCELLED" && "❌ Mercado cancelado — el costo base te será reembolsado."}
          </p>
        </div>
      )}

      {/* Market metadata */}
      <div className="p-4 rounded-lg bg-surface border border-border text-xs text-muted space-y-1.5 mb-6">
        <div className="flex justify-between">
          <span>Cierre de apuestas</span>
          <span className="text-foreground">{new Date(effectiveCloseTime * 1000).toLocaleString("es")}</span>
        </div>
        <div className="flex justify-between">
          <span>Resolución mínima</span>
          <span className="text-foreground">{new Date(effectiveResolveTime * 1000).toLocaleString("es")}</span>
        </div>
        <div className="flex justify-between">
          <span>Liquidez inicial (Viden)</span>
          <span className="text-foreground">2,000 VDN</span>
        </div>
        <div className="flex justify-between">
          <span>Mecanismo</span>
          <span className="text-foreground">LMSR (b≈2885)</span>
        </div>
        {custodialMkt.resolutionCriteria && (
          <div className="pt-1 border-t border-border">
            <div className="text-muted mb-0.5">Criterio de resolución</div>
            <div className="text-foreground leading-relaxed">{custodialMkt.resolutionCriteria}</div>
          </div>
        )}
      </div>

      {/* Social tabs */}
      <MarketTabs marketId={numId} />
    </div>
  );
}
