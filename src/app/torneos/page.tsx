"use client";

import { useEffect, useState } from "react";
import {
  apiGetTournaments,
  apiGetTournament,
  apiJoinTournament,
  type Tournament,
  type TournamentEntry,
} from "@/lib/custodialApi";
import { useAuth } from "@/context/AuthContext";

function useCountdown(endTs: number) {
  const calc = () => Math.max(0, endTs - Math.floor(Date.now() / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft(calc), 1000);
    return () => clearInterval(id);
  });
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return { d, h, m, s, done: left === 0 };
}

const STATUS_LABEL: Record<string, string> = {
  pending:  "Próximamente",
  active:   "En curso",
  finished: "Finalizado",
};

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-500/20 text-yellow-400",
  active:   "bg-success/20 text-success",
  finished: "bg-border/60 text-muted",
};

const MEDAL = ["🥇", "🥈", "🥉"];

function TournamentDetail({
  id,
  onBack,
}: {
  id: number;
  onBack: () => void;
}) {
  const { token, isLoggedIn, user } = useAuth();
  const [data, setData]     = useState<Awaited<ReturnType<typeof apiGetTournament>> | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined]   = useState(false);
  const [error, setError]     = useState("");

  const load = () =>
    apiGetTournament(id).then(d => {
      setData(d);
      if (user && d.leaderboard.some(e => e.user_id === user.id)) setJoined(true);
    }).catch(() => {});

  useEffect(() => { load(); }, [id]);

  const countdown = useCountdown(data?.tournament.end_ts ?? 0);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError("");
    try {
      await apiJoinTournament(token, id);
      setJoined(true);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al unirse");
    } finally {
      setJoining(false);
    }
  };

  if (!data) return <div className="text-center text-muted py-20">Cargando…</div>;

  const { tournament: t, leaderboard, prizes } = data;

  return (
    <div>
      <button onClick={onBack} className="text-sm text-muted hover:text-foreground mb-4 flex items-center gap-1">
        ← Volver
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLE[t.status]}`}>
              {STATUS_LABEL[t.status]}
            </span>
            <h2 className="text-xl font-bold text-foreground mt-2">{t.name}</h2>
            {t.description && <p className="text-sm text-muted mt-1">{t.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-accent-light">
              {t.prize_pool_vdn.toLocaleString("es")}
            </p>
            <p className="text-xs text-muted">VDN en premios</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted mb-4">
          <span>👥 {t.participant_count} participantes{t.max_participants ? ` / ${t.max_participants}` : ""}</span>
          <span>💰 Entrada: {t.entry_fee_vdn > 0 ? `${t.entry_fee_vdn} VDN` : "Gratis"}</span>
          {t.status === "active" && !countdown.done && (
            <span className="text-foreground font-semibold">
              ⏱ Termina en: {countdown.d > 0 ? `${countdown.d}d ` : ""}{String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}
            </span>
          )}
        </div>

        {/* Prizes */}
        {prizes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {prizes.map(p => (
              <div key={p.rank} className="rounded-xl bg-surface-alt border border-border px-3 py-2 text-center min-w-[80px]">
                <p className="text-lg">{MEDAL[p.rank - 1] ?? `#${p.rank}`}</p>
                <p className="text-sm font-bold text-accent-light">{p.prize_vdn.toLocaleString("es")} VDN</p>
              </div>
            ))}
          </div>
        )}

        {/* Join button */}
        {t.is_joinable && isLoggedIn && !joined && (
          <div className="mt-4">
            {error && <p className="text-xs text-danger mb-2">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {joining ? "Uniéndose…" : t.entry_fee_vdn > 0 ? `Unirse (${t.entry_fee_vdn} VDN)` : "Unirse gratis"}
            </button>
          </div>
        )}
        {joined && t.status === "active" && (
          <div className="mt-4 rounded-xl bg-success/10 border border-success/30 px-4 py-2 text-sm text-success font-medium text-center">
            ✓ Estás participando — ¡sigue apostando para subir en el ranking!
          </div>
        )}
        {!isLoggedIn && t.is_joinable && (
          <p className="mt-4 text-sm text-muted text-center">Inicia sesión para participar</p>
        )}
      </div>

      {/* Leaderboard */}
      <h3 className="text-sm font-bold text-foreground mb-3">Clasificación</h3>
      {leaderboard.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">Sin participantes aún. ¡Sé el primero!</p>
      ) : (
        <div className="flex flex-col gap-1">
          {leaderboard.map(e => {
            const isMe = e.user_id === user?.id;
            const pnlColor = e.pnl_vdn >= 0 ? "text-success" : "text-danger";
            return (
              <div
                key={e.user_id}
                className={[
                  "flex items-center gap-3 px-4 py-3 rounded-xl",
                  isMe ? "bg-accent/10 border border-accent/30" : "hover:bg-surface-alt",
                ].join(" ")}
              >
                <div className="w-8 text-center shrink-0">
                  {e.rank <= 3
                    ? <span className="text-xl">{MEDAL[e.rank - 1]}</span>
                    : <span className="text-sm font-bold text-muted">#{e.rank}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-accent-light" : "text-foreground"}`}>
                    {e.username}{isMe && <span className="ml-1 text-xs text-accent-light/70">(tú)</span>}
                  </p>
                  <p className="text-xs text-muted">{e.bets_count} apuesta{e.bets_count !== 1 ? "s" : ""}</p>
                </div>
                <p className={`text-sm font-bold tabular-nums ${pnlColor}`}>
                  {e.pnl_vdn >= 0 ? "+" : ""}{e.pnl_vdn.toLocaleString("es", { maximumFractionDigits: 0 })} VDN
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, onSelect }: { t: Tournament; onSelect: () => void }) {
  const countdown = useCountdown(t.end_ts);

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:bg-surface-alt transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLE[t.status]}`}>
            {STATUS_LABEL[t.status]}
          </span>
          <h3 className="text-base font-bold text-foreground mt-1.5 line-clamp-1">{t.name}</h3>
          {t.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{t.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold text-accent-light">
            {t.prize_pool_vdn.toLocaleString("es")}
          </p>
          <p className="text-[10px] text-muted">VDN</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <div className="flex items-center gap-3">
          <span>👥 {t.participant_count}</span>
          <span>💰 {t.entry_fee_vdn > 0 ? `${t.entry_fee_vdn} VDN` : "Gratis"}</span>
        </div>
        {t.status === "active" && !countdown.done && (
          <span className="font-semibold text-foreground">
            ⏱ {countdown.d > 0 ? `${countdown.d}d ` : ""}{String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}
          </span>
        )}

        <span className="text-accent-light text-xs font-semibold">Ver detalle →</span>
      </div>
    </button>
  );
}

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<number | null>(null);

  useEffect(() => {
    apiGetTournaments()
      .then(d => setTournaments(d.tournaments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active   = tournaments.filter(t => t.status === "active");
  const upcoming = tournaments.filter(t => t.status === "pending");
  const finished = tournaments.filter(t => t.status === "finished");

  if (selected !== null) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <TournamentDetail id={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">⚔️ Torneos</h1>
        <p className="text-sm text-muted mt-1">
          Compite contra otros apostadores y gana VDN extra
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted py-20">Cargando torneos…</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-muted font-medium">No hay torneos disponibles aún.</p>
          <p className="text-sm text-muted mt-1">¡Pronto habrá torneos con premios en VDN!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-success uppercase tracking-wider mb-3">En curso</h2>
              <div className="flex flex-col gap-3">
                {active.map(t => <TournamentCard key={t.id} t={t} onSelect={() => setSelected(t.id)} />)}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Próximamente</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map(t => <TournamentCard key={t.id} t={t} onSelect={() => setSelected(t.id)} />)}
              </div>
            </section>
          )}
          {finished.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Finalizados</h2>
              <div className="flex flex-col gap-3">
                {finished.map(t => <TournamentCard key={t.id} t={t} onSelect={() => setSelected(t.id)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
