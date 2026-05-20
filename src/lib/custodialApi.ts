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
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
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
  reinvest_bonus_active: boolean;
  reinvest_bonus_expires_at: number | null;
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
  side: string,
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

export type MultiPriceHistoryPoint = {
  timestamp:       number;
  price_local:     number;
  price_empate:    number;
  price_visitante: number;
};

export async function apiGetPriceHistory(market_id: number) {
  return req(`/api/markets/${market_id}/price-history`) as Promise<{
    history: PriceHistoryPoint[] | MultiPriceHistoryPoint[];
    is_multi?: boolean;
  }>;
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
  is_admin:    number;
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

export async function apiSetUserAdmin(token: string, email: string, isAdmin: boolean) {
  return req(`/api/admin/custodial/${isAdmin ? "promote" : "demote"}-admin`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ email }),
  }) as Promise<{ ok: boolean }>;
}

export async function apiGetAllOpenMarkets(token: string) {
  return req("/api/admin/custodial/all-open-markets", {
    headers: authHeaders(token),
  }) as Promise<{ markets: MarketToResolve[]; count: number }>;
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

export async function apiFeatureMarket(token: string, market_id: number) {
  return req(`/api/admin/custodial/markets/${market_id}/feature`, {
    method: "POST",
    headers: authHeaders(token),
  }) as Promise<{ ok: boolean; market_id: number; is_featured: boolean }>;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank:          number;
  user_id:       number;
  username:      string;
  total_wagered: number;
  total_won:     number;
  pnl_vdn:       number;
  bet_count:     number;
};

export async function apiGetWeeklyLeaderboard(limit = 20) {
  return req(`/api/leaderboard/weekly?limit=${limit}`) as Promise<{
    leaderboard: LeaderboardEntry[];
    period: string;
    since: number;
  }>;
}

export async function apiGetAllTimeLeaderboard(limit = 20) {
  return req(`/api/leaderboard/all-time?limit=${limit}`) as Promise<{
    leaderboard: LeaderboardEntry[];
    period: string;
  }>;
}

// ── Achievements ──────────────────────────────────────────────────────────────

export type Achievement = {
  slug:        string;
  name:        string;
  description: string;
  icon:        string;
  rarity:      "common" | "rare" | "epic" | "legendary";
  earned_at?:  number;
};

export async function apiGetAchievements() {
  return req("/api/achievements") as Promise<{ achievements: Achievement[] }>;
}

export async function apiGetMyAchievements(token: string) {
  return req("/api/achievements/me", { headers: authHeaders(token) }) as Promise<{
    earned: Achievement[];
    total: number;
  }>;
}

// ── Tournaments ───────────────────────────────────────────────────────────────

export type Tournament = {
  id:               number;
  name:             string;
  description:      string | null;
  start_ts:         number;
  end_ts:           number;
  entry_fee_vdn:    number;
  prize_pool_vdn:   number;
  status:           "pending" | "active" | "finished";
  max_participants: number | null;
  participant_count: number;
  is_joinable:      boolean;
  time_left_s:      number;
};

export type TournamentEntry = {
  rank:       number;
  user_id:    number;
  username:   string;
  pnl_vdn:    number;
  bets_count: number;
  joined_at:  number;
};

export async function apiGetTournaments() {
  return req("/api/tournaments") as Promise<{ tournaments: Tournament[] }>;
}

export async function apiGetTournament(id: number) {
  return req(`/api/tournaments/${id}`) as Promise<{
    tournament: Tournament;
    leaderboard: TournamentEntry[];
    prizes: { rank: number; prize_vdn: number; user_id: number | null; paid: number }[];
  }>;
}

export async function apiJoinTournament(token: string, id: number) {
  return req(`/api/tournaments/${id}/join`, {
    method: "POST",
    headers: authHeaders(token),
  }) as Promise<{ ok: boolean; tournament_id: number; entry_fee_paid: number }>;
}

export async function apiGetMyTournamentEntry(token: string, id: number) {
  return req(`/api/tournaments/${id}/my-entry`, { headers: authHeaders(token) }) as Promise<{
    entry: TournamentEntry | null;
  }>;
}

// ── Feed de actividad ─────────────────────────────────────────────────────────

export type FeedItem = {
  username:     string;
  display_name: string | null;
  avatar_url:   string | null;
  side:         "yes" | "no";
  amount:       number;
  status:       string;
  question:     string;
  market_id:    number;
  emoji:        string | null;
  ts:           number;
  type:         "bet";
};

export async function apiGetFeed(token: string | null, filter: "global" | "following" = "global", limit = 20): Promise<{ feed: FeedItem[]; filter: string }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return req(`/api/feed?filter=${filter}&limit=${limit}`, { headers }) as Promise<{ feed: FeedItem[]; filter: string }>;
}

