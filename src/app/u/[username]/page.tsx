"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Profile {
  username: string;
  created_at: string;
  streak_days: number;
  win_rate: number | null;
  total_bets: number;
  total_invested: number;
  positions: { market_id: number; side: string; shares: number; cost_basis: number; question: string }[];
  recent_bets: { market_id: number; side: string; amount_vdn_gross: number; shares: number; is_sell: number; created_at: string; question: string }[];
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border text-center">
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/users/${username}/profile`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setProfile(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="text-center text-muted py-20">Cargando perfil…</div>;
  if (notFound || !profile) return (
    <div className="text-center py-20">
      <p className="text-muted text-lg mb-3">Usuario no encontrado</p>
      <Link href="/" className="text-accent-light underline text-sm">← Volver al inicio</Link>
    </div>
  );

  const joined = new Date(profile.created_at).toLocaleDateString("es", { year: "numeric", month: "long" });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-2xl font-black shrink-0">
          {profile.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">@{profile.username}</h1>
          <p className="text-sm text-muted mt-0.5">Miembro desde {joined}</p>
          {profile.streak_days > 0 && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
              🔥 {profile.streak_days} días de racha
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Win rate"
          value={profile.win_rate !== null ? `${profile.win_rate}%` : "—"}
          sub={profile.total_bets > 0 ? `${profile.total_bets} apuestas` : undefined}
        />
        <Stat
          label="Total invertido"
          value={profile.total_invested > 0 ? `${profile.total_invested.toLocaleString("es")}` : "—"}
          sub="VDN"
        />
        <Stat
          label="Racha"
          value={profile.streak_days > 0 ? `${profile.streak_days}🔥` : "—"}
          sub="días"
        />
      </div>

      {/* Posiciones activas */}
      {profile.positions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Posiciones activas</h2>
          <div className="space-y-2">
            {profile.positions.map(p => (
              <Link key={`${p.market_id}-${p.side}`} href={`/market/${p.market_id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/40 transition-colors">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  p.side === "yes" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                }`}>
                  {p.side === "yes" ? "SÍ" : "NO"}
                </span>
                <span className="flex-1 text-sm text-foreground line-clamp-1">{p.question}</span>
                <span className="text-xs text-muted shrink-0">{p.shares.toFixed(1)} sh</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Apuestas recientes */}
      {profile.recent_bets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Actividad reciente</h2>
          <div className="space-y-1.5">
            {profile.recent_bets.map((b, i) => (
              <Link key={i} href={`/market/${b.market_id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors">
                <span className="text-base shrink-0">{b.is_sell ? "🔴" : b.side === "yes" ? "🟢" : "🔵"}</span>
                <span className="flex-1 text-sm text-foreground line-clamp-1">{b.question}</span>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-foreground">{Math.round(b.amount_vdn_gross)} VDN</div>
                  <div className={`text-[10px] font-bold ${b.side === "yes" ? "text-success" : "text-danger"}`}>
                    {b.is_sell ? "VENTA" : b.side === "yes" ? "SÍ" : "NO"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {profile.total_bets === 0 && (
        <div className="text-center py-10 text-muted text-sm">
          Este usuario aún no ha hecho apuestas.
        </div>
      )}
    </div>
  );
}
