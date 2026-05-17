import { Outcome } from "@/config/contracts";
import type { MarketData, PositionData } from "@/hooks/usePredictionMarket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Raw API response shapes ───────────────────────────────────────────────────

export type ApiMarket = {
  marketId: number;
  publicId: string | null;
  question: string;
  creator: string;
  closeTime: number;
  resolveTime: number;
  totalPoolYes: string;
  totalPoolNo: string;
  totalPool: string;
  status: "OPEN" | "YES" | "NO" | "CANCELLED";
  lastUpdated: number;
  category: string | null;
  emoji: string | null;
  custodialPoolYes: number;
  custodialPoolNo: number;
  sharesYes: number;
  sharesNo: number;
  isUserCreated: boolean;
  statusReview: string | null;
  resolutionCriteria: string | null;
  creatorFeeEarned: number;
  marketType: "binary" | "multi";
  outcomes: { id: number; label: string; shares: number; ord: number }[] | null;
  resolvedOutcomeId: number | null;
  isBtcAuto: boolean;
  btcTargetPrice: number | null;
  homeTeam: string | null;
  awayTeam: string | null;
  kickoffTs: number | null;
  source: string | null;
  liveScoreHome: number | null;
  liveScoreAway: number | null;
  matchMinute: number | null;
  matchStatus: string | null;
  competitionName: string | null;
};

export type ApiPosition = {
  marketId: number;
  question: string;
  status: "OPEN" | "YES" | "NO" | "CANCELLED";
  isYes: boolean;
  netAmount: string;
  closeTime: number;
  resolveTime: number;
  totalPoolYes: string;
  totalPoolNo: string;
  estimatedPayout: string | null;
  claimed: boolean;
  claimedAmount: string | null;
  claimedTxHash: string | null;
  betTxHash: string;
  timestamp: number;
};

export type ApiPortfolio = {
  wallet: string;
  totalBet: string;
  totalClaimed: string;
  pnl: string;
  positions: ApiPosition[];
};

// ── Mappers: API → frontend types ────────────────────────────────────────────

const STATUS_TO_OUTCOME: Record<ApiMarket["status"], number> = {
  OPEN:      Outcome.OPEN,
  YES:       Outcome.YES,
  NO:        Outcome.NO,
  CANCELLED: Outcome.CANCELLED,
};

export function toMarketData(m: ApiMarket): MarketData {
  const outcome = STATUS_TO_OUTCOME[m.status];
  return {
    marketId:     BigInt(m.marketId),
    question:     m.question,
    creator:      m.creator,
    closeTime:    BigInt(m.closeTime),
    resolveTime:  BigInt(m.resolveTime),
    outcome,
    totalPoolYes: BigInt(m.totalPoolYes),
    totalPoolNo:  BigInt(m.totalPoolNo),
    resolved:     m.status === "YES" || m.status === "NO",
  };
}

export function toMarketDataFromPosition(p: ApiPosition): MarketData {
  return {
    marketId:     BigInt(p.marketId),
    question:     p.question,
    creator:      "",
    closeTime:    BigInt(p.closeTime),
    resolveTime:  BigInt(p.resolveTime),
    outcome:      STATUS_TO_OUTCOME[p.status],
    totalPoolYes: BigInt(p.totalPoolYes),
    totalPoolNo:  BigInt(p.totalPoolNo),
    resolved:     p.status === "YES" || p.status === "NO",
  };
}

export function toPositionData(p: ApiPosition): PositionData {
  return {
    netAmount: BigInt(p.netAmount),
    isYes:     p.isYes,
    claimed:   p.claimed,
  };
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function getMarkets(): Promise<{ markets: ApiMarket[] }> {
  const res = await fetch(`${API_URL}/api/markets`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getMarkets: ${res.status}`);
  return res.json();
}

export async function getMarket(id: string | number): Promise<{ market: ApiMarket; events: unknown[] }> {
  const res = await fetch(`${API_URL}/api/markets/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getMarket: ${res.status}`);
  return res.json();
}

export async function getPortfolio(wallet: string): Promise<ApiPortfolio> {
  const res = await fetch(`${API_URL}/api/portfolio/${wallet}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getPortfolio: ${res.status}`);
  return res.json();
}

export async function getLeaderboard(): Promise<{ leaderboard: unknown[] }> {
  const res = await fetch(`${API_URL}/api/leaderboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getLeaderboard: ${res.status}`);
  return res.json();
}

export async function searchMarketByPublicId(publicId: string): Promise<{ market: ApiMarket } | null> {
  const res = await fetch(`${API_URL}/api/markets/${encodeURIComponent(publicId.toUpperCase())}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`searchMarketByPublicId: ${res.status}`);
  return res.json();
}
