"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const REWARDS = [10, 15, 20, 30, 50, 75, 100];

interface StreakInfo {
  streak_days: number;
  claimed_today: boolean;
  reward_today: number;
  next_reward: number;
}

export function DailyStreak() {
  const { token, isLoggedIn, refreshBalance } = useAuth();
  const [info, setInfo]       = useState<StreakInfo | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed]   = useState(false);
  const [earned, setEarned]     = useState(0);

  useEffect(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API}/api/users/streak`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setInfo)
      .catch(() => {});
  }, [token, isLoggedIn]);

  async function handleClaim() {
    if (!token || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API}/api/users/claim-daily`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEarned(data.vdn_received);
        setClaimed(true);
        setInfo(prev => prev ? { ...prev, claimed_today: true, streak_days: data.streak_days } : prev);
        refreshBalance();
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: data.message, type: "success" },
        }));
      }
    } catch { /* silent */ }
    finally { setClaiming(false); }
  }

  if (!isLoggedIn || !info) return null;

  const streak   = info.streak_days;
  const isClaimed = info.claimed_today || claimed;

  return (
    <div className={`rounded-2xl border p-5 ${isClaimed ? "bg-surface border-border" : "bg-gradient-to-br from-warning/5 to-orange-500/5 border-warning/30"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="font-bold text-foreground">Racha diaria</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {isClaimed ? `Día ${streak} completado · vuelve mañana` : "¡Recoge tu recompensa de hoy!"}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black tabular-nums ${isClaimed ? "text-muted" : "text-warning"}`}>
            {streak}🔥
          </div>
          <div className="text-[10px] text-muted">días seguidos</div>
        </div>
      </div>

      {/* Day pills */}
      <div className="flex gap-1.5 mb-4">
        {REWARDS.map((r, i) => {
          const dayNum = i + 1;
          const done   = dayNum < streak || (dayNum === streak && isClaimed);
          const today  = dayNum === streak + (isClaimed ? 0 : 0) && !isClaimed
            ? dayNum === (streak === 0 ? 1 : streak + 1) || (streak === 0 && dayNum === 1)
            : dayNum === streak && !isClaimed;
          const isToday = !isClaimed && dayNum === streak + 1;

          return (
            <div key={dayNum} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1.5 rounded-full ${done ? "bg-warning" : isToday ? "bg-warning/40" : "bg-border"}`} />
              <span className={`text-[9px] font-bold ${done ? "text-warning" : isToday ? "text-warning/70" : "text-muted/40"}`}>
                {r}
              </span>
              <span className={`text-[8px] ${done || isToday ? "text-muted" : "text-muted/30"}`}>d{dayNum}</span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {isClaimed ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-alt border border-border">
          <span className="text-sm text-muted">Próxima recompensa</span>
          <span className="text-sm font-bold text-warning">+{info.next_reward} VDN mañana</span>
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-3 rounded-xl font-bold text-sm bg-warning hover:bg-yellow-400 text-black transition-colors disabled:opacity-50"
        >
          {claiming ? "Reclamando…" : `Reclamar +${info.reward_today} VDN`}
        </button>
      )}
    </div>
  );
}
