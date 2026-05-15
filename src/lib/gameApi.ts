const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type GameStatus = {
  lives: number;
  maxLives: number;
  nextLifeIn: number | null;   // seconds until next life, null if full
  lifeRestoreSecs: number;
  livesUsedToday: number;
  vdnToday: number;
  dailyLimit: number;
  vdnVesting: number;
  vestingUnlockTs: number;
  hasActiveSession: boolean;
};

export type StartResult =
  | { sessionId: string; livesLeft: number }
  | { error: string; nextLifeIn?: number; livesUsedToday?: number };

export type EndResult =
  | { vdnEarned: number; vdnToday: number; dailyLimit: number; livesLeft: number; status: GameStatus }
  | { error: string };

export async function fetchGameStatus(wallet: string): Promise<GameStatus> {
  const res = await fetch(`${API}/api/game/status/${wallet}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function startGame(wallet: string): Promise<StartResult> {
  const res = await fetch(`${API}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet }),
    cache: "no-store",
  });
  return res.json();
}

export async function endGame(
  wallet: string,
  sessionId: string,
  score: number,
  durationSecs: number
): Promise<EndResult> {
  const res = await fetch(`${API}/api/game/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, sessionId, score, durationSecs }),
    cache: "no-store",
  });
  return res.json();
}
