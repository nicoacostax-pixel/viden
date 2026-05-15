"use client";

import { useWrongNetwork } from "@/hooks/useWrongNetwork";

export function WrongNetworkBanner() {
  const { isWrongNetwork, currentChainName, switchToAmoy, isSwitching } = useWrongNetwork();

  if (!isWrongNetwork) return null;

  return (
    <div className="bg-danger/15 border-b border-danger/40 px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-danger text-sm font-medium">
          ⚠️ Red incorrecta. Conectado a <strong>{currentChainName}</strong>.
          {" "}Viden funciona en Polygon Amoy.
        </p>
        <button
          onClick={switchToAmoy}
          disabled={isSwitching}
          className="shrink-0 px-4 py-1.5 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSwitching ? "Cambiando…" : "Cambiar a Polygon Amoy"}
        </button>
      </div>
    </div>
  );
}
