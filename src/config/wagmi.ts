import { createConfig, http } from "wagmi";
import { polygonAmoy as _polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { parseGwei } from "viem";

export const polygonAmoy = {
  ..._polygonAmoy,
  fees: { defaultPriorityFee: parseGwei("30") },
} as typeof _polygonAmoy;

/**
 * Gas explícito para Polygon Amoy.
 * MetaMask ignora chain.fees.defaultPriorityFee y estima ~1.5 gwei,
 * por debajo del mínimo de 25 gwei de la red.
 * Pasar estos valores directamente en writeContract los fuerza.
 */
export const AMOY_GAS = {
  maxPriorityFeePerGas: parseGwei("30"),
  maxFeePerGas:         parseGwei("50"),
} as const;

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: [injected()],
  transports: { [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology") },
  ssr: true,
  // Default polling is 4 s — way too frequent for a slow public testnet RPC.
  // We refetch manually after every write tx, so 30 s is more than enough.
  pollingInterval: 30_000,
});
