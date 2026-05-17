"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, ReferenceLine, ReferenceDot, Tooltip,
} from "recharts";

const API      = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const FETCH_MS = 2_000;   // real price fetch interval
const TICK_MS  = 250;     // interpolation tick (8 per fetch cycle)
const MAX_PTS  = 200;

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

// Pulsing live dot rendered at the tip of the price line
function LiveDot({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#F59E0B" />
      <circle cx={cx} cy={cy} r={9} fill="#F59E0B" fillOpacity={0.35}>
        <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

interface Props { targetPrice: number; closeTime: number; marketStatus: string }

export function BtcLiveChart({ targetPrice, closeTime, marketStatus }: Props) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const countdown = useCountdown(closeTime);

  // Refs for interpolation — no re-render on write
  const prevPriceRef    = useRef<number | null>(null);
  const curPriceRef     = useRef<number | null>(null);
  const lastFetchTsRef  = useRef<number>(0);

  const isOpen = marketStatus === "OPEN";

  // ── Real fetch every 2s ──────────────────────────────────────────────────────
  const fetchPrice = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/btc/price`);
      const data = await res.json();
      const price = data.price as number;
      if (!price || isNaN(price)) return;
      prevPriceRef.current   = curPriceRef.current;
      curPriceRef.current    = price;
      lastFetchTsRef.current = Date.now();
      setCurrent(price);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPrice();
    if (!isOpen) return;

    const fetchId = setInterval(fetchPrice, FETCH_MS);

    // ── Interpolation tick every 250ms ─────────────────────────────────────────
    // Smoothly advance from prevPrice → curPrice within each 2s fetch window.
    // Between windows the price is held at curPrice (flat line for <250ms max).
    const tickId = setInterval(() => {
      const cur  = curPriceRef.current;
      const prev = prevPriceRef.current;
      if (cur === null) return;

      const now     = Date.now();
      const elapsed = now - lastFetchTsRef.current;
      // After one full cycle without new data, just hold the last price
      const progress = Math.min(elapsed / FETCH_MS, 1);

      const displayPrice = (prev !== null && progress <= 1)
        ? prev + (cur - prev) * progress
        : cur;

      setPoints(pts => {
        const next = [...pts, { ts: now, price: +displayPrice.toFixed(2) }];
        return next.length > MAX_PTS ? next.slice(-MAX_PTS) : next;
      });
    }, TICK_MS);

    return () => { clearInterval(fetchId); clearInterval(tickId); };
  }, [isOpen, fetchPrice]);

  const aboveTarget = current !== null && targetPrice > 0 && current >= targetPrice;
  const resultColor = aboveTarget ? "#10B981" : "#EF4444";

  // Stable Y domain — only depends on the actual price range, not interpolated jitter
  const domainRef = useRef<[number, number]>([0, 0]);
  if (current !== null) {
    const base = targetPrice > 0 ? targetPrice : current;
    const lo = Math.min(current, base) - 150;
    const hi = Math.max(current, base) + 150;
    // Expand domain, never shrink mid-session (prevents axis jumping)
    domainRef.current = [
      Math.min(domainRef.current[0] || lo, lo),
      Math.max(domainRef.current[1] || hi, hi),
    ];
  }
  const [yMin, yMax] = domainRef.current[1] > 0
    ? domainRef.current
    : [targetPrice - 200, targetPrice + 200];

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
            <>
              <div className="text-xs text-muted">Cierra en</div>
              <div className="text-lg font-mono font-bold tabular-nums">{countdown}</div>
            </>
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
          <div className="text-3xl font-black tabular-nums transition-all duration-300"
               style={{ color: isOpen ? "inherit" : resultColor }}>
            {current !== null
              ? `$${current.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </div>
          <div className="text-xs text-muted mt-0.5">Precio actual</div>
        </div>
        {targetPrice > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-warning tabular-nums">
              ${targetPrice.toLocaleString("en")}
            </div>
            <div className="text-xs text-muted">Meta (SÍ)</div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-[180px]">
        {points.length < 3 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            Cargando datos…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
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
                domain={[Math.floor(yMin), Math.ceil(yMax)]}
                tickFormatter={v => `$${((v as number) / 1000).toFixed(1)}k`}
                tick={{ fill: "#9CA3AF", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickCount={5}
              />
              <Tooltip
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return [`$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "BTC"];
                }}
                labelFormatter={ts => fmtTime(ts as number)}
                contentStyle={{
                  background: "var(--color-surface, #1a1a2e)",
                  border: "1px solid var(--color-border, #333)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {targetPrice > 0 && (
                <ReferenceLine
                  y={targetPrice}
                  stroke="#F59E0B"
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  label={{
                    value: `Meta`,
                    position: "insideTopLeft",
                    fontSize: 9,
                    fill: "#F59E0B",
                    offset: 4,
                  }}
                />
              )}
              {/* Pulsing dot at the tip of the line */}
              {points.length > 0 && isOpen && (() => {
                const last = points[points.length - 1];
                return (
                  <ReferenceDot
                    x={last.ts}
                    y={last.price}
                    r={0}
                    shape={(p: { cx?: number; cy?: number }) => <LiveDot cx={p.cx} cy={p.cy} />}
                  />
                );
              })()}
              <Area
                type="monotoneX"
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

      <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-2">
        <span>SÍ: BTC supera la meta</span>
        <span>NO: BTC se queda debajo</span>
      </div>
    </div>
  );
}
