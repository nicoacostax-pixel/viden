"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetMyMarkets, type UserMarket } from "@/lib/custodialApi";

function StatusBadge({ status }: { status: UserMarket["status_review"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
        🟡 En revisión
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
        ✅ Aprobado
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger border border-danger/20">
        ❌ Rechazado
      </span>
    );
  }
  return null;
}

function MarketRow({ market }: { market: UserMarket }) {
  const closeDate = new Date(market.close_time * 1000).toLocaleDateString("es", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {market.emoji} {market.question}
          </p>
          {market.public_id && (
            <p className="text-[11px] text-muted font-mono mt-0.5">{market.public_id}</p>
          )}
        </div>
        <StatusBadge status={market.status_review} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-background border border-border">
          <p className="text-muted mb-0.5">Pool total</p>
          <p className="font-semibold text-foreground">
            {market.total_pool_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
          </p>
        </div>
        <div className="p-2 rounded-lg bg-background border border-border">
          <p className="text-muted mb-0.5">Fee ganado</p>
          <p className="font-semibold text-accent-light">
            {market.creator_fee_earned.toLocaleString("es", { maximumFractionDigits: 2 })} VDN
          </p>
        </div>
        <div className="p-2 rounded-lg bg-background border border-border">
          <p className="text-muted mb-0.5">Cierre</p>
          <p className="font-semibold text-foreground">{closeDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {market.status_review === "approved" && (
          <Link
            href={`/market/${market.market_id}`}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors"
          >
            Ver mercado →
          </Link>
        )}
        {market.status_review === "pending" && (
          <p className="text-xs text-muted">El mercado aparecerá públicamente una vez aprobado.</p>
        )}
        {market.status_review === "rejected" && (
          <p className="text-xs text-muted">
            Se reembolsaron {market.creation_cost_vdn} VDN a tu cuenta.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MisMercados() {
  const router = useRouter();
  const { isLoggedIn, isLoading, token } = useAuth();
  const [markets, setMarkets] = useState<UserMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login");
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!token) return;
    apiGetMyMarkets(token)
      .then(({ markets }) => setMarkets(markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (isLoading || (!isLoggedIn && isLoading)) return <div className="text-center py-20 text-muted">Cargando…</div>;
  if (!isLoggedIn) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis mercados</h1>
          <p className="text-sm text-muted mt-0.5">Mercados que has creado</p>
        </div>
        <Link
          href="/crear-mercado"
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
        >
          + Crear nuevo
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-4xl">🏗️</p>
          <p className="text-lg font-semibold text-foreground">Aún no creaste ningún mercado</p>
          <p className="text-sm text-muted">Crea tu primer mercado de predicción y gana 2% del pool.</p>
          <Link
            href="/crear-mercado"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
          >
            Crear mi primer mercado
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map(m => <MarketRow key={m.market_id} market={m} />)}
        </div>
      )}
    </div>
  );
}
