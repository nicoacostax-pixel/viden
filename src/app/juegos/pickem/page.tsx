"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Match = {
  market_id: number;
  question: string;
  home_team: string;
  away_team: string;
  kickoff_ts: number | null;
  close_time: number;
  competition_name: string | null;
  status: string;
};

type PickResult = {
  marketId: number;
  prediction: "yes" | "no";
  resolved?: boolean;
  correct?: boolean;
  question?: string;
  homeTeam?: string;
  awayTeam?: string;
  kickoffTs?: number | null;
  competition?: string | null;
};

type Entry = {
  id: number;
  week_key: string;
  picks: PickResult[];
  correct: number | null;
  total: number | null;
  vdn_earned: number;
  status: "pending" | "resolved";
};

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function fmtKickoff(ts: number | null) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleString("es", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function teamInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  pick,
  onPick,
  disabled,
}: {
  match: Match;
  pick: "yes" | "no" | null;
  onPick: (id: number, p: "yes" | "no") => void;
  disabled: boolean;
}) {
  const kickoff = fmtKickoff(match.kickoff_ts);

  return (
    <div className={`rounded-2xl bg-surface border p-4 flex flex-col gap-3 transition-colors ${pick ? "border-accent/40" : "border-border"}`}>
      {match.competition_name && (
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{match.competition_name}</p>
      )}
      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-border flex items-center justify-center text-xs font-bold text-foreground">
            {teamInitials(match.home_team)}
          </div>
          <span className="text-xs font-semibold text-center leading-tight">{match.home_team}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-black text-muted">vs</span>
          {kickoff && <span className="text-[10px] text-muted mt-0.5">{kickoff}</span>}
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-border flex items-center justify-center text-xs font-bold text-foreground">
            {teamInitials(match.away_team)}
          </div>
          <span className="text-xs font-semibold text-center leading-tight">{match.away_team}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => !disabled && onPick(match.market_id, "yes")}
          disabled={disabled}
          className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
            pick === "yes"
              ? "bg-success text-white border-success"
              : "bg-success/10 hover:bg-success/20 border-success/30 text-success"
          } disabled:opacity-40`}
        >
          SÍ — Gana {match.home_team.split(" ")[0]}
        </button>
        <button
          onClick={() => !disabled && onPick(match.market_id, "no")}
          disabled={disabled}
          className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
            pick === "no"
              ? "bg-danger text-white border-danger"
              : "bg-danger/10 hover:bg-danger/20 border-danger/30 text-danger"
          } disabled:opacity-40`}
        >
          NO — Empate o visita
        </button>
      </div>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ pick }: { pick: PickResult }) {
  const resolved = pick.resolved;
  const correct  = pick.correct;

  return (
    <div className={`rounded-2xl bg-surface border p-4 flex items-center gap-3 ${
      !resolved ? "border-border" : correct ? "border-success/40" : "border-danger/40"
    }`}>
      <span className="text-2xl shrink-0">
        {!resolved ? "⏳" : correct ? "✅" : "❌"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground line-clamp-2">{pick.question}</p>
        <p className="text-[10px] text-muted mt-0.5">
          Tu pick: <span className={`font-bold ${pick.prediction === "yes" ? "text-success" : "text-danger"}`}>
            {pick.prediction === "yes" ? "SÍ" : "NO"}
          </span>
          {resolved && <span className="ml-2">{correct ? "· Correcto 🎉" : "· Incorrecto"}</span>}
          {!resolved && <span className="ml-2">· Pendiente</span>}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PickemPage() {
  const { token, isLoggedIn, isLoading: authLoading } = useAuth();
  const [matches, setMatches]     = useState<Match[]>([]);
  const [entry, setEntry]         = useState<Entry | null>(null);
  const [weekKey, setWeekKey]     = useState("");
  const [loading, setLoading]     = useState(true);
  const [picks, setPicks]         = useState<Record<number, "yes" | "no">>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const matchRes = await fetch(`${API}/api/game/pickem/matches`);
      const matchData = await matchRes.json();
      setMatches(matchData.matches ?? []);
      setWeekKey(matchData.weekKey ?? "");

      if (token) {
        const entryRes = await fetch(`${API}/api/game/pickem/my-picks`, { headers: authHeaders(token) });
        const entryData = await entryRes.json();
        if (entryData.entry) setEntry(entryData.entry);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handlePick = (marketId: number, prediction: "yes" | "no") => {
    setPicks(p => ({ ...p, [marketId]: prediction }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    const pickList = Object.entries(picks).map(([id, pred]) => ({ marketId: Number(id), prediction: pred }));
    if (pickList.length === 0) { setError("Selecciona al menos un partido"); return; }

    setSubmitting(true); setError(null);
    try {
      const res  = await fetch(`${API}/api/game/pickem/submit`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ picks: pickList }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Error al enviar"); return; }
      setSubmitted(true);
      load();
    } catch { setError("Error de conexión"); }
    finally { setSubmitting(false); }
  };

  if (authLoading || loading) return <div className="text-center text-muted py-32">Cargando…</div>;

  if (!isLoggedIn) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-6xl">⚽</div>
      <h1 className="text-2xl font-bold">Pick'em Deportivo</h1>
      <p className="text-muted max-w-sm">Inicia sesión para hacer tus picks semanales.</p>
      <Link href="/login" className="text-accent-light underline text-sm">Entrar →</Link>
    </div>
  );

  // Already submitted this week — show results
  if (entry) {
    const allResolved = entry.picks.every(p => p.resolved);
    return (
      <div className="max-w-sm mx-auto py-8 flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Pick'em Deportivo</h1>
          <p className="text-xs text-muted mt-1">Semana del {weekKey}</p>
        </div>

        {allResolved ? (
          <div className="rounded-2xl bg-surface border border-accent/30 p-5 text-center flex flex-col gap-2">
            <div className="text-4xl">{entry.correct === entry.total ? "🏆" : entry.correct! > 0 ? "🎉" : "😔"}</div>
            <p className="text-lg font-extrabold text-foreground">{entry.correct} / {entry.total} correctos</p>
            {entry.vdn_earned > 0
              ? <p className="text-success font-bold text-xl">+{entry.vdn_earned} VDN ganados</p>
              : <p className="text-muted text-sm">Sin VDN esta semana — mejor la próxima</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface border border-border p-4 text-center">
            <p className="text-sm text-muted">Picks enviados · esperando resultados</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-muted">{entry.picks.filter(p => p.resolved).length} / {entry.total} resueltos</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entry.picks.map(p => <ResultCard key={p.marketId} pick={p} />)}
        </div>

        <div className="rounded-xl bg-surface border border-border p-4 text-xs text-muted space-y-1.5">
          <div className="flex justify-between"><span>Por acierto</span><span className="text-foreground font-medium">8 VDN</span></div>
          <div className="flex justify-between"><span>Perfecta (5/5)</span><span className="text-foreground font-medium">+60 VDN bonus</span></div>
          <div className="flex justify-between"><span>Nueva semana</span><span className="text-foreground font-medium">cada lunes</span></div>
        </div>
      </div>
    );
  }

  // No matches available
  if (matches.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-6xl">📅</div>
      <h1 className="text-2xl font-bold">Pick'em Deportivo</h1>
      <p className="text-muted max-w-sm">No hay partidos disponibles esta semana. Vuelve cuando haya mercados de fútbol activos.</p>
    </div>
  );

  const pickCount = Object.keys(picks).length;

  return (
    <div className="max-w-sm mx-auto py-8 flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Pick'em Deportivo</h1>
        <p className="text-sm text-muted mt-1">Elige hasta {matches.length} partidos · gana VDN si aciertas</p>
        <p className="text-xs text-muted mt-0.5">Semana del {weekKey}</p>
      </div>

      {/* Prize info */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Por acierto", val: "8 VDN" },
          { label: "Perfecta", val: "60 VDN" },
          { label: "Picks", val: `${pickCount}/${matches.length}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-surface border border-border py-3 px-2">
            <div className="text-sm font-bold text-accent-light">{s.val}</div>
            <div className="text-[10px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Match cards */}
      <div className="flex flex-col gap-3">
        {matches.map(m => (
          <MatchCard
            key={m.market_id}
            match={m}
            pick={picks[m.market_id] ?? null}
            onPick={handlePick}
            disabled={submitted || submitting}
          />
        ))}
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={pickCount === 0 || submitting || submitted}
        className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base transition-colors shadow-lg shadow-accent/20"
      >
        {submitting ? "Enviando…" : submitted ? "¡Enviado!" : `Confirmar ${pickCount > 0 ? `(${pickCount}) ` : ""}picks →`}
      </button>

      <p className="text-center text-xs text-muted">Solo puedes enviar una vez por semana. Los VDN se acreditan cuando resuelvan los partidos.</p>
    </div>
  );
}
