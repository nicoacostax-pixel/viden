"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  apiMyPositions, apiSell,
  type LmsrPosition, type SellResult,
} from "@/lib/custodialApi";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(n: number, dec = 2) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function pnlColor(n: number) {
  if (n > 0) return "text-success";
  if (n < 0) return "text-danger";
  return "text-muted";
}

function statusLabel(status: string) {
  switch (status) {
    case "OPEN":      return { label: "Abierto",   cls: "bg-success/10 text-success" };
    case "YES":       return { label: "Resuelto: SÍ", cls: "bg-accent/10 text-accent-light" };
    case "NO":        return { label: "Resuelto: NO", cls: "bg-danger/10 text-danger" };
    case "CANCELLED": return { label: "Cancelado", cls: "bg-muted/20 text-muted" };
    default:          return { label: status,      cls: "bg-muted/20 text-muted" };
  }
}

// ── Sell panel ────────────────────────────────────────────────────────────────

function SellPanel({
  position,
  token,
  onSold,
  onCancel,
}: {
  position: LmsrPosition;
  token: string;
  onSold: (result: SellResult) => void;
  onCancel: () => void;
}) {
  const [sharesToSell, setSharesToSell] = useState(position.shares);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<SellResult | null>(null);

  const fraction        = position.shares > 0 ? sharesToSell / position.shares : 0;
  const estimatedReturn = position.current_value * fraction * 0.99; // approximate after 1% fee

  async function handleSell() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiSell(token, position.market_id, position.side, sharesToSell);
      setSuccess(result);
      setTimeout(() => onSold(result), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al vender");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/30 text-sm text-success">
        Vendiste {success.shares_sold.toFixed(2)} shares → recibiste {fmt(success.net_received)} VDN
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-surface-raised border border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Vender shares</span>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">✕ Cancelar</button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Shares a vender</span>
          <span>Max: {fmt(position.shares, 4)}</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={0.0001}
            max={position.shares}
            step={0.0001}
            value={sharesToSell}
            onChange={e => setSharesToSell(Math.min(position.shares, Math.max(0, Number(e.target.value))))}
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => setSharesToSell(position.shares)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-muted hover:text-foreground transition-colors"
          >
            Todo
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={position.shares}
          step={position.shares / 1000}
          value={sharesToSell}
          onChange={e => setSharesToSell(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Recibirías ~</span>
        <span className="font-semibold text-foreground">{fmt(estimatedReturn)} VDN</span>
      </div>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      <button
        onClick={handleSell}
        disabled={loading || sharesToSell <= 0}
        className="w-full py-2 rounded-lg bg-danger hover:bg-danger/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? "Vendiendo…" : `Vender ${fmt(sharesToSell, 2)} shares`}
      </button>
    </div>
  );
}

// ── LMSR Position card ────────────────────────────────────────────────────────

function LmsrPositionCard({
  position,
  token,
  onSold,
}: {
  position: LmsrPosition;
  token: string;
  onSold: () => void;
}) {
  const [selling, setSelling] = useState(false);

  const isOpen = position.market_status === "OPEN";
  const isWinningResolved =
    (position.market_status === "YES" && position.side === "yes") ||
    (position.market_status === "NO"  && position.side === "no");
  const isLosingResolved =
    (position.market_status === "YES" && position.side === "no") ||
    (position.market_status === "NO"  && position.side === "yes");

  const { label: statusText, cls: statusCls } = statusLabel(position.market_status);

  const sideLabel = position.side === "yes" ? "SÍ" : "NO";
  const sideCls   = position.side === "yes" ? "text-success" : "text-danger";

  // Market page link uses public_id if available; fallback to market_id
  const marketHref = `/market/${position.market_id}`;

  return (
    <div className={`p-4 rounded-xl bg-surface border transition-colors ${
      isWinningResolved ? "border-success/40" : isLosingResolved ? "border-danger/30 opacity-70" : "border-border"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          href={marketHref}
          className="font-medium text-foreground hover:text-accent-light transition-colors leading-snug flex-1"
        >
          {position.question}
        </Link>
        <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${statusCls}`}>
          {statusText}
        </span>
      </div>

      {/* Position details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted mb-0.5">Posición</div>
          <div className={`text-sm font-semibold ${sideCls}`}>{sideLabel}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-0.5">Shares</div>
          <div className="text-sm font-medium text-foreground">{fmt(position.shares, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-0.5">Precio entrada</div>
          <div className="text-sm font-medium text-foreground">{(position.avg_entry_price * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-0.5">Precio actual</div>
          <div className="text-sm font-medium text-foreground">
            {position.side === "yes"
              ? `${position.price_yes_pct.toFixed(1)}%`
              : `${position.price_no_pct.toFixed(1)}%`}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted mb-0.5">Invertido</div>
          <div className="text-sm font-medium text-foreground">{fmt(position.cost_basis)} VDN</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-0.5">Valor actual</div>
          <div className="text-sm font-medium text-foreground">{fmt(position.current_value)} VDN</div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-muted mb-0.5">PnL no realizado</div>
          <div className={`text-sm font-semibold ${pnlColor(position.pnl_unrealized)}`}>
            {position.pnl_unrealized >= 0 ? "+" : ""}{fmt(position.pnl_unrealized)} VDN
            {" "}
            <span className="text-xs font-normal">({fmtPct(position.pnl_pct)})</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isOpen && !selling && (
        <button
          onClick={() => setSelling(true)}
          className="px-4 py-2 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium transition-colors"
        >
          Vender posición
        </button>
      )}

      {isOpen && selling && (
        <SellPanel
          position={position}
          token={token}
          onSold={() => { setSelling(false); onSold(); }}
          onCancel={() => setSelling(false)}
        />
      )}

      {isWinningResolved && (
        <div className="mt-2 text-sm text-success font-medium">
          Ganaste — cada share vale 1 VDN al reclamar
        </div>
      )}

      {isLosingResolved && (
        <div className="mt-2 text-sm text-muted">
          Esta posición no ganó
        </div>
      )}

      {position.market_status === "CANCELLED" && (
        <div className="mt-2 text-sm text-muted">
          Mercado cancelado — reembolso en proceso
        </div>
      )}
    </div>
  );
}

// ── LMSR stats bar ────────────────────────────────────────────────────────────

function LmsrStats({ positions }: { positions: LmsrPosition[] }) {
  const open     = positions.filter(p => p.market_status === "OPEN");
  const invested = open.reduce((s, p) => s + p.cost_basis, 0);
  const value    = open.reduce((s, p) => s + p.current_value, 0);
  const pnl      = value - invested;
  const count    = open.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Posiciones abiertas", value: String(count),              color: "text-foreground" },
        { label: "Total invertido",     value: `${fmt(invested)} VDN`,     color: "text-foreground" },
        { label: "Valor actual",        value: `${fmt(value)} VDN`,        color: "text-foreground" },
        { label: "PnL no realizado",
          value: `${pnl >= 0 ? "+" : ""}${fmt(pnl)} VDN`,
          color: pnlColor(pnl) },
      ].map(({ label, value: val, color }) => (
        <div key={label} className="p-3 rounded-xl bg-surface border border-border text-center">
          <div className="text-xs text-muted mb-1">{label}</div>
          <div className={`text-sm font-semibold ${color}`}>{val}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main LMSR portfolio section ───────────────────────────────────────────────

function LmsrPortfolioSection() {
  const { token, isLoggedIn, isLoading: authLoading, refreshBalance } = useAuth();

  const [positions, setPositions] = useState<LmsrPosition[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const data = await apiMyPositions(token);
      setPositions(data.positions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn && token) load();
  }, [isLoggedIn, token, load]);

  const handleSold = useCallback(() => {
    load();
    refreshBalance();
  }, [load, refreshBalance]);

  if (authLoading) return null;

  if (!isLoggedIn) {
    return (
      <div className="mb-8 p-6 rounded-xl bg-surface border border-border text-center">
        <p className="text-muted mb-3">Inicia sesión para ver tus posiciones en mercados de predicción.</p>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center text-muted py-10">Cargando posiciones…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-danger">No se pudieron cargar las posiciones.</p>
        <button onClick={load} className="text-sm text-accent-light underline hover:text-accent">
          Reintentar
        </button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center text-muted py-10">
        No tienes posiciones aún.{" "}
        <Link href="/" className="text-accent-light underline">Ver mercados →</Link>
      </div>
    );
  }

  const openPositions   = positions.filter(p => p.market_status === "OPEN");
  const closedPositions = positions.filter(p => p.market_status !== "OPEN");

  return (
    <div>
      <LmsrStats positions={positions} />

      {openPositions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Posiciones abiertas</h2>
          <div className="space-y-4">
            {openPositions.map(p => (
              <LmsrPositionCard
                key={`${p.market_id}-${p.side}`}
                position={p}
                token={token!}
                onSold={handleSold}
              />
            ))}
          </div>
        </div>
      )}

      {closedPositions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Posiciones cerradas</h2>
          <div className="space-y-4">
            {closedPositions.map(p => (
              <LmsrPositionCard
                key={`${p.market_id}-${p.side}`}
                position={p}
                token={token!}
                onSold={handleSold}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { isConnected } = useAccount();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mi Portfolio</h1>
        <p className="text-muted">Tus posiciones activas, PnL en tiempo real y opciones de venta.</p>
      </div>

      <LmsrPortfolioSection />

      {isConnected && (
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted text-center">
            Posiciones on-chain (legacy) —{" "}
            <Link href="/portfolio/onchain" className="text-accent-light underline">
              ver portfolio on-chain →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