// ── Social follows ─────────────────────────────────────────────────────────────

export async function apiFollow(token: string, username: string): Promise<{ following: boolean; followers_count: number }> {
  return req(`/api/social/follow/${username}`, { method: "POST", headers: authHeaders(token) }) as Promise<{ following: boolean; followers_count: number }>;
}

export async function apiUnfollow(token: string, username: string): Promise<{ following: boolean; followers_count: number }> {
  return req(`/api/social/follow/${username}`, { method: "DELETE", headers: authHeaders(token) }) as Promise<{ following: boolean; followers_count: number }>;
}

export async function apiGetFollowers(username: string) {
  return req(`/api/social/followers/${username}`) as Promise<{ followers: { username: string; display_name: string | null; avatar_url: string | null; bio: string | null }[] }>;
}

export async function apiGetFollowing(username: string) {
  return req(`/api/social/following/${username}`) as Promise<{ following: { username: string; display_name: string | null; avatar_url: string | null; bio: string | null }[] }>;
}

export async function apiCreateTournament(token: string, data: {
  name:              string;
  description?:      string;
  entry_fee_vdn:     number;
  duration_hours:    number;
  max_participants?: number;
}): Promise<{ ok: boolean; tournament_id: number }> {
  return req("/api/tournaments", {
    method:  "POST",
    headers: authHeaders(token),
    body:    JSON.stringify(data),
  }) as Promise<{ ok: boolean; tournament_id: number }>;
}

export async function apiUpdateProfile(token: string, data: { username?: string; avatar_url?: string }) {
  return req("/api/auth/profile", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }) as Promise<{ user: Record<string, unknown>; token: string }>;
}

export async function apiChangePassword(token: string, current_password: string, new_password: string) {
  return req("/api/auth/password", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ current_password, new_password }),
  }) as Promise<{ message: string }>;
}

export async function apiGetMyBets(token: string) {
  return req("/api/bets/my-bets", { headers: authHeaders(token) }) as Promise<{
    bets: Array<{
      id: number; market_id: number; question: string; side: string;
      amount_vdn_gross: number; amount_vdn_net: number; reward_vdn: number;
      status: string; created_at: number; emoji: string | null;
    }>;
  }>;
}

export async function apiDeleteMarket(token: string, market_id: number) {
  return req(`/api/admin/custodial/markets/${market_id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }) as Promise<{ message: string }>;
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export type ReactionsData = {
  counts: Record<string, number>;
  mine:   string[];
};

export async function apiGetReactions(type: "market" | "bet", id: number, token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return req(`/api/reactions/${type}/${id}`, { headers }) as Promise<ReactionsData>;
}

export async function apiToggleReaction(token: string, type: "market" | "bet", id: number, emoji: string) {
  return req(`/api/reactions/${type}/${id}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ emoji }),
  }) as Promise<ReactionsData>;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type AppNotification = {
  id:                   number;
  type:                 string;
  ref_type:             string | null;
  ref_id:               number | null;
  extra:                Record<string, unknown> | null;
  read:                 number;
  created_at:           number;
  actor_username:       string | null;
  actor_display_name:   string | null;
  actor_avatar_url:     string | null;
};

