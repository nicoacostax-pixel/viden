"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useCreateMarket, useResolveMarket, useMarketCount } from "@/hooks/usePredictionMarket";
import { useWrongNetwork } from "@/hooks/useWrongNetwork";
import { useAuth } from "@/context/AuthContext";
import { TxLink } from "@/components/TxLink";
import { PREDICTION_MARKET_ABI, PREDICTION_MARKET_ADDRESS } from "@/config/contracts";
import {
  apiGetPendingMarkets, apiApproveMarket, apiRejectMarket,
  apiGetMarketsToResolve, apiGetAllOpenMarkets, apiAdminResolveMarket,
  apiGetAdminUsers, apiDeleteMarket, apiGetAllMarkets,
  type PendingMarket, type MarketToResolve, type AdminUser, type AdminMarket,
} from "@/lib/custodialApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MARKET_CREATOR_ROLE =
  "0xd3065a24ad9e7725d223007135762d2902038999e3e5829146654498a58d9795" as const;

function dateToTimestamp(value: string): bigint {
  return BigInt(Math.floor(new Date(value).getTime() / 1000));
}
function toDatetimeLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function addSeconds(base: string | null, seconds: number): string {
  const from = base ? new Date(base) : new Date();
  return toDatetimeLocal(new Date(from.getTime() + seconds * 1000));
}
function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

const CLOSE_PRESETS   = [{ label: "+1h", s: 3_600 }, { label: "+1 día", s: 86_400 }, { label: "+7 días", s: 604_800 }, { label: "+30 días", s: 2_592_000 }];
const RESOLVE_OFFSETS = [{ label: "+1h", s: 3_600 }, { label: "+2h", s: 7_200 }, { label: "+6h", s: 21_600 }, { label: "+1 día", s: 86_400 }];

// ── Tab nav ───────────────────────────────────────────────────────────────────

type TabId = "revisar" | "resolver" | "mercados" | "usuarios" | "crear" | "onchain" | "torneos";

