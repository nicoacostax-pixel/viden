"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { VDN_TOKEN_ABI, VDN_TOKEN_ADDRESS, PREDICTION_MARKET_ADDRESS } from "@/config/contracts";
import { AMOY_GAS } from "@/config/wagmi";

export function useVDNBalance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: VDN_TOKEN_ADDRESS,
    abi: VDN_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 30_000, refetchOnWindowFocus: false },
  });

  return {
    balance: data ?? 0n,
    balanceFormatted: data ? Number(formatEther(data)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0",
    isLoading,
    refetch,
  };
}

export function useVDNAllowance() {
  const { address } = useAccount();

  const { data, refetch } = useReadContract({
    address: VDN_TOKEN_ADDRESS,
    abi: VDN_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, PREDICTION_MARKET_ADDRESS] : undefined,
    query: { enabled: !!address, staleTime: 30_000, refetchOnWindowFocus: false },
  });

  return { allowance: data ?? 0n, refetch };
}

export function useApprove() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: bigint) => {
    writeContract({
      ...AMOY_GAS,
      address: VDN_TOKEN_ADDRESS,
      abi: VDN_TOKEN_ABI,
      functionName: "approve",
      args: [PREDICTION_MARKET_ADDRESS, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
