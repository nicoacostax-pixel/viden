const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.error ?? "Error desconocido", res.status);
  return data;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  balance_usd: number;
  balance_vdn: number;
  balance_vdn_vesting: number;
  kyc_status: string;
  referral_code: string;
  referred_by: number | null;
  created_at: number;
  is_admin: number;
};

export async function apiRegister(email: string, password: string, username: string, referral_code?: string) {
  return req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, username, referral_code }) }) as Promise<{ token: string; user: AuthUser }>;
}

export async function apiLogin(email: string, password: string) {
  return req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{ token: string; user: AuthUser }>;
}

export async function apiMe(token: string) {
  return req("/api/auth/me", { headers: authHeaders(token) }) as Promise<{ user: AuthUser }>;
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export type WalletBalance = {
  balance_usd: number;
  balance_vdn: number;
  balance_vdn_vesting: number;
  vdn_price_usd: number;
  balance_usd_equiv: number;
  total_deposited_usd: number;
  total_wagered_vdn: number;
};

export async function apiGetBalance(token: string) {
  return req("/api/wallet/balance", { headers: authHeaders(token) }) as Promise<WalletBalance>;
}

export type DepositResult = {
  vdn_received: number;
  usd_paid: number;
  price_per_vdn: number;
  new_balance_vdn: number;
};

export async function apiDeposit(token: string, amount_usd: number, payment_method = "demo") {
  return req("/api/wallet/deposit", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ amount_usd, payment_method }),
  }) as Promise<DepositResult>;
}

export async function apiStripeCheckout(token: string, amount_usd: number) {
  return req("/api/wallet/stripe-checkout", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ amount_usd }),
  }) as Promise<{ url: string }>;
}

export async function apiStripeConfirm(token: string, session_id: string) {
  return req("/api/wallet/stripe-confirm", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ session_id }),
  }) as Promise<DepositResult & { already_credited: boolean }>;
}

// ── Bets ──────────────────────────────────────────────────────────────────────

export type BetResult = {
  bet_id: number;
  market_id: number;
  side: string;
  gross_vdn: number;
  net_vdn: number;
  burned_vdn: number;
  fee_vdn: number;
  pool_yes_vdn: number;
  pool_no_vdn: number;
  message: string;
};

export async function apiPlaceBet(token: string, market_id: number, side: "yes" | "no", amount_vdn: number) {
  return req("/api/bets/place", { method: "POST", headers: authHeaders(token), body: JSON.stringify({ market_id, side, amount_vdn }) }) as Promise<BetResult>;
}

export async function apiMyBets(token: string) {
  return req("/api/bets/my-bets", { headers: authHeaders(token) }) as Promise<{ bets: unknown[] }>;
}

export async function apiClaimBet(token: string, bet_id: number) {
  return req(`/api/bets/claim/${bet_id}`, { method: "POST", headers: authHeaders(token) });
}

// ── Market social ─────────────────────────────────────────────────────────────

export type Comment = {
  id: number;
  market_id: number;
  text: string;
  created_at: number;
  username: string;
  like_count: number;
};

export async function apiGetComments(market_id: number, sort: "recent" | "popular" = "recent") {
  return req(`/api/markets/${market_id}/comments?sort=${sort}`) as Promise<{ comments: Comment[] }>;
}

export async function apiPostComment(token: string, market_id: number, text: string) {
  return req(`/api/markets/${market_id}/comments`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({ text }),
  }) as Promise<{ comment: Comment }>;
}

export async function apiLikeComment(token: string, market_id: number, comment_id: number) {
  return req(`/api/markets/${market_id}/comments/${comment_id}/like`, {
    method: "POST", headers: authHeaders(token),
  }) as Promise<{ liked: boolean; like_count: number }>;
}

export type TopHolder = {
  username: string;
  side: "yes" | "no";
  total_vdn: number;
  net_vdn: number;
};

export async function apiGetTopHolders(market_id: number) {
  return req(`/api/markets/${market_id}/top-holders`) as Promise<{ holders: TopHolder[] }>;
}

export type PositionsData = {
  yes: { count: number; total_vdn: number; total_usd: number; probability: number };
  no:  { count: number; total_vdn: number; total_usd: number; probability: number };
  history: { timestamp: number; probability_yes: number }[];
};

export async function apiGetPositions(market_id: number) {
  return req(`/api/markets/${market_id}/positions`) as Promise<PositionsData>;
}

export type ActivityItem = {
  type: "bet" | "claim" | "resolved" | "cancelled";
  username: string | null;
  amount: number | null;
  side: "yes" | "no" | null;
  timestamp: number;
};

export async function apiGetActivity(market_id: number) {
  return req(`/api/markets/${market_id}/activity`) as Promise<{ activity: ActivityItem[] }>;
}
