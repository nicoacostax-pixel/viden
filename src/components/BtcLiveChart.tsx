"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Tooltip,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const POLL_MS = 2_000;
const MAX_POINTS = 150;

interface PricePoint { ts: number; price: number }

function useCountdown(closeTime: number) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = closeTime - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setLabel("¡Cerrado!"); return; }
      const m = Math.floor(diff / 60), s = diff % 60;
      setLabel(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closeTime]);
  return label;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

interface Props {
  targetPrice: number;
  closeTime: number;
  marketStatus: string;
}

export function BtcLiveChart({ targetPrice, closeTime, marketStatus }: Props) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const countdown = useCountdown(closeTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOpen = marketStatus === "OPEN";

  useEffect(() => {
    async function poll() {
      try {
        const res  = await fetch(`${API}/api/btc/price`);
        const data = await res.json();
        const price = data.price as number;
        const ts    = Date.now();
        setCurrent(price);
        setPoints(prev => {
          const next = [...prev, { ts, price }];
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
        });
      } catch { /* ignore */ }
    }

    poll();
    if (isOpen) {
      intervalRef.current = setInterval(poll, POLL_MS);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isOpen]);

  const aboveTarget = current !== null && current >= targetPrice;
  const resultColor = aboveTarget ? "#10B981" : "#EF4444";

  // Dynamic Y-axis domain around the price range
  const prices = points.map(p => p.price);
  const min = prices.length ? Math.min(...prices, targetPrice) - 50 : targetPrice - 200;
  const max = prices.length ? Math.max(...prices, targetPrice) + 50 : targetPrice + 200;

  return (
    <div className="rounded-xl bg-background border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">₿ BTC/USD</span>
          {isOpen && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
              EN VIVO
            </span>
          )}
        </div>
        <div className="text-right">
          {isOpen ? (
            <div>
              <div className="text-xs text-muted">Cierra en</div>
              <div className="text-lg font-mono font-bold tabular-nums">{countdown}</div>
            </div>
          ) : (
            <div className="text-sm font-semibold" style={{ color: resultColor }}>
              {aboveTarget ? "SÍ ganó" : "NO ganó"}
            </div>
          )}
        </div>
      </div>

      {/* Price & target */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black tabular-nums" style={{ color: isOpen ? "inherit" : resultColor }}>
            {current !== null
              ? `$${current.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </div>
          <div className="text-xs text-muted mt-0.5">Precio actual</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-warning tabular-nums">
            ${targetPrice.toLocaleString("en")}
          </div>
          <div className="text-xs text-muted">Meta (SÍ)</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[180px]">
        {points.length < 2 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            Cargando datos…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 44, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtTime}
                tick={{ fill: "#9CA3AF", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickCount={4}
              />
              <YAxis
                orientation="right"
                domain={[Math.floor(min), Math.ceil(max)]}
                tickFormatter={v => `$${(v as number).toLocaleString("en")}`}
                tick={{ fill: "#9CA3AF", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={72}
                tickCount={5}
              />
              <Tooltip
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return [`$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "BTC"];
                }}
                labelFormatter={ts => fmtTime(ts as number)}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {/* Target price reference line */}
              {targetPrice > 0 && (
                <ReferenceLine
                  y={targetPrice}
                  stroke="#F59E0B"
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  label={{
                    value: `Meta $${targetPrice.toLocaleString("en")}`,
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "#F59E0B",
                    offset: 4,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#btcGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status strip */}
      <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-2">
        <span>Apuesta SÍ si BTC supera la meta</span>
        <span>Apuesta NO si BTC se queda debajo</span>
      </div>
    </div>
  );
}