function TabNav({ active, onChange, badges }: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges: Partial<Record<TabId, number>>;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "revisar",  label: "Por revisar" },
    { id: "resolver", label: "Por resolver" },
    { id: "mercados", label: "Mercados" },
    { id: "usuarios", label: "Usuarios" },
    { id: "crear",    label: "Crear" },
    { id: "torneos",  label: "Torneos" },
    { id: "onchain",  label: "On-chain" },
  ];
  return (
    <div className="flex overflow-x-auto border-b border-border -mx-1 px-1 scrollbar-none">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={[
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px shrink-0",
            active === t.id ? "border-accent text-accent-light" : "border-transparent text-muted hover:text-foreground",
          ].join(" ")}
        >
          {t.label}
          {badges[t.id] ? (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              t.id === "revisar" ? "bg-warning/20 text-warning" : "bg-accent/20 text-accent-light"
            }`}>
              {badges[t.id]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ── Por revisar (pending approval) ────────────────────────────────────────────

function PorRevisarTab({ token }: { token: string }) {
  const [markets, setMarkets]           = useState<PendingMarket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [rejectId, setRejectId]         = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [working, setWorking]           = useState<number | null>(null);

  const load = useCallback(() => {
    apiGetPendingMarkets(token)
      .then(({ markets }) => setMarkets(markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: number) {
    setWorking(id);
    try { await apiApproveMarket(token, id); setMarkets(p => p.filter(m => m.market_id !== id)); }
    catch { /* silent */ } finally { setWorking(null); }
  }

  async function reject(id: number) {
    setWorking(id);
    try {
      await apiRejectMarket(token, id, rejectReason || undefined);
      setMarkets(p => p.filter(m => m.market_id !== id));
      setRejectId(null); setRejectReason("");
    } catch { /* silent */ } finally { setWorking(null); }
  }

  if (loading) return <div className="text-center py-8 text-muted text-sm">Cargando…</div>;

  if (markets.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-3xl">✅</p>
      <p className="text-sm text-muted">Sin mercados pendientes de revisión</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {markets.map(m => (
        <div key={m.market_id} className="p-4 rounded-xl bg-background border border-border space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{m.emoji ?? "🔮"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">{m.question}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <span className="text-xs text-muted">@{m.creator_username ?? "—"}</span>
                {m.category && <span className="text-xs text-accent-light">{m.category}</span>}
                <span className="text-xs text-muted">Cierra {new Date(m.close_time * 1000).toLocaleDateString("es")}</span>
              </div>
            </div>
            {m.public_id && <span className="text-[10px] text-muted font-mono shrink-0">{m.public_id}</span>}
          </div>

          {m.resolution_criteria && (
            <div className="p-3 rounded-lg bg-surface-alt border border-border">
              <p className="text-[11px] text-muted font-semibold uppercase tracking-wider mb-1">Criterio de resolución</p>
              <p className="text-xs text-foreground leading-relaxed">{m.resolution_criteria}</p>
            </div>
          )}

          {rejectId === m.market_id ? (
            <div className="space-y-2">
              <input
                type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Razón del rechazo (opcional)"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-danger transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={() => reject(m.market_id)} disabled={working === m.market_id}
                  className="flex-1 py-2 rounded-lg bg-danger hover:bg-red-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                  {working === m.market_id ? "Rechazando…" : "Confirmar rechazo"}
                </button>
                <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                  className="px-4 py-2 rounded-lg bg-surface-alt border border-border text-xs font-medium hover:border-accent transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => approve(m.market_id)} disabled={working === m.market_id}
                className="flex-1 py-2 rounded-lg bg-success hover:bg-green-500 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                {working === m.market_id ? "Aprobando…" : "✅ Aprobar"}
              </button>
              <button onClick={() => setRejectId(m.market_id)} disabled={working === m.market_id}
                className="flex-1 py-2 rounded-lg border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger text-xs font-semibold transition-colors disabled:opacity-50">
                ❌ Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Por resolver ──────────────────────────────────────────────────────────────

function MarketResolveCard({
  m,
  token,
  early = false,
  onDone,
}: {
  m: MarketToResolve;
  token: string;
  early?: boolean;
  onDone: (id: number) => void;
}) {
  const [result, setResult]       = useState<"yes" | "no" | "cancelled" | "">("");
  const [working, setWorking]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const now     = Math.floor(Date.now() / 1000);
  const total   = m.pool_yes + m.pool_no;
  const yesP    = total > 0 ? Math.round((m.pool_yes / total) * 100) : 50;
  const noP     = 100 - yesP;
  const overdue = now - m.close_time;
  const isOpen  = m.close_time > now;

  async function resolve() {
    if (!result) return;
    setWorking(true); setError("");
    try {
      await apiAdminResolveMarket(token, m.market_id, result);
      setDone(true);
      onDone(m.market_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al resolver");
    } finally { setWorking(false); }
  }

  async function deleteMarket() {
    setDeleting(true); setError("");
    try {
      await apiDeleteMarket(token, m.market_id);
      setDone(true);
      onDone(m.market_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
      setConfirmDel(false);
    } finally { setDeleting(false); }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-success/5 border border-success/20 text-success text-sm font-semibold">
        ✅ Resuelto como <strong>{result === "yes" ? "SÍ" : result === "no" ? "NO" : "Cancelado"}</strong>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border space-y-3 bg-background ${early ? "border-yellow-500/30" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{m.emoji ?? "🔮"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{m.question}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {m.is_user_created
              ? <span className="text-xs text-accent-light">@{m.creator_username}</span>
              : <span className="text-xs text-muted">admin</span>}
            {isOpen ? (
              <span className="text-xs text-yellow-400 font-medium">
                Cierra en {overdue < 0 && Math.abs(overdue) < 3600
                  ? `${Math.floor(Math.abs(overdue)/60)}m`
                  : `${new Date(m.close_time * 1000).toLocaleDateString("es")}`}
              </span>
            ) : (
              <span className="text-xs text-danger font-medium">
                Cerró hace {overdue < 3600 ? `${Math.floor(overdue/60)}m` : overdue < 86400 ? `${Math.floor(overdue/3600)}h` : `${Math.floor(overdue/86400)}d`}
              </span>
            )}
          </div>
        </div>
        {m.public_id && <span className="text-[10px] text-muted font-mono shrink-0">{m.public_id}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
          <p className="text-success font-bold text-base">{yesP}%</p>
          <p className="text-muted">SÍ · {m.pool_yes.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</p>
        </div>
        <div className="p-2 rounded-lg bg-danger/10 border border-danger/20 text-center">
          <p className="text-danger font-bold text-base">{noP}%</p>
          <p className="text-muted">NO · {m.pool_no.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</p>
        </div>
      </div>

      {m.resolution_criteria && (
        <div className="p-2 rounded-lg bg-surface-alt border border-border">
          <p className="text-[11px] text-muted font-semibold uppercase tracking-wider mb-0.5">Criterio</p>
          <p className="text-xs text-foreground leading-relaxed line-clamp-3">{m.resolution_criteria}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(["yes", "no", "cancelled"] as const).map(r => (
          <button key={r} onClick={() => setResult(r)}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              result === r
                ? r === "yes" ? "bg-success text-white" : r === "no" ? "bg-danger text-white" : "bg-muted/40 text-foreground"
                : r === "yes" ? "bg-success/10 text-success border border-success/30"
                : r === "no" ? "bg-danger/10 text-danger border border-danger/30"
                : "bg-surface-alt text-muted border border-border"
            }`}>
            {r === "yes" ? "✅ SÍ ganó" : r === "no" ? "❌ NO ganó" : "↩ Cancelar"}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button onClick={resolve} disabled={!result || working}
        className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40">
        {working ? "Resolviendo…" : early ? "⚡ Resolver anticipadamente" : "Confirmar resolución"}
      </button>

      {!confirmDel ? (
        <button onClick={() => setConfirmDel(true)}
          className="w-full py-2 rounded-lg border border-danger/30 text-danger text-xs font-medium hover:bg-danger/5 transition-colors">
          🗑 Eliminar mercado
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={deleteMarket} disabled={deleting}
            className="flex-1 py-2 rounded-lg bg-danger text-white text-xs font-semibold transition-colors disabled:opacity-50">
            {deleting ? "Eliminando…" : "Confirmar eliminación"}
          </button>
          <button onClick={() => setConfirmDel(false)}
            className="px-4 py-2 rounded-lg bg-surface-alt border border-border text-xs font-medium hover:border-accent transition-colors">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function PorResolverTab({ token }: { token: string }) {
  const [allOpen, setAllOpen]         = useState<MarketToResolve[]>([]);
  const [loading, setLoading]         = useState(true);
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set());
  const [search, setSearch]           = useState("");

  const load = useCallback(() => {
    apiGetMarketsToResolve(token)
      .then(({ markets }) => setAllOpen(markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const now = Math.floor(Date.now() / 1000);
  const q = search.trim().toLowerCase();

  const pending = allOpen
    .filter(m => !resolvedIds.has(m.market_id) && (!q || m.question.toLowerCase().includes(q)))
    .sort((a, b) => {
      // Overdue first (close_time already past), then by close_time asc
      const aOver = a.close_time <= now ? 0 : 1;
      const bOver = b.close_time <= now ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return a.close_time - b.close_time;
    });

  const overdueCount = allOpen.filter(m => !resolvedIds.has(m.market_id) && m.close_time <= now).length;

  if (loading) return <div className="text-center py-8 text-muted text-sm">Cargando…</div>;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar mercado…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {pending.length === 0 && overdueCount === 0 && allOpen.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-3xl">🏁</p>
          <p className="text-sm text-muted">{q ? "Sin resultados" : "Sin mercados pendientes de resolución"}</p>
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted">Sin resultados para "{search}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(m => (
            <MarketResolveCard
              key={m.market_id}
              m={m}
              token={token}
              early={m.close_time > now}
              onDone={id => setResolvedIds(p => new Set(p).add(id))}
            />
          ))}
        </div>
      )}

      {/* Resolve by ID – emergency fallback */}
      <ResolveByIdCard token={token} />
    </div>
  );
}

function ResolveByIdCard({ token }: { token: string }) {
  const [open, setOpen]       = useState(false);
  const [marketId, setMarketId] = useState("");
  const [result, setResult]   = useState<"yes" | "no" | "cancelled" | "">("");
  const [working, setWorking] = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  async function resolve() {
    if (!marketId || !result) return;
    setWorking(true); setMsg(null);
    try {
      await apiAdminResolveMarket(token, Number(marketId), result);
      setMsg({ ok: true, text: `Mercado #${marketId} resuelto como ${result === "yes" ? "SÍ" : result === "no" ? "NO" : "Cancelado"}` });
      setMarketId(""); setResult("");
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error al resolver" });
    } finally { setWorking(false); }
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <span>🔧 Resolver por ID (emergencia)</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-background">
          <p className="text-xs text-muted">Resuelve cualquier mercado directamente si no aparece en la lista.</p>
          <input
            type="number" min="1" value={marketId} onChange={e => setMarketId(e.target.value)}
            placeholder="ID del mercado (ej. 1049)"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <div className="grid grid-cols-3 gap-2">
            {(["yes", "no", "cancelled"] as const).map(r => (
              <button key={r} onClick={() => setResult(r)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  result === r
                    ? r === "yes" ? "bg-success text-white" : r === "no" ? "bg-danger text-white" : "bg-muted/40 text-foreground"
                    : r === "yes" ? "bg-success/10 text-success border border-success/30"
                    : r === "no" ? "bg-danger/10 text-danger border border-danger/30"
                    : "bg-surface-alt text-muted border border-border"
                }`}>
                {r === "yes" ? "✅ SÍ" : r === "no" ? "❌ NO" : "↩ Cancelar"}
              </button>
            ))}
          </div>
          {msg && <p className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
          <button onClick={resolve} disabled={!marketId || !result || working}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40">
            {working ? "Resolviendo…" : "Confirmar resolución"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Mercados (gestión completa) ───────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  OPEN:      "bg-success/15 text-success",
  YES:       "bg-blue-500/15 text-blue-400",
  NO:        "bg-blue-500/15 text-blue-400",
  CANCELLED: "bg-border text-muted",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierto", YES: "Resuelto SÍ", NO: "Resuelto NO", CANCELLED: "Cancelado",
};

function MercadosTab({ token }: { token: string }) {
  const [markets, setMarkets]   = useState<AdminMarket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const load = useCallback((q = "", s = "") => {
    setLoading(true);
    apiGetAllMarkets(token, q || undefined, s || undefined)
      .then(d => setMarkets(d.markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search, filter), 300);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  async function deleteMarket(id: number) {
    setDeleting(true); setError("");
    try {
      await apiDeleteMarket(token, id);
      setMarkets(p => p.filter(m => m.market_id !== id));
      setConfirmId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por pregunta…"
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent transition-colors">
          <option value="">Todos</option>
          <option value="OPEN">Abiertos</option>
          <option value="YES">Resueltos SÍ</option>
          <option value="NO">Resueltos NO</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="text-center py-8 text-muted text-sm">Cargando…</div>
      ) : markets.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">Sin mercados</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">{markets.length} mercados</p>
          {markets.map(m => (
            <div key={m.market_id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <span className="text-xl shrink-0">{m.emoji ?? "🔮"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{m.question}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[m.status] ?? "bg-border text-muted"}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  {m.market_type === "multi" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Multi</span>
                  )}
                  <span className="text-[10px] text-muted">#{m.market_id}</span>
                  {m.total_pool > 0 && <span className="text-[10px] text-muted">{m.total_pool.toLocaleString("es", { maximumFractionDigits: 0 })} VDN</span>}
                </div>
              </div>
              {confirmId === m.market_id ? (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => deleteMarket(m.market_id)} disabled={deleting}
                    className="px-2.5 py-1.5 rounded-lg bg-danger text-white text-xs font-semibold transition-colors disabled:opacity-50">
                    {deleting ? "…" : "Confirmar"}
                  </button>
                  <button onClick={() => setConfirmId(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-alt border border-border text-xs font-medium transition-colors">
                    No
                  </button>
                </div>
              ) : (
                <button onClick={() => { setError(""); setConfirmId(m.market_id); }}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors text-base">
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

function UsuariosTab({ token }: { token: string }) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiGetAdminUsers(token)
      .then(({ users }) => setUsers(users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = search.trim()
    ? users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading) return <div className="text-center py-8 text-muted text-sm">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por usuario o email…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="text-xs text-muted">{filtered.length} usuarios</div>

      <div className="space-y-2">
        {filtered.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent-light font-bold text-sm shrink-0">
              {u.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">@{u.username}</p>
              <p className="text-xs text-muted truncate">{u.email}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-foreground tabular-nums">
                {u.balance_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
              </p>
              <p className="text-[10px] text-muted">{timeAgo(u.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Crear mercado (custodial) ─────────────────────────────────────────────────

function CrearMercadoTab({ token }: { token: string }) {
  const [question, setQuestion]     = useState("");
  const [category, setCategory]     = useState("");
  const [emoji, setEmoji]           = useState("");
  const [closeDate, setCloseDate]   = useState("");
  const [resolveDate, setResolveDate] = useState("");
  const [isMulti, setIsMulti]       = useState(false);
  const [outcomes, setOutcomes]     = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState<{ ok: boolean; text: string } | null>(null);

  function updateOutcome(i: number, val: string) {
    setOutcomes(p => { const n = [...p]; n[i] = val; return n; });
  }
  function addOutcome() { if (outcomes.length < 10) setOutcomes(p => [...p, ""]); }
  function removeOutcome(i: number) { if (outcomes.length > 2) setOutcomes(p => p.filter((_, j) => j !== i)); }

  async function handleCreate() {
    if (!question || !closeDate || !resolveDate) return;
    if (isMulti && outcomes.some(o => !o.trim())) {
      setMsg({ ok: false, text: "Todos los outcomes deben tener nombre" }); return;
    }
    setSubmitting(true); setMsg(null);
    try {
      const closeTs   = Math.floor(new Date(closeDate).getTime() / 1000);
      const resolveTs = Math.floor(new Date(resolveDate).getTime() / 1000);
      const body: Record<string, unknown> = {
        question, category: category || null, emoji: emoji || null,
        closeTime: closeTs, resolveTime: resolveTs,
      };
      if (isMulti) body.outcomes = outcomes.map(o => o.trim());
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/admin/custodial/create-market`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMsg({ ok: true, text: `Mercado #${data.market_id} creado (${isMulti ? "multi-outcome" : "Sí/No"})` });
      setQuestion(""); setCategory(""); setEmoji(""); setCloseDate(""); setResolveDate("");
      setOutcomes(["", ""]); setIsMulti(false);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted mb-1">Pregunta</label>
        <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="¿Ganará el Real Madrid la Champions 2025?"
          className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Categoría</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)}
            placeholder="Deportes"
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Emoji</label>
          <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
            placeholder="⚽"
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm" />
        </div>
      </div>

      {/* Tipo de mercado */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { val: false, label: "✅ / ❌  Sí o No", desc: "Resultado binario" },
          { val: true,  label: "🔢 Múltiple",      desc: "Varias opciones" },
        ].map(({ val, label, desc }) => (
          <button key={String(val)} type="button" onClick={() => setIsMulti(val)}
            className={`p-3 rounded-xl border text-left transition-all ${
              isMulti === val ? "border-accent bg-accent/10 text-accent-light" : "border-border text-muted hover:border-accent/50"
            }`}>
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-[11px] mt-0.5 opacity-70">{desc}</p>
          </button>
        ))}
      </div>

      {/* Outcomes para multi */}
      {isMulti && (
        <div className="space-y-2">
          <label className="block text-xs text-muted">Opciones (mín. 2, máx. 10)</label>
          {outcomes.map((o, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-muted w-5 shrink-0">{i + 1}.</span>
              <input type="text" value={o} onChange={e => updateOutcome(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none" />
              {outcomes.length > 2 && (
                <button type="button" onClick={() => removeOutcome(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors text-sm">✕</button>
              )}
            </div>
          ))}
          {outcomes.length < 10 && (
            <button type="button" onClick={addOutcome}
              className="w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted hover:border-accent hover:text-foreground transition-colors">
              + Agregar opción
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs text-muted mb-1">Cierre de apuestas</label>
        <input type="datetime-local" value={closeDate} min={toDatetimeLocal(new Date())}
          onChange={e => { setCloseDate(e.target.value); if (e.target.value) setResolveDate(addSeconds(e.target.value, 7_200)); }}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2" />
        <div className="flex gap-2 flex-wrap">
          {CLOSE_PRESETS.map(({ label, s }) => (
            <button key={label} type="button" onClick={() => { const v = addSeconds(null, s); setCloseDate(v); setResolveDate(addSeconds(v, 7_200)); }}
              className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors">{label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Resolución mínima</label>
        <input type="datetime-local" value={resolveDate} min={closeDate ? addSeconds(closeDate, 3_600) : toDatetimeLocal(new Date())}
          onChange={e => setResolveDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2" />
        {closeDate && (
          <div className="flex gap-2 flex-wrap">
            {RESOLVE_OFFSETS.map(({ label, s }) => (
              <button key={label} type="button" onClick={() => setResolveDate(addSeconds(closeDate, s))}
                className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors">cierre {label}</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={handleCreate} disabled={!question || !closeDate || !resolveDate || submitting}
        className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50">
        {submitting ? "Creando…" : "Crear mercado"}
      </button>
      {msg && (
        <p className={`text-xs text-center ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}
    </div>
  );
}

// ── On-chain section ──────────────────────────────────────────────────────────

function RoleStatus({ address }: { address: string }) {
  const { data: hasRole, isLoading } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "hasRole",
    args: [MARKET_CREATOR_ROLE, address as `0x${string}`],
  });
  if (isLoading) return <div className="text-xs text-muted px-3 py-2 rounded-lg bg-surface-alt border border-border">Verificando permisos…</div>;
  if (hasRole) return <div className="text-xs text-success px-3 py-2 rounded-lg bg-success/10 border border-success/20">✓ Wallet tiene MARKET_CREATOR_ROLE</div>;
  return <div className="text-xs text-danger px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">✗ Wallet NO tiene MARKET_CREATOR_ROLE</div>;
}

function extractRevertReason(error: Error): string {
  const short = (error as any).shortMessage as string | undefined;
  if (short && short !== "An unknown error occurred.") return short;
  const detailsMatch = error.message.match(/Details:\s*(.+?)(?:\n|$)/);
  if (detailsMatch) return detailsMatch[1].trim();
  return error.message.slice(0, 300);
}

function OnChainTab() {
  const { address } = useAccount();
  const { isWrongNetwork } = useWrongNetwork();
  const create  = useCreateMarket();
  const resolve = useResolveMarket();

  const [question, setQuestion]       = useState("");
  const [closeDate, setCloseDate]     = useState("");
  const [resolveDate, setResolveDate] = useState("");
  const [resolveId, setResolveId]     = useState("");
  const [resolveResult, setResolveResult] = useState<boolean>(true);

  useEffect(() => { if (create.isSuccess) { setQuestion(""); setCloseDate(""); setResolveDate(""); } }, [create.isSuccess]);
  useEffect(() => { if (resolve.isSuccess) setResolveId(""); }, [resolve.isSuccess]);

  return (
    <div className="space-y-6">
      {/* Create on-chain */}
      <div className="p-4 rounded-xl bg-background border border-border space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Crear mercado on-chain</h3>
        {address && <RoleStatus address={address} />}
        <div>
          <label className="block text-xs text-muted mb-1">Pregunta</label>
          <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="¿Ganará el Real Madrid la Champions 2025?"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Cierre de apuestas</label>
          <input type="datetime-local" value={closeDate} min={toDatetimeLocal(new Date())}
            onChange={e => { setCloseDate(e.target.value); if (e.target.value) setResolveDate(addSeconds(e.target.value, 7_200)); }}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2" />
          <div className="flex gap-2 flex-wrap">
            {CLOSE_PRESETS.map(({ label, s }) => (
              <button key={label} type="button" onClick={() => { const v = addSeconds(null, s); setCloseDate(v); setResolveDate(addSeconds(v, 7_200)); }}
                className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors">{label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Resolución mínima</label>
          <input type="datetime-local" value={resolveDate} min={closeDate ? addSeconds(closeDate, 3_600) : toDatetimeLocal(new Date())}
            onChange={e => setResolveDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2" />
          {closeDate && (
            <div className="flex gap-2 flex-wrap">
              {RESOLVE_OFFSETS.map(({ label, s }) => (
                <button key={label} type="button" onClick={() => setResolveDate(addSeconds(closeDate, s))}
                  className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors">cierre {label}</button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => create.createMarket(question, dateToTimestamp(closeDate), dateToTimestamp(resolveDate))}
          disabled={!question || !closeDate || !resolveDate || create.isPending || create.isConfirming || isWrongNetwork}
          className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {create.isPending || create.isConfirming ? "Creando…" : "Crear mercado"}
        </button>
        {create.hash && <div className="text-center"><TxLink hash={create.hash} /></div>}
        {create.isSuccess && <p className="text-xs text-success text-center">¡Mercado creado!</p>}
        {create.error && <p className="text-xs text-danger">{extractRevertReason(create.error)}</p>}
      </div>

      {/* Resolve on-chain */}
      <div className="p-4 rounded-xl bg-background border border-border space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Resolver mercado on-chain</h3>
        <div>
          <label className="block text-xs text-muted mb-1">ID del mercado</label>
          <input type="number" min="1" value={resolveId} onChange={e => setResolveId(e.target.value)}
            placeholder="1"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map(isYes => (
            <button key={String(isYes)} onClick={() => setResolveResult(isYes)}
              className={`py-3 rounded-lg font-semibold text-sm transition-all ${
                isYes ? resolveResult ? "bg-success text-white" : "bg-success/10 text-success border border-success/30"
                      : !resolveResult ? "bg-danger text-white" : "bg-danger/10 text-danger border border-danger/30"
              }`}>
              {isYes ? "SÍ ganó" : "NO ganó"}
            </button>
          ))}
        </div>
        <button onClick={() => resolve.resolve(BigInt(resolveId), resolveResult)}
          disabled={!resolveId || resolve.isPending || resolve.isConfirming || isWrongNetwork}
          className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {resolve.isPending || resolve.isConfirming ? "Resolviendo…" : "Resolver mercado"}
        </button>
        {resolve.hash && <div className="text-center"><TxLink hash={resolve.hash} /></div>}
        {resolve.isSuccess && <p className="text-xs text-success text-center">¡Mercado resuelto!</p>}
        {resolve.error && <p className="text-xs text-danger">{extractRevertReason(resolve.error)}</p>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── TorneosAdminTab ───────────────────────────────────────────────────────────

const API_URL_ADMIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function TorneosAdminTab({ token }: { token: string }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [msg,         setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [loading,     setLoading]     = useState(false);

  const [name,        setName]        = useState("");
  const [desc,        setDesc]        = useState("");
  const [start,       setStart]       = useState("");
  const [end,         setEnd]         = useState("");
  const [fee,         setFee]         = useState("500");
  const [seed,        setSeed]        = useState("0");
  const [maxP,        setMaxP]        = useState("");

  function toDatetimeLocal(date: Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
  }

  const load = () =>
    fetch(`${API_URL_ADMIN}/api/tournaments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTournaments(d.tournaments ?? [])).catch(() => {});

  useEffect(() => { load(); }, []);

  async function adminPost(path: string, body?: object) {
    const r = await fetch(`${API_URL_ADMIN}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Error");
    return data;
  }

  async function handleCreate() {
    if (!name || !start || !end) { setMsg({ ok: false, text: "Nombre, inicio y fin son requeridos" }); return; }
    setLoading(true); setMsg(null);
    try {
      const start_ts = Math.floor(new Date(start).getTime() / 1000);
      const end_ts   = Math.floor(new Date(end).getTime() / 1000);
      const prizes   = [
        { rank: 1, prize_vdn: Math.floor(Number(seed) * 0.5 || 0) },
        { rank: 2, prize_vdn: Math.floor(Number(seed) * 0.3 || 0) },
        { rank: 3, prize_vdn: Math.floor(Number(seed) * 0.2 || 0) },
      ].filter(p => p.prize_vdn > 0);

      const { tournament_id } = await adminPost("/api/admin/custodial/tournaments", {
        name, description: desc || null, start_ts, end_ts,
        entry_fee_vdn: Number(fee) || 0,
        prize_pool_vdn: Number(seed) || 0,
        max_participants: maxP ? Number(maxP) : null,
      });

      if (prizes.length) {
        for (const p of prizes) {
          await adminPost(`/api/admin/custodial/tournaments/${tournament_id}/prizes`, p);
        }
      }
      setMsg({ ok: true, text: `Torneo #${tournament_id} creado` });
      setName(""); setDesc(""); setStart(""); setEnd(""); setFee("500"); setSeed("0"); setMaxP("");
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  }

  async function doAction(id: number, action: "start" | "end") {
    setMsg(null);
    try {
      await adminPost(`/api/admin/custodial/tournaments/${id}/${action}`);
      setMsg({ ok: true, text: action === "start" ? "Torneo activado" : "Torneo finalizado y premios distribuidos" });
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  }

  const STATUS_COLOR: Record<string, string> = { pending: "text-yellow-400", active: "text-success", finished: "text-muted" };
  const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", active: "Activo", finished: "Finalizado" };

  return (
    <div className="space-y-6">
      {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}

      {/* Create form */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Crear torneo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Liga Semanal VDN"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Descripción (opcional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Compite por el mayor rendimiento de la semana"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Inicio</label>
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
            <div className="flex gap-1 mt-1">
              {[{ l: "Ahora", s: 0 }, { l: "+1h", s: 3600 }, { l: "Mañana", s: 86400 }].map(p => (
                <button key={p.l} onClick={() => setStart(toDatetimeLocal(new Date(Date.now() + p.s * 1000)))}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground">{p.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Fin</label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
            <div className="flex gap-1 mt-1">
              {[{ l: "+1d", s: 86400 }, { l: "+7d", s: 604800 }, { l: "+30d", s: 2592000 }].map(p => (
                <button key={p.l} onClick={() => setEnd(toDatetimeLocal(new Date((start ? new Date(start).getTime() : Date.now()) + p.s * 1000)))}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground">{p.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Cuota de entrada (VDN)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Premio base VDN (semilla)</label>
            <input type="number" value={seed} onChange={e => setSeed(e.target.value)} min="0"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
            <p className="text-[10px] text-muted mt-0.5">Se suma a las cuotas de entrada. Se divide 50/30/20%</p>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Máx. participantes (opcional)</label>
            <input type="number" value={maxP} onChange={e => setMaxP(e.target.value)} min="2" placeholder="Sin límite"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading}
          className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? "Creando…" : "Crear torneo"}
        </button>
      </div>

      {/* Tournament list */}
      <div className="space-y-3">
        {tournaments.length === 0 && <p className="text-sm text-muted text-center py-6">Sin torneos aún</p>}
        {tournaments.map((t: any) => (
          <div key={t.id} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                👥 {t.participant_count} · 💰 Pool: {t.prize_pool_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
                {t.entry_fee_vdn > 0 && ` · Entrada: ${t.entry_fee_vdn} VDN`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {t.status === "pending"  && <button onClick={() => doAction(t.id, "start")} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-semibold hover:bg-success/30 transition-colors">▶ Activar</button>}
              {t.status === "active"   && <button onClick={() => doAction(t.id, "end")}   className="px-3 py-1.5 rounded-lg bg-danger/20 text-danger text-xs font-semibold hover:bg-danger/30 transition-colors">⏹ Finalizar</button>}
              {t.status === "finished" && <span className="text-xs text-muted">Cerrado</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { isAdmin, token }       = useAuth();
  const { count }                = useMarketCount();

  const [tab, setTab]                       = useState<TabId>("revisar");
  const [pendingReview, setPendingReview]   = useState(0);
  const [pendingResolve, setPendingResolve] = useState(0);

  useEffect(() => {
    if (!token) return;
    apiGetPendingMarkets(token).then(({ count }) => setPendingReview(count)).catch(() => {});
    apiGetMarketsToResolve(token).then(({ count }) => {
      setPendingResolve(count);
      // Auto-abrir pestaña resolver si hay mercados esperando
      if (count > 0) setTab("resolver");
    }).catch(() => {});
  }, [token]);

  if (!isConnected && !isAdmin && !token) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted">Acceso restringido al panel admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Admin</h1>
          <p className="text-muted text-sm mt-0.5">
            {address ? `${address.slice(0, 8)}…${address.slice(-6)} · ` : ""}
            Mercados on-chain: {String(count)}
          </p>
        </div>
        {(pendingReview > 0 || pendingResolve > 0) && (
          <div className="flex gap-2">
            {pendingReview > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/15 text-warning border border-warning/25">
                {pendingReview} por revisar
              </span>
            )}
            {pendingResolve > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent-light border border-accent/25">
                {pendingResolve} por resolver
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alert: mercados pendientes de resolución */}
      {pendingResolve > 0 && tab !== "resolver" && (
        <button
          onClick={() => setTab("resolver")}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-accent/10 border border-accent/40 hover:bg-accent/15 transition-colors text-left"
        >
          <span className="text-xl shrink-0">🏁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-accent-light">
              {pendingResolve} mercado{pendingResolve !== 1 ? "s" : ""} pendiente{pendingResolve !== 1 ? "s" : ""} de resolución
            </p>
            <p className="text-xs text-muted mt-0.5">Toca para resolver y pagar a los ganadores</p>
          </div>
          <span className="text-accent-light font-bold shrink-0">→</span>
        </button>
      )}

      {/* Tabs */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-4 pt-4">
          <TabNav
            active={tab}
            onChange={setTab}
            badges={{ revisar: pendingReview || undefined, resolver: pendingResolve || undefined } as any}
          />
        </div>
        <div className="p-4 pt-5">
          {tab === "revisar"  && token && <PorRevisarTab    token={token} />}
          {tab === "resolver" && token && <PorResolverTab   token={token} />}
          {tab === "mercados" && token && <MercadosTab      token={token} />}
          {tab === "usuarios" && token && <UsuariosTab      token={token} />}
          {tab === "crear"    && token && <CrearMercadoTab  token={token} />}
          {tab === "torneos"  && token && <TorneosAdminTab  token={token} />}
          {tab === "onchain"  && <OnChainTab />}
        </div>
      </div>
    </div>
  );
}
