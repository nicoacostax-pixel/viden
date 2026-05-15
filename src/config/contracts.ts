import { polygonAmoy } from "./wagmi";

export const VDN_TOKEN_ADDRESS = "0x8C40Ee3b74061e4784C227DA85a63e717e04116b" as const;
export const PREDICTION_MARKET_ADDRESS = "0x080D8A100fc43b17b08B5ED57842c6a5247beF26" as const;

export const EXPLORER_BASE = `${polygonAmoy.blockExplorers.default.url}`;

export const VDN_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "value", "type": "uint256"}],
    "name": "approve", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "spender", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "name": "Approval", "type": "event"
  }
] as const;

export const PREDICTION_MARKET_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "marketId", "type": "uint256"}, {"internalType": "bool", "name": "isYes", "type": "bool"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "bet", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "marketId", "type": "uint256"}],
    "name": "cancelMarket", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "marketId", "type": "uint256"}],
    "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "question", "type": "string"}, {"internalType": "uint256", "name": "closeTime", "type": "uint256"}, {"internalType": "uint256", "name": "resolveTime", "type": "uint256"}],
    "name": "createMarket", "outputs": [{"internalType": "uint256", "name": "marketId", "type": "uint256"}],
    "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [], "name": "marketCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "markets",
    "outputs": [
      {"internalType": "uint256", "name": "marketId", "type": "uint256"},
      {"internalType": "string", "name": "question", "type": "string"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "uint256", "name": "closeTime", "type": "uint256"},
      {"internalType": "uint256", "name": "resolveTime", "type": "uint256"},
      {"internalType": "uint8", "name": "outcome", "type": "uint8"},
      {"internalType": "uint256", "name": "totalPoolYes", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPoolNo", "type": "uint256"},
      {"internalType": "bool", "name": "resolved", "type": "bool"}
    ],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "address", "name": "", "type": "address"}],
    "name": "positions",
    "outputs": [
      {"internalType": "uint256", "name": "netAmount", "type": "uint256"},
      {"internalType": "bool", "name": "isYes", "type": "bool"},
      {"internalType": "bool", "name": "claimed", "type": "bool"}
    ],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "marketId", "type": "uint256"}, {"internalType": "bool", "name": "result", "type": "bool"}],
    "name": "resolveMarket", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [], "name": "FEE_BURN",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "FEE_TREASURY",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "bool", "name": "isYes", "type": "bool"},
      {"indexed": false, "internalType": "uint256", "name": "netAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "burnedAmount", "type": "uint256"}
    ],
    "name": "BetPlaced", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "question", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "closeTime", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "resolveTime", "type": "uint256"}
    ],
    "name": "MarketCreated", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "RewardClaimed", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256"}],
    "name": "MarketCancelled", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256"},
      {"indexed": false, "internalType": "bool", "name": "result", "type": "bool"}
    ],
    "name": "MarketResolved", "type": "event"
  },
  {
    "inputs": [], "name": "MARKET_CREATOR_ROLE",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "RESOLVER_ROLE",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "role", "type": "bytes32"}, {"internalType": "address", "name": "account", "type": "address"}],
    "name": "hasRole", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view", "type": "function"
  }
] as const;

export const Outcome = {
  OPEN: 0,
  YES: 1,
  NO: 2,
  CANCELLED: 3,
} as const;

export type OutcomeValue = typeof Outcome[keyof typeof Outcome];
