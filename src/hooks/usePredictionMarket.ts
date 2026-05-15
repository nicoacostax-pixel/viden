"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { PREDICTION_MARKET_ABI, PREDICTION_MARKET_ADDRESS, Outcome } from "@/config/contracts";
import { AMOY_GAS } from "@/config/wagmi";

export type MarketData = {
  marketId: bigint;
  question: string;
  creator: string;
  closeTime: bigint;
  resolveTime: bigint;
  outcome: number;
  totalPoolYes: bigint;
  totalPoolNo: bigint;
  resolved: boolean;
};

export type PositionData = {
  netAmount: bigint;
  isYes: boolean;
  claimed: boolean;
};

export function useMarketCount() {
  const { data, isLoading, refetch } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "marketCount",
    query: { staleTime: 30_000, refetchOnWindowFocus: false },
  });
  return { count: data ?? 0n, isLoading, refetch };
}

export function useMarket(marketId: bigint | number | null) {
  const id = marketId != null ? BigInt(marketId) : null;
  const { data, isLoading, refetch } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "markets",
    args: id != null ? [id] : undefined,
    query: { enabled: id != null && id > 0n, staleTime: 15_000, refetchOnWindowFocus: false },
  });

  if (!data) return { market: null, isLoading, refetch };

  const [marketId_, question, creator, closeTime, resolveTime, outcome, totalPoolYes, totalPoolNo, resolved] = data as unknown as [bigint, string, string, bigint, bigint, number, bigint, bigint, boolean];

  return {
    market: { marketId: marketId_, question, creator, closeTime, resolveTime, outcome, totalPoolYes, totalPoolNo, resolved } as MarketData,
    isLoading,
    refetch,
  };
}

export function usePosition(marketId: bigint | number | null, address: string | undefined) {
  const id = marketId != null ? BigInt(marketId) : null;
  const { data, isLoading, refetch } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "positions",
    args: id != null && address ? [id, address as `0x${string}`] : undefined,
    query: { enabled: id != null && !!address, staleTime: 15_000, refetchOnWindowFocus: false },
  });

  if (!data) return { position: null, isLoading, refetch };

  const [netAmount, isYes, claimed] = data as [bigint, boolean, boolean];
  return { position: { netAmount, isYes, claimed } as PositionData, isLoading, refetch };
}

export function useBet() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const placeBet = (marketId: bigint, isYes: boolean, amount: bigint) => {
    writeContract({
      ...AMOY_GAS,
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "bet",
      args: [marketId, isYes, amount],
    });
  };

  return { placeBet, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimReward() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = (marketId: bigint) => {
    writeContract({
      ...AMOY_GAS,
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "claimReward",
      args: [marketId],
    });
  };

  return { claim, hash, isPending, isConfirming, isSuccess, error };
}

export function useCreateMarket() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createMarket = (question: string, closeTime: bigint, resolveTime: bigint) => {
    writeContract({
      ...AMOY_GAS,
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "createMarket",
      args: [question, closeTime, resolveTime],
    });
  };

  return { createMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useResolveMarket() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const resolve = (marketId: bigint, result: boolean) => {
    writeContract({
      ...AMOY_GAS,
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "resolveMarket",
      args: [marketId, result],
    });
  };

  return { resolve, hash, isPending, isConfirming, isSuccess, error };
}

export function formatVDN(amount: bigint): string {
  return Number(formatEther(amount)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function getOutcomeLabel(outcome: number): string {
  switch (outcome) {
    case Outcome.OPEN: return "Open";
    case Outcome.YES: return "YES won";
    case Outcome.NO: return "NO won";
    case Outcome.CANCELLED: return "Cancelled";
    default: return "Unknown";
  }
}

export function getProbability(poolYes: bigint, poolNo: bigint): { yes: number; no: number } {
  const total = poolYes + poolNo;
  if (total === 0n) return { yes: 50, no: 50 };
  const yes = Math.round(Number((poolYes * 10000n) / total) / 100);
  return { yes, no: 100 - yes };
}
