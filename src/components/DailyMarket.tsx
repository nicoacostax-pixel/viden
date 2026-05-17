"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ApiMarket } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useCountdown(endTs: number) {
  const [left, setLeft] = useState(Math.max(0, endTs - Math.floor(Date.now() / 1000)));

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => {
      setLeft(v => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [left]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return { h, m, s, done: left === 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function Separator() {
  return <span className="text-xl font-bold text-muted pb-3">:</span>;
}

const LMSR_B = 2000 / Math.LN2;
function lmsrProb(sharesYes: number, sharesNo: number) {
  const ry = sharesYes / LMSR_B;
  const rn = sharesNo  / LMSR_B;
  const mx = Math.max(ry, rn);
  const ey = Math.exp(ry - mx);
  const en = Math.exp(rn - mx);
  const sum = ey + en;
  return Math.round((ey / sum) * 100);
}

export function DailyMarket() {
  const [market, setMarket] = useState<ApiMarket | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/markets/featured`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setMarket(d.market); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const countdown = useCountdown(market?.closeTime ?? 0);

  if (!loaded || !market) return null;

  const probYes = lmsrProb(market.sharesYes ?? 0, market.sharesNo ?? 0);
  const multSi  = probYes > 0 ? (100 / probYes).toFixed(2) : "–";
  const emoji   = market.emoji ?? "⭐";

  return (
    <Link href={`/market/${market.marketId}`}>
      <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-surface to-surface mb-6 hover:border-accent/60 transition-colors cursor-pointer group">
        {/* Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-accent/20 border border-accent/30 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-bold text-accent-light uppercase tracking-wider">Mercado del día</span>
        </div>

        <div className="px-5 pt-14 pb-5 sm:px-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug group-hover:text-accent-light transition-colors line-clamp-2">
                {market.question}
              </h2>
              {market.category && (
                <span className="mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent-light border border-accent/20 uppercase tracking-wider">
                  {market.category}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {/* Probability */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">SÍ</p>
                <p className="text-xl font-extrabold text-success">{probYes}%</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Multiplica</p>
                <p className="text-xl font-extrabold text-accent-light">{multSi}x</p>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex-1 flex justify-end">
              <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] text-muted uppercase tracking-wider">Cierra en</p>
                {countdown.done ? (
                  <span className="text-sm font-bold text-danger">Cerrado</span>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <CountdownUnit value={countdown.h} label="h" />
                    <Separator />
                    <CountdownUnit value={countdown.m} label="m" />
                    <Separator />
                    <CountdownUnit value={countdown.s} label="s" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 rounded-full bg-surface-alt overflow-hidden h-2">
            <div
              className="h-full bg-gradient-to-r from-success to-accent transition-all duration-500"
              style={{ width: `${probYes}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-success font-medium">SÍ {probYes}%</span>
            <span className="text-[10px] text-danger font-medium">NO {100 - probYes}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
