"use client";

import { useEffect, useState } from "react";
import { type ApiMarket } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function teamInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
}

function matchStatusLabel(status: string | null, minute: number | null) {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "FINISHED" || s === "FT" || s === "MATCH FINISHED") return "Final";
  if (s === "IN_PLAY" || s === "LIVE") return minute ? `${minute}'` : "EN VIVO";
  if (s === "PAUSED" || s === "HT") return "ET";
  if (s === "SCHEDULED" || s === "TIMED") return null;
  return status;
}

interface Props { market: ApiMarket }

export function FootballScoreWidget({ market }: Props) {
  const [data, setData] = useState({
    homeScore: market.liveScoreHome,
    awayScore: market.liveScoreAway,
    minute:    market.matchMinute,
    status:    market.matchStatus,
  });

  const isLive = data.status?.toUpperCase() === "IN_PLAY" || data.status?.toUpperCase() === "LIVE";
  const isFinished = data.status?.toUpperCase() === "FINISHED"
    || data.status?.toUpperCase() === "FT"
    || data.status?.toUpperCase() === "MATCH FINISHED";
  const hasScore = data.homeScore !== null && data.awayScore !== null;
  const statusLabel = matchStatusLabel(data.status, data.minute);

  // Re-fetch live market data every 60s
  useEffect(() => {
    if (isFinished || market.status !== "OPEN") return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/markets/${market.marketId}`);
        const json = await res.json();
        const m    = json.market;
        if (!m) return;
        setData({
          homeScore: m.liveScoreHome,
          awayScore: m.liveScoreAway,
          minute:    m.matchMinute,
          status:    m.matchStatus,
        });
      } catch { /* ignore */ }
    }, 60_000);
    return () => clearInterval(id);
  }, [market.marketId, market.status, isFinished]);

  return (
    <div className="rounded-xl bg-surface border border-border p-4">
      {/* Competition */}
      {market.competitionName && (
        <div className="text-xs text-muted text-center mb-3 font-medium tracking-wide uppercase">
          {market.competitionName}
        </div>
      )}

      {/* Score row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-border flex items-center justify-center overflow-hidden">
            {market.homeCrest
              ? <img src={market.homeCrest} alt={market.homeTeam ?? ""} className="w-10 h-10 object-contain" />
              : <span className="text-sm font-bold text-foreground">{teamInitials(market.homeTeam!)}</span>
            }
          </div>
          <span className="text-sm font-semibold text-center leading-tight">{market.homeTeam}</span>
        </div>

        {/* Score + status */}
        <div className="flex flex-col items-center gap-1 min-w-[90px]">
          {hasScore ? (
            <div className="text-4xl font-black tabular-nums tracking-tight">
              {data.homeScore} <span className="text-muted font-light">–</span> {data.awayScore}
            </div>
          ) : (
            <div className="text-2xl font-bold text-muted">vs</div>
          )}
          {statusLabel && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${isLive ? "text-danger" : "text-muted"}`}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse inline-block" />}
              {statusLabel}
            </div>
          )}
          {!hasScore && market.kickoffTs && (
            <div className="text-xs text-muted">
              {new Date(market.kickoffTs * 1000).toLocaleString("es", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-border flex items-center justify-center overflow-hidden">
            {market.awayCrest
              ? <img src={market.awayCrest} alt={market.awayTeam ?? ""} className="w-10 h-10 object-contain" />
              : <span className="text-sm font-bold text-foreground">{teamInitials(market.awayTeam!)}</span>
            }
          </div>
          <span className="text-sm font-semibold text-center leading-tight">{market.awayTeam}</span>
        </div>
      </div>

      {/* Resolution note */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted text-center">
        {isFinished
          ? `Partido finalizado · ${data.homeScore! > data.awayScore! ? market.homeTeam + " ganó" : data.homeScore === data.awayScore ? "Empate" : market.awayTeam + " ganó"}`
          : "Local · Empate · Visitante — elige el resultado"}
      </div>
    </div>
  );
}