export async function apiGetNotifications(token: string) {
  return req("/api/notifications", { headers: authHeaders(token) }) as Promise<{ notifications: AppNotification[] }>;
}

export async function apiGetUnreadCount(token: string) {
  return req("/api/notifications/unread-count", { headers: authHeaders(token) }) as Promise<{ count: number }>;
}

export async function apiMarkAllRead(token: string) {
  return req("/api/notifications/read-all", { method: "POST", headers: authHeaders(token) }) as Promise<{ ok: boolean }>;
}

export async function apiMarkRead(token: string, id: number) {
  return req(`/api/notifications/${id}/read`, { method: "POST", headers: authHeaders(token) }) as Promise<{ ok: boolean }>;
}

// ── Duels ─────────────────────────────────────────────────────────────────────

export type Duel = {
  id:                      number;
  challenger_id:           number;
  challenged_id:           number;
  market_id:               number;
  challenger_side:         "yes" | "no";
  challenged_side:         "yes" | "no" | null;
  stake_vdn:               number;
  status:                  "pending" | "accepted" | "declined" | "resolved" | "cancelled";
  winner_id:               number | null;
  created_at:              number;
  resolved_at:             number | null;
  challenger_username:     string;
  challenger_display_name: string | null;
  challenger_avatar:       string | null;
  challenged_username:     string;
  challenged_display_name: string | null;
  challenged_avatar:       string | null;
  winner_username:         string | null;
  question:                string;
  market_status:           string;
  emoji:                   string | null;
};

export async function apiCreateDuel(token: string, data: {
  challenged_username: string;
  market_id:           number;
  my_side:             "yes" | "no";
  stake_vdn:           number;
}) {
  return req("/api/duels", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }) as Promise<{ ok: boolean; duel_id: number }>;
}

export async function apiGetMyDuels(token: string) {
  return req("/api/duels", { headers: authHeaders(token) }) as Promise<{ duels: Duel[] }>;
}

export async function apiAcceptDuel(token: string, id: number) {
  return req(`/api/duels/${id}/accept`, { method: "POST", headers: authHeaders(token) }) as Promise<{ ok: boolean; challenged_side: string }>;
}

export async function apiDeclineDuel(token: string, id: number) {
  return req(`/api/duels/${id}/decline`, { method: "POST", headers: authHeaders(token) }) as Promise<{ ok: boolean }>;
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

export type WithdrawResult = {
  amount_vdn: number;
  amount_usd: number;
  clabe: string;
  account_holder: string;
  bank_name: string;
  new_balance_vdn: number;
  status: string;
};

export async function apiWithdraw(
  token: string,
  amount_vdn: number,
  clabe: string,
  account_holder: string,
  bank_name: string,
) {
  return req("/api/wallet/withdraw", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ amount_vdn, clabe, account_holder, bank_name }),
  }) as Promise<WithdrawResult>;
}

export type Transaction = {
  id: number;
  type: string;
  amount_usd: number | null;
  amount_vdn: number | null;
  description: string;
  status: string;
  tx_hash: string | null;
  to_address: string | null;
  created_at: number;
};

export async function apiGetTransactions(token: string) {
  return req("/api/wallet/transactions", {
    headers: authHeaders(token),
  }) as Promise<{ transactions: Transaction[] }>;
}

export type AdminMarket = {
  market_id: number; public_id: string | null; question: string;
  category: string | null; emoji: string | null; status: string;
  market_type: string; close_time: number; is_user_created: number;
  total_pool: number; creator_username: string | null;
};

export async function apiGetAllMarkets(token: string, q?: string, status?: string) {
  const params = new URLSearchParams();
  if (q)      params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  return req(`/api/admin/custodial/all-markets${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  }) as Promise<{ markets: AdminMarket[]; count: number }>;
}
