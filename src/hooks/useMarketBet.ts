"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useVDNAllowance, useVDNBalance } from "@/hooks/useVDNToken";
import {
  VDN_TOKEN_ABI,
  VDN_TOKEN_ADDRESS,
  PREDICTION_MARKET_ABI,
  PREDICTION_MARKET_ADDRESS,
} from "@/config/contracts";
import { AMOY_GAS } from "@/config/wagmi";

export type BetStep =
  | "idle"       // esperando que el usuario configure la apuesta
  | "approving"  // tx de approve en vuelo
  | "approved"   // approve confirmado, esperando clic en "Confirmar apuesta"
  | "betting"    // tx de bet en vuelo
  | "success"    // bet confirmado on-chain
  | "error";     // alguna tx falló

function parseBetError(error: Error): string {
  const msg = error.message;
  if (msg.includes("User rejected") || msg.includes("user rejected"))
    return "Transacción rechazada por el usuario.";
  if (msg.includes("PM__MercadoCerrado"))  return "El mercado ya cerró, no se aceptan apuestas.";
  if (msg.includes("PM__LadoDistinto"))    return "Ya apostaste en el lado contrario en este mercado.";
  if (msg.includes("PM__MontoInvalido"))   return "El monto debe ser mayor a 0.";
  if (msg.includes("PM__MercadoNoExiste")) return "El mercado no existe.";
  if (msg.includes("EnforcedPause"))       return "El contrato está pausado.";
  if (msg.includes("ERC20InsufficientBalance") || msg.includes("insufficient balance"))
    return "Fondos insuficientes en tu wallet.";
  if (msg.includes("ERC20InsufficientAllowance"))
    return "Allowance insuficiente — vuelve a aprobar.";
  const short = (error as any).shortMessage as string | undefined;
  if (short && !short.toLowerCase().includes("unknown")) return short;
  const detail = msg.match(/Details:\s*(.+?)(?:\n|$)/)?.[1]?.trim();
  if (detail) return detail;
  return "Error inesperado. Revisa la consola para más detalles.";
}

export function useMarketBet() {
  const { allowance, refetch: refetchAllowance } = useVDNAllowance();
  const { balance, refetch: refetchBalance } = useVDNBalance();

  const [step, setStep] = useState<BetStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Args persisted across the approve → bet boundary
  const pendingRef = useRef<{ marketId: bigint; isYes: boolean; amount: bigint } | null>(null);

  const approveWrite = useWriteContract();
  const betWrite    = useWriteContract();

  const approveTx = useWaitForTransactionReceipt({ hash: approveWrite.data });
  const betTx     = useWaitForTransactionReceipt({ hash: betWrite.data });

  // Approve confirmed → move to "approved" (page shows 2-second flash, then bet button)
  useEffect(() => {
    if (!approveTx.isSuccess) return;
    refetchAllowance();
    setStep("approved");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTx.isSuccess]);

  // Bet confirmed → success
  useEffect(() => {
    if (!betTx.isSuccess) return;
    refetchAllowance();
    refetchBalance();
    setStep("success");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betTx.isSuccess]);

  // Approve error
  useEffect(() => {
    if (!approveWrite.error) return;
    setStep("error");
    setErrorMsg(parseBetError(approveWrite.error));
  }, [approveWrite.error]);

  // Bet error
  useEffect(() => {
    if (!betWrite.error) return;
    setStep("error");
    setErrorMsg(parseBetError(betWrite.error));
  }, [betWrite.error]);

  /**
   * Main entry. Decides approve vs direct-bet based on current allowance.
   * Idempotent per bet attempt — call reset() before retrying.
   */
  const execute = useCallback(
    (marketId: bigint, isYes: boolean, amount: bigint) => {
      setErrorMsg(null);
      pendingRef.current = { marketId, isYes, amount };

      if (allowance >= amount) {
        // Allowance already covers it — jump straight to betting
        setStep("betting");
        betWrite.writeContract({
          ...AMOY_GAS,
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "bet",
          args: [marketId, isYes, amount],
        });
      } else {
        setStep("approving");
        approveWrite.writeContract({
          ...AMOY_GAS,
          address: VDN_TOKEN_ADDRESS,
          abi: VDN_TOKEN_ABI,
          functionName: "approve",
          args: [PREDICTION_MARKET_ADDRESS, amount],
        });
      }
    },
    [allowance, approveWrite, betWrite]
  );

  /**
   * Called from the "Confirmar apuesta" button that appears after the
   * approve flash. Uses args stored in pendingRef.
   */
  const confirmBet = useCallback(() => {
    const args = pendingRef.current;
    if (!args) return;
    setStep("betting");
    betWrite.writeContract({
      ...AMOY_GAS,
      address: PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "bet",
      args: [args.marketId, args.isYes, args.amount],
    });
  }, [betWrite]);

  const reset = useCallback(() => {
    setStep("idle");
    setErrorMsg(null);
    pendingRef.current = null;
    approveWrite.reset();
    betWrite.reset();
  }, [approveWrite, betWrite]);

  return {
    step,
    errorMsg,
    balance,
    allowance,
    approveHash: approveWrite.data,
    betHash: betWrite.data,
    isApproving: step === "approving",
    isBetting:   step === "betting",
    isSuccess:   step === "success",
    isError:     step === "error",
    execute,
    confirmBet,
    reset,
  };
}
