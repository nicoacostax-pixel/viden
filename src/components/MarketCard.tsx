"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MarketData, formatVDN, getProbability, getOutcomeLabel } from "@/hooks/usePredictionMarket";
import { Outcome } from "@/config/contracts";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCategoryEmoji(question: string): string {
  const q = question.toLowerCase();
  if (/fútbol|futbol|liga|copa|champions|mundial|gol|basket|nba|tenis|f1|fórmula|formula|béisbol|boxeo|deporte/.test(q)) return "⚽";
  if (/bitcoin|btc|ethereum|eth|cripto|crypto|blockchain|web3|defi|nft|token|altcoin|solana|bnb/.test(q)) return "🪙";
  if (/elección|elecciones|presidente|gobierno|partido|congreso|voto|votación|político|política|senado/.test(q)) return "🗳️";
  if (/oscar|película|música|serie|netflix|celebrity|cantante|actor|actriz|grammy|bienal|arte/.test(q)) return "🎬";
  if (/gaming|esport|league|valorant|cs:|dota|torneo|game|videojuego|twitch|stream/.test(q)) return "🎮";
  return "🔮";
}

function calcTimeLeft(closeTime: bigint): string {
  const diff = Number(closeTime) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Cerrado";
  const d = Math.floor(diff / 86_400);
  const h = Math.floor((diff % 86_400) / 3_600);
  const m = Math.floor((diff % 3_600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function useTimeLeft(closeTime: bigint): string {
  const [label, setLabel] = useState(() => calcTimeLeft(closeTime));

  useEffect(() => {
    const diff = Number(closeTime) - Math.floor(Date.now() / 1000);
    if (diff <= 0) return;
    const id = setInterval(() => setLabel(calcTimeLeft(closeTime)), 1_000);
    return () => clearInterval(id);
  }, [closeTime]);

  return label;
}

// ── MarketCard ────────────────────────────────────────────────────────────────

export function MarketCard({ market }: { market: MarketData }) {
  const { yes, no } = getProbability(market.totalPoolYes, market.totalPoolNo);
  const totalPool   = market.totalPoolYes + market.totalPoolNo;
  const isOpen      = market.outcome === Outcome.OPEN;
  const emoji       = getCategoryEmoji(market.question);
  const closed      = Number(market.closeTime) <= Math.floor(Date.now() / 1000);
  const timeLeft    = useTimeLeft(market.closeTime);

  return (
    <Link href={`/market/${market.marketId}`}>
      <div className="group relative p-4 rounded-xl bg-surface border border-border hover:border-accent/60 hover:shadow-[0_0_0_1px_rgba(79,70,229,0.25)] transition-all duration-200 cursor-pointer h-full flex flex-col gap-3">

        {/* Top row: emoji + status badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl leading-none select-none">{emoji}</span>
          {!isOpen && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface-alt text-muted border border-border">
              {getOutcomeLabel(market.outcome)}
            </span>
          )}
        </div>

        {/* Question + big probability */}
        <div className="flex items-start justify-between gap-3 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-accent-light transition-colors line-clamp-3">
            {market.question}
          </h3>
          <div className="shrink-0 text-right">
            <span className={`text-2xl font-black tabular-nums ${yes >= 50 ? "text-success" : "text-danger"}`}>
              {yes}%
            </span>
            <div className="text-[10px] text-muted leading-none mt-0.5">SÍ</div>
          </div>
        </div>

        {/* Pool bar */}
        <div>
          <div className="h-1.5 rounded-full bg-danger/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-300"
              style={{ width: `${yes}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-success font-medium">SÍ {yes}%</span>
            <span className="text-[11px] text-danger font-medium">NO {no}%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="text-[11px] text-muted">
            Vol: <span className="text-foreground font-medium">{formatVDN(totalPool)} VDN</span>
          </span>
          {isOpen && !closed && (
            <span className="text-[11px] text-warning font-medium">
              ⏱ {timeLeft}
            </span>
          )}
          {closed && isOpen && (
            <span className="text-[11px] text-muted">Cerrado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
