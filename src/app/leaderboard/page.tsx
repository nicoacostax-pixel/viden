"use client";

import { useEffect, useState } from "react";
import {
  apiGetWeeklyLeaderboard,
  apiGetAllTimeLeaderboard,
  type LeaderboardEntry,
} from "@/lib/custodialApi";
import { useAuth } from "@/context/AuthContext";

const MEDAL = ["🥇", "🥈", "🥉"];
const RARITY_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];

function fmt(n: number) {
  return n.toLocaleString("es", { maximumFractionDigits: 0 });
}

function Row({ entry, myId }: { entry: LeaderboardEntry; myId?: number }) {
  const isMe = entry.user_id === myId;
  const pnlColor = entry.pnl_vdn >= 0 ? "text-success" : "text-danger";

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
        isMe ? "bg-accent/10 border border-accent/30" : "hover:bg-surface-alt",
      ].join(" ")}
    >
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {entry.rank <= 3 ? (
          <span className={`text-xl ${RARITY_COLORS[entry.rank - 1]}`}>
            {MEDAL[entry.rank - 1]}
          </span>
        ) : (
          <span className="text-sm font-bold text-muted tabular-nums">#{entry.rank}</span>
        )}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isMe ? "text-accent-light" : "text-foreground"}`}>
          {entry.username}
          {isMe && <span className="ml-1.5 text-xs text-accent-light/70">(tú)</span>}
        </p>
        <p className="text-xs text-muted">{entry.bet_count} apuesta{entry.bet_count !== 1 ? "s" : ""}</p>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${pnlColor}`}>
          {entry.pnl_vdn >= 0 ? "+" : ""}{fmt(entry.pnl_vdn)} VDN
        </p>
        <p className="text-xs text-muted tabular-nums">{fmt(entry.total_won)} ganados</p>
      </div>
    </div>
  );
}

type Tab = "weekly" | "alltime";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab]                   = useState<Tab>("weekly");
  const [weekly, setWeekly]             = useState<LeaderboardEntry[]>([]);
  const [alltime, setAlltime]           = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [since, setSince]               = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGetWeeklyLeaderboard(50),
      apiGetAllTimeLeaderboard(50),
    ]).then(([w, a]) => {
      setWeekly(w.leaderboard);
      setSince(w.since);
      setAlltime(a.leaderboard);
    }).finally(() => setLoading(false));
  }, []);

  const entries = tab === "weekly" ? weekly : alltime;

  const sinceDate = since
    ? new Date(since * 1000).toLocaleDateString("es", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">🏆 Ranking</h1>
        <p className="text-sm text-muted mt-1">Los mejores apostadores de Viden</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-alt rounded-xl p-1">
        {([["weekly", "Esta semana"], ["alltime", "Histórico"]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "flex-1 py-2 text-sm font-semibold rounded-lg transition-colors",
              tab === id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "weekly" && sinceDate && (
        <p className="text-xs text-muted mb-3 text-center">
          Desde el {sinceDate} — se resetea cada lunes
        </p>
      )}

      {loading ? (
        <div className="text-center text-muted py-20">Cargando ranking…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted">Sin datos todavía.</p>
          <p className="text-xs text-muted mt-1">¡Sé el primero en apostar esta semana!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map(e => (
            <Row key={e.user_id} entry={e} myId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
