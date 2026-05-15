"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { polygonAmoy } from "@/config/wagmi";

export function useWrongNetwork() {
  const { isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== polygonAmoy.id;
  const currentChainName = chain?.name ?? `Chain ${chainId}`;

  const switchToAmoy = () => switchChain({ chainId: polygonAmoy.id });

  return { isWrongNetwork, currentChainName, switchToAmoy, isSwitching: isPending };
}
