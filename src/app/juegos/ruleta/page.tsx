"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SpinMarket = {
  market_id: number;
  question: string;
  close_time: number;
  category: string | null;
  home_team: string | null;
  away_team: string | null;
};

type Spin = {
  id: number;
  market_id: number;
  question: string;
  prediction: "yes" | "no" | null;
  result: "win" | "loss" | "pending";
  vdn_earned: number;
  created_at: number;
};

type Status = {
  spinsToday: number;
  spinsLeft: number;
  spinsPerDay: number;
  vdnPerWin: number;
  pending: Spin[];
  history: Spin[];
};

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Spin animation ────────────────────────────────────────────────────────────

const WHEEL_EMOJIS = ["🎯","⚽","₿","🗳️","🎬","🎮","📈","🏆","🌍","💰"];

function SpinWheel({ spinning }: { spinning: boolean }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setFrame(f => (f + 1) % WHEEL_EMOJIS.length), 80);
    return () => clearInterval(id);
  }, [spinning]);

  return (
    <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center text-5xl transition-all duration-300 ${
      spinning
        ? "border-accent animate-spin bg-accent/10 shadow-lg shadow-accent/30"
        : "border-border bg-surface"
    }`}>
      {spinning ? WHEEL_EMOJIS[frame] : "🎯"}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Phase = "idle" | "spinning" | "predict" | "done";

export default function RuletaPage() {
  const { token, isLoggedIn, isLoading: authLoading } = useAuth();
  const [status, setStatus]     = useState<Status | null>(null);
  const [loading, setLoading]   = useState(true);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [spinId, setSpinId]     = useState<number | null>(null);
  const [market, setMarket]     = useState<SpinMarket | null>(null);
  const [picked, setPicked]     = useState<"yes" | "no" | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/game/roulette/status`, { headers: authHeaders(token) });
      const data = await res.json();
      setStatus(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) loadStatus(); }, [token, loadStatus]);

  const handleSpin = async () => {
    if (!token || !status || status.spinsLeft <= 0) return;
    setError(null);
    setPhase("spinning");
    setMarket(null);
    setPicked(null);

    // Spin for 2.5s then reveal
    await new Promise(r => setTimeout(r, 2500));

    try {
      const res  = await fetch(`${API}/api/game/roulette/spin`, { method: "POST", headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Error al girar");
        setPhase("idle");
        return;
      }
      setSpinId(data.spinId);
      setMarket(data.market);
      setPhase("predict");
    } catch {
      setError("Error de conexión");
      setPhase("idle");
    }
  };

  const handlePick = async (prediction: "yes" | "no") => {
    if (!token || !spinId) return;
    setPicked(prediction);
    try {
      await fetch(`${API}/api/game/roulette/pick`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ spinId, prediction }),
      });
    } catch { /* ignore */ }
    setPhase("done");
    loadStatus();
  };

  if (authLoading || (isLoggedIn && loading)) {
    return <div className="text-center text-muted py-32">Cargando…</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div className="text-6xl">🎯</div>
        <h1 className="text-2xl font-bold">Ruleta de Predicciones</h1>
        <p className="text-muted max-w-sm">Inicia sesión para girar y ganar VDN.</p>
        <Link href="/login" className="text-accent-light underline text-sm">Entrar →</Link>
      </div>
    );
  }

  const spinning = phase === "spinning";

  return (
    <div className="max-w-sm mx-auto py-8 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Ruleta de Predicciones</h1>
        <p className="text-sm text-muted mt-1">Gira · predice SÍ o NO · gana {status?.vdnPerWin ?? 15} VDN si aciertas</p>
      </div>

      {/* Wheel */}
      <SpinWheel spinning={spinning} />

      {/* Spins counter */}
      {status && (
        <div className="flex items-center gap-2">
          {Array.from({ length: status.spinsPerDay }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full border transition-colors ${
              i < (status.spinsPerDay - status.spinsLeft) ? "bg-muted border-muted" : "bg-accent border-accent"
            }`} />
          ))}
          <span className="text-xs text-muted ml-1">{status.spinsLeft} giro{status.spinsLeft !== 1 ? "s" : ""} disponible{status.spinsLeft !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Market card (after spin) */}
      {phase === "predict" && market && (
        <div className="w-full rounded-2xl bg-surface border border-accent/30 p-5 flex flex-col gap-4 animate-in fade-in duration-300">
          <div>
            {market.category && (
              <span className="text-[10px] font-bold text-accent-light bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full uppercase tracking-wide mb-2 inline-block">
                {market.category}
              </span>
            )}
            <p className="text-base font-semibold text-foreground leading-snug mt-1">{market.question}</p>
            <p className="text-xs text-muted mt-1">
              Cierra: {new Date(market.close_time * 1000).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <p className="text-sm text-center text-muted">¿Qué predices?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePick("yes")}
              className="py-4 rounded-xl bg-success/10 hover:bg-success/20 border border-success/30 text-success font-extrabold text-lg transition-colors"
            >
              SÍ
            </button>
            <button
              onClick={() => handlePick("no")}
              className="py-4 rounded-xl bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-extrabold text-lg transition-colors"
            >
              NO
            </button>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {phase === "done" && market && (
        <div className="w-full rounded-2xl bg-surface border border-success/30 p-5 flex flex-col gap-3 text-center">
          <div className="text-3xl">✅</div>
          <p className="text-sm font-semibold text-foreground">¡Predicción guardada!</p>
          <p className="text-xs text-muted leading-snug">
            Apostaste <span className={`font-bold ${picked === "yes" ? "text-success" : "text-danger"}`}>{picked === "yes" ? "SÍ" : "NO"}</span> en:
            <br />"{market.question}"
          </p>
          <p className="text-xs text-muted">Ganarás {status?.vdnPerWin ?? 15} VDN si aciertas cuando el mercado resuelva.</p>
          {(status?.spinsLeft ?? 0) > 0 && (
            <button onClick={() => { setPhase("idle"); setMarket(null); setSpinId(null); }} className="mt-2 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors">
              Girar de nuevo
            </button>
          )}
        </div>
      )}

      {/* Spin button */}
      {(phase === "idle") && (
        <button
          onClick={handleSpin}
          disabled={!status || status.spinsLeft <= 0}
          className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-lg transition-colors shadow-lg shadow-accent/20"
        >
          {!status || status.spinsLeft <= 0 ? "Sin giros — vuelve mañana" : "¡Girar!"}
        </button>
      )}

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      {/* Pending predictions */}
      {status && status.pending.length > 0 && (
        <div className="w-full">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Predicciones activas</h3>
          <div className="flex flex-col gap-2">
            {status.pending.map(s => (
              <div key={s.id} className="rounded-xl bg-surface border border-border px-4 py-3 flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${s.prediction === "yes" ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                  {s.prediction === "yes" ? "SÍ" : "NO"}
                </span>
                <p className="text-xs text-muted line-clamp-2 flex-1">{s.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {status && status.history.length > 0 && (
        <div className="w-full">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Historial</h3>
          <div className="flex flex-col gap-2">
            {status.history.map(s => (
              <div key={s.id} className="rounded-xl bg-surface border border-border px-4 py-3 flex items-center gap-3">
                <span className="text-lg shrink-0">{s.result === "win" ? "✅" : "❌"}</span>
                <p className="text-xs text-muted line-clamp-1 flex-1">{s.question}</p>
                {s.result === "win" && <span className="text-xs font-bold text-success shrink-0">+{s.vdn_earned} VDN</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
