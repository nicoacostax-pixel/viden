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
  apiGetMarketsToResolve, apiAdminResolveMarket,
  apiGetAdminUsers,
  type PendingMarket, type MarketToResolve, type AdminUser,
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

type TabId = "revisar" | "resolver" | "usuarios" | "crear" | "onchain";

function TabNav({ active, onChange, badges }: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges: Partial<Record<TabId, number>>;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "revisar",  label: "Por revisar" },
    { id: "resolver", label: "Por resolver" },
    { id: "usuarios", label: "Usuarios" },
    { id: "crear",    label: "Crear mercado" },
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

function PorResolverTab({ token }: { token: string }) {
  const [markets, setMarkets] = useState<MarketToResolve[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, "yes" | "no" | "cancelled">>({});
  const [done, setDone]       = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    apiGetMarketsToResolve(token)
      .then(({ markets }) => setMarkets(markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function setResult(id: number, r: "yes" | "no" | "cancelled") {
    setResults(p => ({ ...p, [id]: r }));
  }

  async function resolve(id: number) {
    const result = results[id];
    if (!result) return;
    setWorking(id);
    try {
      await apiAdminResolveMarket(token, id, result);
      setDone(p => new Set(p).add(id));
    } catch { /* silent */ } finally { setWorking(null); }
  }

  if (loading) return <div className="text-center py-8 text-muted text-sm">Cargando…</div>;

  if (markets.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-3xl">🏁</p>
      <p className="text-sm text-muted">Sin mercados pendientes de resolución</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {markets.map(m => {
        const total   = m.pool_yes + m.pool_no;
        const yesP    = total > 0 ? Math.round((m.pool_yes / total) * 100) : 50;
        const noP     = 100 - yesP;
        const isDone  = done.has(m.market_id);
        const result  = results[m.market_id];
        const overdue = Math.floor(Date.now() / 1000) - m.close_time;

        return (
          <div key={m.market_id} className={`p-4 rounded-xl border space-y-3 ${isDone ? "bg-success/5 border-success/20" : "bg-background border-border"}`}>
            {isDone ? (
              <div className="flex items-center gap-2 text-success text-sm font-semibold">
                <span>✅</span> Resuelto como <strong>{result === "yes" ? "SÍ" : result === "no" ? "NO" : "Cancelado"}</strong>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{m.emoji ?? "🔮"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{m.question}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {m.is_user_created ? <span className="text-xs text-accent-light">@{m.creator_username}</span> : <span className="text-xs text-muted">admin</span>}
                      <span className="text-xs text-danger font-medium">Cerró hace {overdue < 3600 ? `${Math.floor(overdue/60)}m` : overdue < 86400 ? `${Math.floor(overdue/3600)}h` : `${Math.floor(overdue/86400)}d`}</span>
                    </div>
                  </div>
                  {m.public_id && <span className="text-[10px] text-muted font-mono shrink-0">{m.public_id}</span>}
                </div>

                {/* Pool stats */}
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

                {/* Result selector */}
                <div className="grid grid-cols-3 gap-2">
                  {(["yes", "no", "cancelled"] as const).map(r => (
                    <button key={r} onClick={() => setResult(m.market_id, r)}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        result === r
                          ? r === "yes" ? "bg-success text-white" : r === "no" ? "bg-danger text-white" : "bg-muted/40 text-foreground"
                          : r === "yes" ? "bg-success/10 text-success border border-success/30" : r === "no" ? "bg-danger/10 text-danger border border-danger/30" : "bg-surface-alt text-muted border border-border"
                      }`}>
                      {r === "yes" ? "✅ SÍ ganó" : r === "no" ? "❌ NO ganó" : "↩ Cancelar"}
                    </button>
                  ))}
                </div>

                <button onClick={() => resolve(m.market_id)} disabled={!result || working === m.market_id}
                  className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40">
                  {working === m.market_id ? "Resolviendo…" : "Confirmar resolución"}
                </button>
              </>
            )}
          </div>
        );
      })}
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
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState<{ ok: boolean; text: string } | null>(null);

  async function handleCreate() {
    if (!question || !closeDate || !resolveDate) return;
    setSubmitting(true); setMsg(null);
    try {
      const closeTs   = Math.floor(new Date(closeDate).getTime() / 1000);
      const resolveTs = Math.floor(new Date(resolveDate).getTime() / 1000);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/admin/custodial/create-market`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, category: category || null, emoji: emoji || null, closeTime: closeTs, resolveTime: resolveTs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMsg({ ok: true, text: `Mercado #${data.market_id} creado` });
      setQuestion(""); setCategory(""); setEmoji(""); setCloseDate(""); setResolveDate("");
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

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { isAdmin, token }       = useAuth();
  const { count }                = useMarketCount();

  const [tab, setTab]                     = useState<TabId>("revisar");
  const [pendingReview, setPendingReview] = useState(0);
  const [pendingResolve, setPendingResolve] = useState(0);

  useEffect(() => {
    if (!token) return;
    apiGetPendingMarkets(token).then(({ count }) => setPendingReview(count)).catch(() => {});
    apiGetMarketsToResolve(token).then(({ count }) => setPendingResolve(count)).catch(() => {});
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
          {tab === "revisar"  && token && <PorRevisarTab  token={token} />}
          {tab === "resolver" && token && <PorResolverTab token={token} />}
          {tab === "usuarios" && token && <UsuariosTab    token={token} />}
          {tab === "crear"    && token && <CrearMercadoTab token={token} />}
          {tab === "onchain"  && <OnChainTab />}
        </div>
      </div>
    </div>
  );
}
