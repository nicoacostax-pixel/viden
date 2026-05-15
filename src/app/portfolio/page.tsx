"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  useClaimReward,
  formatVDN,
  type MarketData,
  type PositionData,
} from "@/hooks/usePredictionMarket";
import { getPortfolio, toMarketDataFromPosition, toPositionData } from "@/lib/api";
import { TxLink } from "@/components/TxLink";
import { Outcome } from "@/config/contracts";

type PositionEntry = {
  market: MarketData;
  position: PositionData;
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({
  totalBet,
  totalClaimed,
  pnl,
}: {
  totalBet: bigint;
  totalClaimed: bigint;
  pnl: bigint;
}) {
  const pnlColor =
    pnl > 0n ? "text-success" : pnl < 0n ? "text-danger" : "text-muted";
  const pnlSign = pnl > 0n ? "+" : "";

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: "Total apostado", value: formatVDN(totalBet), color: "text-foreground" },
        { label: "Total cobrado",  value: formatVDN(totalClaimed), color: "text-success" },
        { label: "PnL neto",       value: `${pnlSign}${formatVDN(pnl)}`, color: pnlColor },
      ].map(({ label, value, color }) => (
        <div key={label} className="p-3 rounded-xl bg-surface border border-border text-center">
          <div className="text-xs text-muted mb-1">{label}</div>
          <div className={`text-sm font-semibold ${color}`}>{value} VDN</div>
        </div>
      ))}
    </div>
  );
}

// ── Position row ──────────────────────────────────────────────────────────────

function PositionRow({
  entry,
  onClaim,
}: {
  entry: PositionEntry;
  onClaim: () => void;
}) {
  const { market, position } = entry;
  const claim = useClaimReward();

  const isOpen      = market.outcome === Outcome.OPEN;
  const isCancelled = market.outcome === Outcome.CANCELLED;
  const canClaim    = !position.claimed && !isOpen && (isCancelled || market.resolved);
  const userWon     =
    !isOpen &&
    market.resolved &&
    ((market.outcome === Outcome.YES && position.isYes) ||
      (market.outcome === Outcome.NO && !position.isYes));

  useEffect(() => {
    if (claim.isSuccess) onClaim();
  }, [claim.isSuccess, onClaim]);

  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          href={`/market/${market.marketId}`}
          className="font-medium text-foreground hover:text-accent-light transition-colors leading-snug"
        >
          #{String(market.marketId)} {market.question}
        </Link>
        <span
          className={`shrink-0 text-xs px-2 py-1 rounded-full ${
            isOpen
              ? "bg-success/10 text-success"
              : isCancelled
              ? "bg-muted/20 text-muted"
              : userWon
              ? "bg-accent/10 text-accent-light"
              : "bg-danger/10 text-danger"
          }`}
        >
          {isOpen ? "Abierto" : isCancelled ? "Cancelado" : userWon ? "Ganaste" : "Perdiste"}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm mb-3">
        <span className={`font-medium ${position.isYes ? "text-success" : "text-danger"}`}>
          {position.isYes ? "SÍ" : "NO"}
        </span>
        <span className="text-muted">{formatVDN(position.netAmount)} VDN netos</span>
      </div>

      {position.claimed && (
        <span className="text-xs text-muted">Recompensa ya cobrada</span>
      )}

      {canClaim && (
        <div>
          <button
            onClick={() => claim.claim(market.marketId)}
            disabled={claim.isPending || claim.isConfirming}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {claim.isPending || claim.isConfirming
              ? "Procesando…"
              : isCancelled
              ? "Reembolso"
              : "Cobrar"}
          </button>
          {claim.hash && (
            <div className="mt-2">
              <TxLink hash={claim.hash} />
            </div>
          )}
          {claim.isSuccess && (
            <p className="text-xs text-success mt-1">¡Cobrado!</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { address, isConnected } = useAccount();

  const [entries, setEntries]   = useState<PositionEntry[]>([]);
  const [stats, setStats]       = useState<{
    totalBet: bigint;
    totalClaimed: bigint;
    pnl: bigint;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(false);
    try {
      const data = await getPortfolio(address.toLowerCase());
      setStats({
        totalBet:     BigInt(data.totalBet),
        totalClaimed: BigInt(data.totalClaimed),
        pnl:          BigInt(data.pnl),
      });
      setEntries(
        data.positions.map((p) => ({
          market:   toMarketDataFromPosition(p),
          position: toPositionData(p),
        }))
      );
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) load();
  }, [isConnected, address, load]);

  // After a successful claim, give the indexer 5s then refetch
  const handleClaim = useCallback(() => {
    setTimeout(load, 5000);
  }, [load]);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted">Conecta tu wallet para ver tu portfolio.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mi Portfolio</h1>
        <p className="text-muted">Todas tus posiciones activas y pasadas.</p>
      </div>

      {isLoading && (
        <div className="text-center text-muted py-20">Cargando posiciones…</div>
      )}

      {!isLoading && error && (
        <div className="text-center py-20 space-y-3">
          <p className="text-danger">No se pudo conectar con la API en localhost:3001.</p>
          <button
            onClick={load}
            className="text-sm text-accent-light underline hover:text-accent"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {stats && (
            <StatsBar
              totalBet={stats.totalBet}
              totalClaimed={stats.totalClaimed}
              pnl={stats.pnl}
            />
          )}

          {entries.length === 0 ? (
            <div className="text-center text-muted py-20">
              No tienes posiciones aún.{" "}
              <Link href="/" className="text-accent-light underline">
                Ver mercados →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((e) => (
                <PositionRow
                  key={String(e.market.marketId)}
                  entry={e}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
