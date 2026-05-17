"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAccount } from "wagmi";
import {
  fetchGameStatus,
  startGame,
  endGame,
  type GameStatus,
} from "@/lib/gameApi";

const GRID  = 20;
const CELL  = 20;
const SIZE  = GRID * CELL;

const SPEEDS = [180, 160, 140, 120, 100, 85];
const SPEED_STEP = 5;

type Dir = { x: number; y: number };
type Pt  = { x: number; y: number };

function fmtSecs(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function randomCell(snake: Pt[]): Pt {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
  let p: Pt;
  do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
  while (occupied.has(`${p.x},${p.y}`));
  return p;
}

function useLifeCountdown(nextLifeIn: number | null) {
  const [secs, setSecs] = useState<number | null>(nextLifeIn);
  useEffect(() => {
    setSecs(nextLifeIn);
    if (nextLifeIn === null) return;
    const id = setInterval(() => setSecs(p => (p !== null && p > 1 ? p - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [nextLifeIn]);
  return secs;
}

function LivesRow({ lives, max }: { lives: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: Math.min(max, 12) }).map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full border transition-colors duration-200 ${i < lives ? "bg-danger border-danger" : "bg-surface border-border opacity-40"}`} />
      ))}
    </div>
  );
}

type SnakeCanvasProps = { onGameOver: (score: number, durationSecs: number) => void };

function SnakeCanvas({ onGameOver }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    snake: [{ x: 10, y: 10 }] as Pt[],
    dir:   { x: 1, y: 0 } as Dir,
    nextDir: { x: 1, y: 0 } as Dir,
    food:  { x: 5, y: 5 } as Pt,
    score: 0, dead: false, startedAt: Date.now(),
  });
  const tickRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRef  = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { snake, food, score } = stateRef.current;
    ctx.fillStyle = "#0F1A12";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
    const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    ctx.beginPath(); ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2); ctx.fillStyle = "#F59E0B"; ctx.fill();
    ctx.fillStyle = "#7C2D12"; ctx.font = `bold ${CELL - 6}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("V", fx, fy + 1);
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#7DAF8D" : "#4C7A58";
      ctx.beginPath(); ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 6 : 3); ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 13px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(`${score} VDN`, 6, 6);
  }, []);

  const scheduleNext = useCallback((speedMs: number) => {
    tickRef.current = setTimeout(() => tick(speedMs), speedMs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = useCallback((speedMs: number) => {
    const s = stateRef.current;
    if (s.dead) return;
    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || s.snake.some(p => p.x === head.x && p.y === head.y)) {
      s.dead = true; draw();
      onGameOver(s.score, Math.round((Date.now() - s.startedAt) / 1000));
      return;
    }
    const ate = head.x === s.food.x && head.y === s.food.y;
    s.snake = [head, ...s.snake];
    if (!ate) s.snake.pop(); else { s.score++; s.food = randomCell(s.snake); }
    draw();
    scheduleNext(SPEEDS[Math.min(Math.floor(s.score / SPEED_STEP), SPEEDS.length - 1)]);
  }, [draw, onGameOver, scheduleNext]);

  const changeDir = useCallback((d: Dir) => {
    const cur = stateRef.current.dir;
    if (d.x === -cur.x && d.y === -cur.y) return;
    stateRef.current.nextDir = d;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: {x:0,y:-1}, w:{x:0,y:-1}, W:{x:0,y:-1}, ArrowDown:{x:0,y:1}, s:{x:0,y:1}, S:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, a:{x:-1,y:0}, A:{x:-1,y:0}, ArrowRight:{x:1,y:0}, d:{x:1,y:0}, D:{x:1,y:0} };
      if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDir]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? {x:1,y:0} : {x:-1,y:0});
    else changeDir(dy > 0 ? {x:0,y:1} : {x:0,y:-1});
  }, [changeDir]);

  useEffect(() => {
    stateRef.current.food = randomCell(stateRef.current.snake);
    draw(); scheduleNext(SPEEDS[0]);
    return () => { if (tickRef.current) clearTimeout(tickRef.current); };
  }, [draw, scheduleNext]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="rounded-xl border border-border touch-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ maxWidth: "min(85vw, 400px)", maxHeight: "min(85vw, 400px)", imageRendering: "pixelated" }} />
      <div className="grid grid-cols-3 gap-2 sm:hidden" style={{ gridTemplateRows: "repeat(3, 60px)" }}>
        {[{label:"▲",dir:{x:0,y:-1},col:"col-start-2 row-start-1"},{label:"◀",dir:{x:-1,y:0},col:"col-start-1 row-start-2"},{label:"▶",dir:{x:1,y:0},col:"col-start-3 row-start-2"},{label:"▼",dir:{x:0,y:1},col:"col-start-2 row-start-3"}].map(({label,dir,col}) => (
          <button key={label} onPointerDown={e=>{e.preventDefault();changeDir(dir);}} className={`${col} w-[60px] h-[60px] rounded-xl bg-surface border border-border text-foreground font-bold text-xl active:bg-accent active:text-white select-none touch-manipulation`}>{label}</button>
        ))}
      </div>
    </div>
  );
}

