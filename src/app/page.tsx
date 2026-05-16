"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  ResponsiveContainer, ReferenceDot,
} from "recharts";
import { MarketCard, getCategoryEmoji } from "@/components/MarketCard";
import { getMarkets, toMarketData, searchMarketByPublicId, type ApiMarket } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",             label: "Tendencia" },
  { id: "deportes",        label: "Deportes" },
  { id: "cripto",          label: "Cripto" },
  { id: "politica",        label: "Política" },
  { id: "cultura",         label: "Cultura" },
  { id: "entretenimiento", label: "Entretenimiento" },
  { id: "esports",         label: "Esports" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchCategory(m: ApiMarket): CategoryId {
  if (m.category) {
    const c = m.category.toLowerCase();
    if (c === "deportes") return "deportes";
    if (c === "cripto") return "cripto";
    if (c === "política" || c === "politica") return "politica";
    if (c === "cultura") return "cultura";
    if (c === "entretenimiento") return "entretenimiento";
    if (c === "esports") return "esports";
  }
  const q = m.question.toLowerCase();
  if (/fútbol|futbol|liga|copa|champions|mundial|gol|basket|nba|tenis|f1|fórmula|béisbol|boxeo|deporte/.test(q)) return "deportes";
  if (/bitcoin|btc|ethereum|eth|cripto|crypto|blockchain|web3|defi|nft|token|altcoin|solana/.test(q)) return "cripto";
  if (/elección|elecciones|presidente|gobierno|partido|congreso|voto|votación|política|senado/.test(q)) return "politica";
  if (/oscar|película|serie|netflix|grammy|bienal|arte/.test(q)) return "cultura";
  if (/música|celebrity|cantante|actor|actriz/.test(q)) return "entretenimiento";
  if (/gaming|esport|league|valorant|cs:|dota|torneo|game|videojuego|twitch/.test(q)) return "esports";
  return "all";
}

function custProb(m: ApiMarket) {
  const y = m.custodialPoolYes ?? 0;
  const n = m.custodialPoolNo ?? 0;
  const total = y + n;
  if (total === 0) return { yes: 50, no: 50, total: 0 };
  return { yes: Math.round((y / total) * 100), no: Math.round((n / total) * 100), total };
}

function custMult(m: ApiMarket) {
  const y = m.custodialPoolYes ?? 0;
  const n = m.custodialPoolNo ?? 0;
  const total = y + n;
  if (total === 0 || y === 0 || n === 0) return { si: "2.00", no: "2.00" };
  return { si: (total / y).toFixed(2), no: (total / n).toFixed(2) };
}

function seedRng(seed: number) {
  let s = seed * 31337;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function makeChartData(marketId: number, probYes: number, closeTime: number) {
  const rand = seedRng(marketId);
  const now   = Math.floor(Date.now() / 1000);
  const start = Math.min(closeTime - 30 * 86_400, now - 7 * 86_400);
  const N     = 24;
  const pts: { ts: number; v: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t     = i / N;
    const ts    = Math.round(start + t * (now - start));
    const trend = 50 + (probYes - 50) * Math.pow(t, 0.8);
    const noise = (rand() - 0.5) * 16 * (1 - t * 0.6);
    pts.push({ ts, v: Math.min(99, Math.max(1, Math.round(trend + noise))) });
  }
  pts[pts.length - 1].v = probYes;
  return pts;
}

function fmtTs(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("es", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// ── CarouselCard ──────────────────────────────────────────────────────────────

function CarouselCard({ market, fading }: { market: ApiMarket; fading: boolean }) {
  const prob      = custProb(market);
  const mult      = custMult(market);
  const chartData = useMemo(
    () => makeChartData(market.marketId, prob.yes, market.closeTime),
    [market.marketId, prob.yes, market.closeTime],
  );
  const emoji   = market.emoji || getCategoryEmoji(market.question);
  const lastPt  = chartData[chartData.length - 1];

  return (
    <Link href={`/market/${market.marketId}`} className="block cursor-pointer">
      <div
        className="rounded-2xl bg-surface border border-border overflow-hidden hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
        style={{
          transition: "opacity 180ms ease, transform 180ms ease, border-color 200ms, box-shadow 200ms",
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(4px)" : "translateY(0)",
        }}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-3xl leading-none">{emoji}</span>
            {market.category && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent-light border border-accent/20 uppercase tracking-wider">
                {market.category}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
            {market.question}
          </h2>
        </div>

        {/* Line chart — Kalshi style */}
        <div className="px-3 mt-1">
          {/* Live label */}
          <div className="flex items-center gap-1.5 px-3 mb-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="text-xs text-success font-semibold">{prob.yes}% SÍ</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 6, right: 44, bottom: 4, left: 0 }}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtTs}
                tick={{ fill: "#6B7280", fontSize: 9 }}
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
                tick={{ fill: "#6B7280", fontSize: 9 }}
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
              {/* Dot at current value */}
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

        {/* Odds + volume */}
        <div className="px-4 sm:px-6 pt-3 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3">
              <p className="text-[10px] text-muted mb-1 uppercase tracking-wider font-medium">Paga SÍ</p>
              <p className="text-2xl font-extrabold text-success leading-none">{mult.si}x</p>
              <p className="text-xs text-muted mt-1">{prob.yes}% prob.</p>
            </div>
            <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
              <p className="text-[10px] text-muted mb-1 uppercase tracking-wider font-medium">Paga NO</p>
              <p className="text-2xl font-extrabold text-danger leading-none">{mult.no}x</p>
              <p className="text-xs text-muted mt-1">{prob.no}% prob.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              Volumen:{" "}
              <span className="text-foreground font-semibold">
                {prob.total.toLocaleString("es")} VDN
              </span>
            </span>
            <span className="text-xs font-semibold text-accent-light">Ver mercado →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── TrendingSidebar ───────────────────────────────────────────────────────────

function TrendingSidebar({
  featured,
  activeIdx,
  onSelect,
}: {
  featured: ApiMarket[];
  activeIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden flex flex-col">
      <div className="px-4 py-3.5 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Trending ›</h2>
      </div>
      <div className="flex-1 divide-y divide-border/40 overflow-y-auto">
        {featured.map((m, i) => {
          const { yes } = custProb(m);
          const emoji   = m.emoji || getCategoryEmoji(m.question);
          const active  = i === activeIdx;
          return (
            <button
              key={m.marketId}
              onClick={() => onSelect(i)}
              className={[
                "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
                active ? "bg-accent/10" : "hover:bg-surface-alt",
              ].join(" ")}
            >
              <span className="text-base leading-none shrink-0 mt-0.5">{emoji}</span>
              <p className={[
                "flex-1 text-xs leading-snug line-clamp-2 min-w-0",
                active ? "text-accent-light font-medium" : "text-foreground",
              ].join(" ")}>
                {m.question}
              </p>
              <span className={[
                "text-xs font-bold shrink-0 tabular-nums",
                yes >= 50 ? "text-success" : "text-danger",
              ].join(" ")}>
                {yes}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────

function HeroSection({ markets }: { markets: ApiMarket[] }) {
  const featured = useMemo(() => markets.slice(0, 11), [markets]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading]       = useState(false);
  const [paused, setPaused]       = useState(false);
  const activeIdxRef     = useRef(0);
  const transitioningRef = useRef(false);
  const nextCbRef        = useRef<() => void>(() => {});
  const swipeTouchRef    = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // reset to first when category changes (featured list changes)
  useEffect(() => {
    transitioningRef.current = false;
    setFading(false);
    setActiveIdx(0);
  }, [featured]);

  const goTo = useCallback((idx: number) => {
    if (transitioningRef.current || featured.length === 0) return;
    const nextIdx = (idx + featured.length) % featured.length;
    transitioningRef.current = true;
    setFading(true);
    setTimeout(() => {
      setActiveIdx(nextIdx);
      setFading(false);
      transitioningRef.current = false;
    }, 180);
  }, [featured.length]);

  const prev = useCallback(() => {
    goTo((activeIdxRef.current - 1 + featured.length) % featured.length);
  }, [featured.length, goTo]);

  const next = useCallback(() => {
    goTo((activeIdxRef.current + 1) % featured.length);
  }, [featured.length, goTo]);

  useEffect(() => { nextCbRef.current = next; }, [next]);

  useEffect(() => {
    if (paused || featured.length === 0) return;
    const id = setInterval(() => nextCbRef.current(), 8000);
    return () => clearInterval(id);
  }, [paused, featured.length]);

  if (featured.length === 0) return null;

  return (
    <div className="flex gap-5 mb-10 items-start">
      {/* Carousel — 70% */}
      <div
        className="flex-1 min-w-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={e => { swipeTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={e => {
          if (!swipeTouchRef.current) return;
          const dx = e.changedTouches[0].clientX - swipeTouchRef.current.x;
          const dy = e.changedTouches[0].clientY - swipeTouchRef.current.y;
          swipeTouchRef.current = null;
          if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 30) return;
          if (dx > 0) prev(); else next();
        }}
      >
        <div className="relative" style={{ isolation: "isolate" }}>
          <CarouselCard market={featured[activeIdx]} fading={fading} />

          {featured.length > 1 && (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-border bg-surface/95 px-1.5 py-1 shadow-lg shadow-black/5 backdrop-blur">
              <button
                type="button"
                onClick={prev}
                className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xl sm:text-lg leading-none text-muted transition-colors hover:bg-surface-alt hover:text-foreground"
                aria-label="Mercado anterior"
              >
                ‹
              </button>
              <span className="min-w-[40px] text-center text-xs font-semibold tabular-nums text-muted">
                {activeIdx + 1}/{featured.length}
              </span>
              <button
                type="button"
                onClick={next}
                className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xl sm:text-lg leading-none text-muted transition-colors hover:bg-surface-alt hover:text-foreground"
                aria-label="Mercado siguiente"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Nav row */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-1.5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={[
                  "rounded-full transition-all duration-300",
                  i === activeIdx
                    ? "w-5 h-1.5 bg-accent"
                    : "w-1.5 h-1.5 bg-border hover:bg-muted",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Trending sidebar — 30%, hidden on small screens */}
      <div className="hidden lg:flex w-64 shrink-0">
        <TrendingSidebar featured={featured} activeIdx={activeIdx} onSelect={goTo} />
      </div>
    </div>
  );
}

// ── Existing small components ─────────────────────────────────────────────────

function LiveBadge({ refreshing }: { refreshing: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full bg-success ${refreshing ? "opacity-30" : "animate-pulse"}`} />
      <span className="text-xs text-muted">En vivo</span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SidebarMarketItem({ market }: { market: ApiMarket }) {
  const { yes }  = custProb(market);
  const emoji    = market.emoji || getCategoryEmoji(market.question);
  const short    = market.question.length > 60
    ? market.question.slice(0, 60) + "…"
    : market.question;

  return (
    <Link href={`/market/${market.marketId}`} className="cursor-pointer">
      <div className="flex items-start gap-2.5 py-2.5 px-3 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer group">
        <span className="text-lg leading-none shrink-0 mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground leading-snug group-hover:text-accent-light transition-colors line-clamp-2">
            {short}
          </p>
        </div>
        <span className={`text-xs font-bold shrink-0 tabular-nums ${yes >= 50 ? "text-success" : "text-danger"}`}>
          {yes}%
        </span>
      </div>
    </Link>
  );
}

function Sidebar({ markets }: { markets: ApiMarket[] }) {
  const now = Math.floor(Date.now() / 1000);

  const popular = useMemo(() =>
    [...markets]
      .sort((a, b) =>
        ((b.custodialPoolYes ?? 0) + (b.custodialPoolNo ?? 0)) -
        ((a.custodialPoolYes ?? 0) + (a.custodialPoolNo ?? 0))
      )
      .slice(0, 3),
    [markets]
  );

  const closingSoon = useMemo(() =>
    markets
      .filter(m => m.status === "OPEN" && m.closeTime > now && m.closeTime < now + 86_400)
      .sort((a, b) => a.closeTime - b.closeTime)
      .slice(0, 3),
    [markets, now]
  );

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">🔥 Mercados populares</h2>
        </div>
        <div className="divide-y divide-border/50">
          {popular.length === 0
            ? <p className="text-xs text-muted px-4 py-3">Sin datos</p>
            : popular.map(m => <SidebarMarketItem key={m.marketId} market={m} />)
          }
        </div>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">⏰ Cierran pronto</h2>
        </div>
        <div className="divide-y divide-border/50">
          {closingSoon.length === 0
            ? <p className="text-xs text-muted px-4 py-3">Ninguno en las próximas 24h</p>
            : closingSoon.map(m => <SidebarMarketItem key={m.marketId} market={m} />)
          }
        </div>
      </div>

      <Link href="/admin">
        <div className="rounded-xl bg-accent/10 border border-accent/30 px-4 py-3 text-center hover:bg-accent/20 transition-colors cursor-pointer">
          <p className="text-xs text-accent-light font-medium">+ Crear nuevo mercado</p>
        </div>
      </Link>
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [rawMarkets, setRawMarkets]         = useState<ApiMarket[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastUpdated, setLastUpdated]       = useState("");
  const [error, setError]                   = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [search, setSearch]                 = useState("");

  const load = useCallback(async (initial = false) => {
    if (initial) setIsLoading(true);
    else setRefreshing(true);
    try {
      const data = await getMarkets();
      setRawMarkets(data.markets);
      setLastUpdated(new Date().toLocaleTimeString("es"));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Redirect when user pastes a VDN-XXXXX public ID into the search box
  useEffect(() => {
    const trimmed = search.trim().toUpperCase();
    if (!/^VDN-[A-Z2-9]{5}$/.test(trimmed)) return;
    searchMarketByPublicId(trimmed)
      .then(data => { if (data) router.push(`/market/${data.market.marketId}`); })
      .catch(() => {});
  }, [search, router]);

  const stats = useMemo(() => {
    const active   = rawMarkets.filter(m => m.status === "OPEN").length;
    const totalVdn = rawMarkets.reduce(
      (acc, m) => acc + (m.custodialPoolYes ?? 0) + (m.custodialPoolNo ?? 0),
      0
    );
    return { active, vol: totalVdn.toLocaleString("es") };
  }, [rawMarkets]);

  const filteredByCategory = useMemo(() => {
    if (activeCategory === "all") return rawMarkets;
    return rawMarkets.filter(m => matchCategory(m) === activeCategory);
  }, [rawMarkets, activeCategory]);

  const displayedMarkets = useMemo(() => {
    let list = filteredByCategory;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.question.toLowerCase().includes(q));
    }
    return list;
  }, [filteredByCategory, search]);

  return (
    <div className="flex flex-col gap-0">

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-3 border-b border-border/50 mb-6">
        <StatPill label="Mercados activos" value={String(stats.active)} />
        <div className="w-px h-3 bg-border hidden sm:block" />
        <StatPill label="Vol total" value={`${stats.vol} VDN`} />
        <div className="w-px h-3 bg-border hidden sm:block" />
        <StatPill label="Apostadores" value="—" />
        <div className="w-px h-3 bg-border hidden sm:block" />
        <StatPill label="VDN quemados" value="0" />
        <div className="ml-auto flex items-center gap-2">
          <LiveBadge refreshing={refreshing} />
          {lastUpdated && (
            <span className="text-[11px] text-muted hidden sm:inline">· {lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Search + title */}
      <div className="flex items-center gap-3 py-4">
        <h1 className="text-xl font-bold text-foreground shrink-0 hidden sm:block">Mercados</h1>
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mercados o pegar ID (VDN-XXXXX)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none border-b border-border">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              "shrink-0 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              "border-b-2 -mb-px",
              activeCategory === cat.id
                ? "border-accent text-accent-light"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Hero carousel */}
      {!isLoading && !error && filteredByCategory.length > 0 && (
        <HeroSection markets={filteredByCategory} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center text-muted py-20">Cargando mercados…</div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-20 space-y-3">
          <p className="text-danger">No se pudo conectar con la API.</p>
          <button onClick={() => load(true)} className="text-sm text-accent-light underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Two-column grid + sidebar */}
      {!isLoading && !error && (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            {displayedMarkets.length === 0 ? (
              <div className="text-center py-20">
                {search || activeCategory !== "all" ? (
                  <p className="text-muted">Sin resultados para tu búsqueda.</p>
                ) : (
                  <>
                    <p className="text-muted text-lg mb-2">No hay mercados aún.</p>
                    <Link href="/admin" className="text-accent-light underline text-sm">Crear el primero →</Link>
                  </>
                )}
              </div>
            ) : (
              <div className={`grid gap-3 sm:grid-cols-2 transition-opacity duration-300 ${refreshing ? "opacity-60" : ""}`}>
                {displayedMarkets.map(m => (
                  <MarketCard key={String(m.marketId)} market={toMarketData(m)} publicId={m.publicId} />
                ))}
              </div>
            )}
          </div>
          <div className="hidden lg:block w-72 shrink-0">
            <Sidebar markets={rawMarkets} />
          </div>
        </div>
      )}
    </div>
  );
}
