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

export async function apiCreatePaymentIntent(token: string, amount_usd: number) {
  return req("/api/wallet/create-payment-intent", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ amount_usd }),
  }) as Promise<{ client_secret: string; payment_intent_id: string }>;
}

export async function apiConfirmPayment(token: string, payment_intent_id: string) {
  return req("/api/wallet/confirm-payment", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ payment_intent_id }),
  }) as Promise<DepositResult & { already_credited: boolean }>;
}

// ── Bets / LMSR ───────────────────────────────────────────────────────────────

export type BuyResult = {
  bet_id:          number;
  market_id:       number;
  side:            string;
  gross_vdn:       number;
  net_vdn:         number;
  burned_vdn:      number;
  fee_vdn:         number;
  creator_fee_vdn: number;
  shares_received: number;
  avg_price:       number;
  price_yes_after: number;
  price_no_after:  number;
  message:         string;
};

/** @deprecated alias → apiBuy */
export type BetResult = BuyResult;

export async function apiBuy(
  token: string,
  market_id: number,
  side: "yes" | "no",
  amount_vdn: number,
  max_cost?: number,
) {
  return req("/api/bets/buy", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ market_id, side, amount_vdn, max_cost }),
  }) as Promise<BuyResult>;
}

/** @deprecated Use apiBuy */
export async function apiPlaceBet(token: string, market_id: number, side: "yes" | "no", amount_vdn: number) {
  return apiBuy(token, market_id, side, amount_vdn);
}

export type SellResult = {
  bet_id:          number;
  market_id:       number;
  side:            string;
  shares_sold:     number;
  lmsr_return:     number;
  sell_fee:        number;
  net_received:    number;
  pnl:             number;
  price_yes_after: number;
  price_no_after:  number;
  message:         string;
};

export async function apiSell(
  token: string,
  market_id: number,
  side: "yes" | "no",
  shares: number,
  min_received?: number,
) {
  return req("/api/bets/sell", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ market_id, side, shares, min_received }),
  }) as Promise<SellResult>;
}

export type LmsrPosition = {
  market_id:       number;
  question:        string;
  market_status:   string;
  close_time:      number;
  resolve_time:    number;
  side:            "yes" | "no";
  shares:          number;
  cost_basis:      number;
  avg_entry_price: number;
  current_price:   number;
  current_value:   number;
  pnl_unrealized:  number;
  pnl_pct:         number;
  price_yes_pct:   number;
  price_no_pct:    number;
};

export async function apiMyPositions(token: string) {
  return req("/api/bets/my-positions", { headers: authHeaders(token) }) as Promise<{ positions: LmsrPosition[] }>;
}

export async function apiMyBets(token: string) {
  return req("/api/bets/my-bets", { headers: authHeaders(token) }) as Promise<{ bets: unknown[] }>;
}

export async function apiClaimBet(token: string, bet_id: number) {
  return req(`/api/bets/claim/${bet_id}`, { method: "POST", headers: authHeaders(token) });
}

// ── Market price & orderbook ───────────────────────────────────────────────────

export type MarketPrice = {
  market_id:        number;
  price_yes:        number;
  price_no:         number;
  pct_yes:          number;
  pct_no:           number;
  implied_prob_yes: number;
  shares_yes:       number;
  shares_no:        number;
  pool_yes_vdn:     number;
  pool_no_vdn:      number;
  pool_total_vdn:   number;
  timestamp:        number;
};

export async function apiGetMarketPrice(market_id: number) {
  return req(`/api/markets/${market_id}/price`) as Promise<MarketPrice>;
}

export type PriceHistoryPoint = {
  price_yes:  number;
  price_no:   number;
  shares_yes: number;
  shares_no:  number;
  timestamp:  number;
};

export async function apiGetPriceHistory(market_id: number) {
  return req(`/api/markets/${market_id}/price-history`) as Promise<{ history: PriceHistoryPoint[] }>;
}

export async function apiGetOrderbook(market_id: number) {
  return req(`/api/markets/${market_id}/orderbook`) as Promise<{
    buy_yes:  { vdn_gross: number; shares: number; cost_net: number; price_after_pct: number }[];
    buy_no:   { vdn_gross: number; shares: number; cost_net: number; price_after_pct: number }[];
    sell_yes: { shares: number; vdn_received: number; price_after_pct: number }[];
    sell_no:  { shares: number; vdn_received: number; price_after_pct: number }[];
  }>;
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

// ── User markets ──────────────────────────────────────────────────────────────

export type UserMarket = {
  market_id:               number;
  public_id:               string | null;
  question:                string;
  category:                string | null;
  emoji:                   string | null;
  close_time:              number;
  resolve_time:            number;
  status:                  "OPEN" | "YES" | "NO" | "CANCELLED";
  status_review:           "pending" | "approved" | "rejected" | null;
  creator_fee_earned:      number;
  creation_cost_vdn:       number;
  creation_cost_returned:  number;
  resolution_criteria:     string | null;
  total_pool_vdn:          number;
  last_updated:            number;
};

export type PendingMarket = {
  market_id:           number;
  public_id:           string | null;
  question:            string;
  resolution_criteria: string | null;
  category:            string | null;
  emoji:               string | null;
  close_time:          number;
  resolve_time:        number;
  creator_username:    string | null;
  creator_email:       string | null;
  last_updated:        number;
};

export async function apiCreateMarket(token: string, data: {
  question: string;
  resolution_criteria: string;
  category: string;
  close_time: number;
  resolve_time: number;
}) {
  return req("/api/markets/create", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }) as Promise<{ market_id: number; public_id: string; message: string }>;
}

export async function apiGetMyMarkets(token: string) {
  return req("/api/markets/my-markets", {
    headers: authHeaders(token),
  }) as Promise<{ markets: UserMarket[] }>;
}

export type MarketToResolve = {
  market_id:           number;
  public_id:           string | null;
  question:            string;
  category:            string | null;
  emoji:               string | null;
  close_time:          number;
  resolve_time:        number;
  is_user_created:     number;
  resolution_criteria: string | null;
  pool_yes:            number;
  pool_no:             number;
  creator_username:    string | null;
};

export type AdminUser = {
  id:          number;
  email:       string;
  username:    string;
  balance_usd: number;
  balance_vdn: number;
  kyc_status:  string;
  created_at:  number;
};

export async function apiGetMarketsToResolve(token: string) {
  return req("/api/admin/custodial/markets-to-resolve", {
    headers: authHeaders(token),
  }) as Promise<{ markets: MarketToResolve[]; count: number }>;
}

export async function apiAdminResolveMarket(token: string, market_id: number, result: "yes" | "no" | "cancelled") {
  return req("/api/admin/custodial/resolve-market", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ market_id, result }),
  });
}

export async function apiGetAdminUsers(token: string) {
  return req("/api/admin/custodial/users", {
    headers: authHeaders(token),
  }) as Promise<{ users: AdminUser[] }>;
}

export async function apiGetPendingMarkets(token: string) {
  return req("/api/admin/custodial/pending-markets", {
    headers: authHeaders(token),
  }) as Promise<{ markets: PendingMarket[]; count: number }>;
}

export async function apiApproveMarket(token: string, market_id: number) {
  return req(`/api/admin/custodial/markets/${market_id}/approve`, {
    method: "POST",
    headers: authHeaders(token),
  }) as Promise<{ ok: boolean; market_id: number }>;
}

export async function apiRejectMarket(token: string, market_id: number, reason?: string) {
  return req(`/api/admin/custodial/markets/${market_id}/reject`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  }) as Promise<{ ok: boolean; market_id: number; reason: string | null }>;
}