type PageState = "idle" | "starting" | "playing" | "ending" | "gameover";
type SessionResult = { score: number; vdnEarned: number };

export default function SnakePage() {
  const { address, isConnected } = useAccount();
  const [status, setStatus]       = useState<GameStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [pageErr, setPageErr]     = useState(false);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [result, setResult]       = useState<SessionResult | null>(null);
  const [startErr, setStartErr]   = useState<string | null>(null);
  const nextLifeIn = useLifeCountdown(status?.nextLifeIn ?? null);

  const loadStatus = useCallback(async () => {
    if (!address) return;
    try { const s = await fetchGameStatus(address.toLowerCase()); setStatus(s); setPageErr(false); }
    catch { setPageErr(true); }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected && address) { setLoading(true); loadStatus(); } }, [isConnected, address, loadStatus]);

  const handleStart = useCallback(async () => {
    if (!address || !status) return;
    setStartErr(null); setPageState("starting");
    const res = await startGame(address.toLowerCase());
    if ("error" in res) {
      setStartErr(res.error === "no_lives" ? `Sin vidas — recarga en ${fmtSecs(res.nextLifeIn ?? 0)}` : res.error === "daily_limit" ? "Límite diario alcanzado" : res.error);
      setPageState("idle"); return;
    }
    setSessionId(res.sessionId); setSessionKey(k => k + 1); setPageState("playing");
  }, [address, status]);

  const handleGameOver = useCallback(async (score: number, durationSecs: number) => {
    if (!address || !sessionId) return;
    setPageState("ending");
    const res = await endGame(address.toLowerCase(), sessionId, score, durationSecs);
    if ("error" in res) setResult({ score, vdnEarned: 0 });
    else { setResult({ score, vdnEarned: res.vdnEarned }); setStatus(res.status); }
    setSessionId(null); setPageState("gameover");
  }, [address, sessionId]);

  if (!isConnected) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-6xl">🐍</div>
      <h1 className="text-2xl font-bold">Snake</h1>
      <p className="text-muted max-w-sm">Conecta tu wallet para ganar $VDN jugando Snake.</p>
    </div>
  );
  if (loading) return <div className="text-center text-muted py-32">Cargando…</div>;
  if (pageErr || !status) return <div className="text-center py-32"><p className="text-danger">No se pudo conectar.</p><button onClick={loadStatus} className="text-sm text-accent-light underline mt-2">Reintentar</button></div>;

  const canPlay = (status.lives ?? 0) > 0 && (status.vdnToday ?? 0) < (status.dailyLimit ?? 300);

  if (pageState === "gameover" && result) return (
    <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-8 text-center">
      <h2 className="text-2xl font-bold">Partida terminada</h2>
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="p-4 rounded-xl bg-surface border border-border"><div className="text-xs text-muted mb-1">Monedas</div><div className="text-2xl font-bold">{result.score}</div></div>
        <div className="p-4 rounded-xl bg-surface border border-border"><div className="text-xs text-muted mb-1">VDN ganados</div><div className="text-2xl font-bold text-success">+{result.vdnEarned.toFixed(1)}</div></div>
      </div>
      <div className="w-full p-3 rounded-xl bg-surface border border-border text-sm text-muted flex justify-between"><span>VDN hoy</span><span className="text-foreground font-medium">{(status.vdnToday ?? 0).toFixed(1)} / {status.dailyLimit ?? 300}</span></div>
      <LivesRow lives={status.lives} max={3} />
      {(status.vdnToday ?? 0) >= (status.dailyLimit ?? 300) ? <p className="text-sm text-warning font-medium">Límite diario — vuelve mañana</p>
       : status.lives > 0 ? <button onClick={() => { setResult(null); setPageState("idle"); }} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors">Jugar de nuevo</button>
       : <p className="text-sm text-muted">Próxima vida en <span className="text-foreground font-medium">{nextLifeIn !== null ? fmtSecs(nextLifeIn) : "…"}</span></p>}
    </div>
  );

  if (pageState === "playing") return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-4 py-4">
      <div className="flex items-center justify-between w-full"><LivesRow lives={status.lives} max={3} /><span className="text-sm text-muted">{(status.vdnToday ?? 0).toFixed(1)} / {status.dailyLimit ?? 300} VDN hoy</span></div>
      <SnakeCanvas key={sessionKey} onGameOver={handleGameOver} />
      <p className="text-xs text-muted text-center">← → ↑ ↓ · WASD · desliza · botones</p>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center gap-6 py-4">
      <div className="text-center"><h1 className="text-2xl font-bold">Snake</h1><p className="text-sm text-muted mt-1">Come monedas VDN · evita las paredes y tu cola</p></div>
      <div className="w-full p-4 rounded-xl bg-surface border border-border flex flex-col gap-2">
        <div className="flex items-center justify-between"><span className="text-sm text-muted">Vidas</span><span className="text-sm font-medium">{status.lives} / {status.maxLives} hoy</span></div>
        <LivesRow lives={status.lives} max={3} />
        {status.lives < status.maxLives && nextLifeIn !== null && <p className="text-xs text-muted">Próxima vida en {fmtSecs(nextLifeIn)}</p>}
        {status.lives >= status.maxLives && <p className="text-xs text-success">Vidas al máximo</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="p-4 rounded-xl bg-surface border border-border text-center"><div className="text-xs text-muted mb-1">VDN hoy</div><div className="text-lg font-bold text-accent-light">{(status.vdnToday ?? 0).toFixed(1)}</div><div className="text-[11px] text-muted">/ {status.dailyLimit} límite</div></div>
        <div className="p-4 rounded-xl bg-surface border border-border text-center"><div className="text-xs text-muted mb-1">En vesting</div><div className={`text-lg font-bold ${(status.vdnVesting ?? 0) > 0 ? "text-warning" : "text-muted"}`}>{(status.vdnVesting ?? 0).toFixed(1)}</div></div>
      </div>
      {startErr && <p className="text-sm text-danger text-center">{startErr}</p>}
      {status.vdnToday >= status.dailyLimit
        ? <p className="text-sm text-warning font-medium text-center">Límite diario — vuelve mañana</p>
        : <button onClick={handleStart} disabled={!canPlay || pageState === "starting"} className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-sm transition-colors">{pageState === "starting" ? "Iniciando…" : canPlay ? "Jugar" : "Sin vidas"}</button>}
      <div className="w-full p-4 rounded-xl bg-surface border border-border text-xs text-muted space-y-1.5">
        <div className="flex justify-between"><span>VDN por moneda</span><span className="text-foreground font-medium">1 VDN</span></div>
        <div className="flex justify-between"><span>Recarga de vidas</span><span className="text-foreground font-medium">1 cada 20 min</span></div>
        <div className="flex justify-between"><span>Límite diario</span><span className="text-foreground font-medium">300 VDN</span></div>
        <div className="flex justify-between"><span>Vesting</span><span className="text-foreground font-medium">7 días</span></div>
      </div>
    </div>
  );
}
