"use client";

import Link from "next/link";
import { MarketData, formatVDN, getProbability, getOutcomeLabel } from "@/hooks/usePredictionMarket";
import { Outcome } from "@/config/contracts";
import type { ApiMarket } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";

const LMSR_B = 2000 / Math.LN2;
const LMSR_INITIAL = 2000;

function lmsrProb(sharesYes: number, sharesNo: number) {
  const ry = sharesYes / LMSR_B, rn = sharesNo / LMSR_B;
  const mx = Math.max(ry, rn);
  const ey = Math.exp(ry - mx), en = Math.exp(rn - mx);
  const s = ey + en;
  return { yes: Math.round(ey / s * 100), no: Math.round(en / s * 100) };
}

function lmsrPoolTotal(sharesYes: number, sharesNo: number): number {
  const ry = sharesYes / LMSR_B, rn = sharesNo / LMSR_B;
  const mx = Math.max(ry, rn);
  return LMSR_B * (mx + Math.log(Math.exp(ry - mx) + Math.exp(rn - mx)));
}

export function getCategoryEmoji(question: string, category?: string | null): string {
  const cat = (category ?? "").toLowerCase();
  if (cat === "deportes") return "⚽";
  if (cat === "cripto") return "🪙";
  if (cat === "política" || cat === "politica") return "🗳️";
  if (cat === "cultura" || cat === "entretenimiento") return "🎬";
  if (cat === "esports") return "🎮";
  const q = question.toLowerCase();
  if (/fútbol|futbol|liga|copa|champions|mundial|gol|basket|nba|tenis|f1|fórmula|formula|béisbol|boxeo|deporte|ganará|partido/.test(q)) return "⚽";
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
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
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

export function MarketCard({ market, publicId, apiMarket }: {
  market: MarketData;
  publicId?: string | null;
  apiMarket?: ApiMarket;
}) {
  const { toggle, has } = useWatchlist();
  const watched = has(market.marketId);
  const chainProb = getProbability(market.totalPoolYes, market.totalPoolNo);
  const lmsr = apiMarket && (apiMarket.sharesYes > 0 || apiMarket.sharesNo > 0)
    ? lmsrProb(apiMarket.sharesYes, apiMarket.sharesNo)
    : null;
  const { yes, no } = lmsr ?? chainProb;
  const isOpen    = market.outcome === Outcome.OPEN;
  const emoji     = getCategoryEmoji(market.question, apiMarket?.category);

  // Pool total: use LMSR costFn - initial liquidity to get traded volume
  const custodialVol = apiMarket
    ? Math.max(0, lmsrPoolTotal(apiMarket.sharesYes ?? 0, apiMarket.sharesNo ?? 0) - LMSR_INITIAL)
    : 0;
  const onchainVol = market.totalPoolYes + market.totalPoolNo;
  const showVol    = custodialVol > 0 ? custodialVol : Number(onchainVol);
  const closed    = Number(market.closeTime) <= Math.floor(Date.now() / 1000);
  const timeLeft  = useTimeLeft(market.closeTime);

  return (
    <a href={`/market/${market.marketId}`} className="market-card-link">
      <div className="market-card-inner group relative p-4 rounded-xl bg-surface border border-border h-full flex flex-col gap-3">

        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl leading-none select-none">{emoji}</span>
          {!isOpen && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface-alt text-muted border border-border">
              {getOutcomeLabel(market.outcome)}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-accent-light line-clamp-3" style={{ transition: 'color 200ms' }}>
            {market.question}
          </h3>
          <div className="shrink-0 text-right">
            <span className={`text-2xl font-black tabular-nums ${yes >= 50 ? "text-success" : "text-danger"}`}>
              {yes}%
            </span>
            <div className="text-[10px] text-muted leading-none mt-0.5">SÍ</div>
          </div>
        </div>

        <div>
          <div className="h-1.5 rounded-full bg-danger/30 overflow-hidden">
            <div className="h-full rounded-full bg-success" style={{ width: `${yes}%`, transition: 'width 300ms' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-success font-medium">SÍ {yes}%</span>
            <span className="text-[11px] text-danger font-medium">NO {no}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="text-[11px] text-muted">
            Vol: <span className="text-foreground font-medium">{showVol > 0 ? `${Math.round(showVol).toLocaleString("es")} VDN` : "—"}</span>
          </span>
          <div className="flex items-center gap-2">
            {publicId && (
              <span className="text-[10px] text-muted/50 font-mono tabular-nums">{publicId}</span>
            )}
            {isOpen && !closed && (
              <span className="text-[11px] text-warning font-medium">⏱ {timeLeft}</span>
            )}
            {closed && isOpen && (
              <span className="text-[11px] text-muted">Cerrado</span>
            )}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(market.marketId); }}
              className={`text-base leading-none transition-colors ${watched ? "text-warning" : "text-muted/40 hover:text-warning"}`}
              aria-label="Guardar"
            >
              {watched ? "★" : "☆"}
            </button>
          </div>
        </div>
      </div>
    </a>
  );
}
