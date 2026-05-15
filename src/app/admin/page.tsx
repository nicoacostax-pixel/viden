"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useCreateMarket, useResolveMarket, useMarketCount } from "@/hooks/usePredictionMarket";
import { useWrongNetwork } from "@/hooks/useWrongNetwork";
import { TxLink } from "@/components/TxLink";
import { PREDICTION_MARKET_ABI, PREDICTION_MARKET_ADDRESS } from "@/config/contracts";

// keccak256("MARKET_CREATOR_ROLE") — matches PredictionMarket.sol constant
const MARKET_CREATOR_ROLE =
  "0xd3065a24ad9e7725d223007135762d2902038999e3e5829146654498a58d9795" as const;

function dateToTimestamp(value: string): bigint {
  return BigInt(Math.floor(new Date(value).getTime() / 1000));
}

function toDatetimeLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

function addSeconds(base: string | null, seconds: number): string {
  const from = base ? new Date(base) : new Date();
  return toDatetimeLocal(new Date(from.getTime() + seconds * 1000));
}

const CLOSE_PRESETS = [
  { label: "+1h",     s: 3_600 },
  { label: "+1 día",  s: 86_400 },
  { label: "+7 días", s: 604_800 },
  { label: "+30 días",s: 2_592_000 },
];

const RESOLVE_OFFSETS = [
  { label: "+1h",  s: 3_600 },
  { label: "+2h",  s: 7_200 },
  { label: "+6h",  s: 21_600 },
  { label: "+1 día", s: 86_400 },
];

function extractRevertReason(error: Error): string {
  // viem BaseError exposes shortMessage (e.g. "PM__FechaInvalida()")
  const short = (error as any).shortMessage as string | undefined;
  if (short && short !== "An unknown error occurred.") return short;

  const msg = error.message;

  // Extract the line after "Details:" when present
  const detailsMatch = msg.match(/Details:\s*(.+?)(?:\n|$)/);
  if (detailsMatch) return detailsMatch[1].trim();

  // Fall back: first 300 chars
  return msg.slice(0, 300);
}

function RoleStatus({ address }: { address: string }) {
  const { data: hasRole, isLoading } = useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "hasRole",
    args: [MARKET_CREATOR_ROLE, address as `0x${string}`],
  });

  // Log to console for easy debugging
  useEffect(() => {
    if (hasRole !== undefined) {
      console.log("[Admin] Wallet:", address);
      console.log("[Admin] Tiene MARKET_CREATOR_ROLE:", hasRole);
    }
  }, [hasRole, address]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted px-3 py-2 rounded-lg bg-surface-alt border border-border">
        <span className="animate-pulse">●</span> Verificando permisos…
      </div>
    );
  }

  if (hasRole) {
    return (
      <div className="flex items-center gap-2 text-xs text-success px-3 py-2 rounded-lg bg-success/10 border border-success/20">
        <span>✓</span> Wallet tiene MARKET_CREATOR_ROLE
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-danger px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">
        <span>✗</span> Wallet NO tiene MARKET_CREATOR_ROLE — las transacciones revertirán
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-foreground transition-colors py-1">
          Cómo otorgar el rol desde la terminal →
        </summary>
        <pre className="mt-2 p-3 rounded-lg bg-background border border-border overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
{`# Desde el directorio raíz del proyecto:
npx hardhat run scripts/grant_market_creator.ts --network amoy

# O ejecutar directamente con ethers en la consola Hardhat:
npx hardhat console --network amoy

# Dentro de la consola:
const market = await ethers.getContractAt(
  "PredictionMarket",
  "0x080D8A100fc43b17b08B5ED57842c6a5247beF26"
);
const ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKET_CREATOR_ROLE"));
await market.grantRole(ROLE, "${address}");`}
        </pre>
      </details>
    </div>
  );
}

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { count } = useMarketCount();
  const { isWrongNetwork } = useWrongNetwork();

  const create = useCreateMarket();
  const resolve = useResolveMarket();

  const [question, setQuestion] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [resolveDate, setResolveDate] = useState("");

  const [resolveId, setResolveId] = useState("");
  const [resolveResult, setResolveResult] = useState<boolean>(true);

  const isCreating = create.isPending || create.isConfirming;
  const isResolving = resolve.isPending || resolve.isConfirming;

  useEffect(() => {
    if (create.isSuccess) {
      setQuestion("");
      setCloseDate("");
      setResolveDate("");
    }
  }, [create.isSuccess]);

  useEffect(() => {
    if (resolve.isSuccess) setResolveId("");
  }, [resolve.isSuccess]);

  // Log the full error object whenever it changes
  useEffect(() => {
    if (create.error) {
      console.error("[Admin] createMarket error completo:", create.error);
    }
  }, [create.error]);

  const handleCreate = () => {
    if (!question || !closeDate || !resolveDate) return;

    const closeTs = dateToTimestamp(closeDate);
    const resolveTs = dateToTimestamp(resolveDate);
    const now = BigInt(Math.floor(Date.now() / 1000));

    // Debug log — visible en DevTools > Console
    console.log("[Admin] createMarket params:", {
      question,
      closeTime: String(closeTs),
      resolveTime: String(resolveTs),
      nowUnix: String(now),
      closeDateLocal: new Date(Number(closeTs) * 1000).toISOString(),
      resolveDateLocal: new Date(Number(resolveTs) * 1000).toISOString(),
      closeIsFuture: closeTs > now,
      resolveIsAtLeast1hAfterClose: resolveTs >= closeTs + 3600n,
    });

    create.createMarket(question, closeTs, resolveTs);
  };

  const handleResolve = () => {
    if (!resolveId) return;
    resolve.resolve(BigInt(resolveId), resolveResult);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted">Conecta tu wallet para acceder al panel admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Panel Admin</h1>
        <p className="text-muted text-sm">
          Wallet: {address?.slice(0, 8)}…{address?.slice(-6)} · Mercados totales: {String(count)}
        </p>
      </div>

      {/* Create market */}
      <div className="p-6 rounded-xl bg-surface border border-border">
        <h2 className="font-semibold text-foreground mb-4">Crear mercado</h2>

        {address && <div className="mb-4"><RoleStatus address={address} /></div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Pregunta</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Ganará el Real Madrid la Champions 2025?"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* ── Cierre de apuestas ──────────────────────────── */}
          <div>
            <label className="block text-xs text-muted mb-1">Cierre de apuestas</label>
            <input
              type="datetime-local"
              value={closeDate}
              min={toDatetimeLocal(new Date())}
              onChange={(e) => {
                setCloseDate(e.target.value);
                // Auto-sugerir resolución 2h después del nuevo cierre
                if (e.target.value) setResolveDate(addSeconds(e.target.value, 7_200));
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2"
            />
            {/* Presets rápidos desde ahora */}
            <div className="flex gap-2 flex-wrap">
              {CLOSE_PRESETS.map(({ label, s }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const v = addSeconds(null, s);
                    setCloseDate(v);
                    setResolveDate(addSeconds(v, 7_200));
                  }}
                  className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            {closeDate && (
              <p className="text-xs text-muted mt-1">
                {new Date(closeDate).toLocaleString("es", { dateStyle: "full", timeStyle: "short" })}
              </p>
            )}
          </div>

          {/* ── Resolución mínima ────────────────────────────── */}
          <div>
            <label className="block text-xs text-muted mb-1">Resolución mínima</label>
            <input
              type="datetime-local"
              value={resolveDate}
              min={closeDate ? addSeconds(closeDate, 3_600) : toDatetimeLocal(new Date())}
              onChange={(e) => setResolveDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:border-accent focus:outline-none text-sm mb-2"
            />
            {/* Offsets relativos al cierre */}
            {closeDate && (
              <div className="flex gap-2 flex-wrap">
                {RESOLVE_OFFSETS.map(({ label, s }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setResolveDate(addSeconds(closeDate, s))}
                    className="px-2.5 py-1 rounded text-xs bg-surface-alt border border-border hover:border-accent text-muted hover:text-foreground transition-colors"
                  >
                    cierre {label}
                  </button>
                ))}
              </div>
            )}
            {resolveDate && closeDate && (
              (() => {
                const diffH = (new Date(resolveDate).getTime() - new Date(closeDate).getTime()) / 3_600_000;
                const ok = diffH >= 1;
                return (
                  <p className={`text-xs mt-1 ${ok ? "text-muted" : "text-danger"}`}>
                    {ok
                      ? `${new Date(resolveDate).toLocaleString("es", { dateStyle: "full", timeStyle: "short" })}`
                      : "⚠ Debe ser al menos 1 hora después del cierre"}
                  </p>
                );
              })()
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={!question || !closeDate || !resolveDate || isCreating || isWrongNetwork}
            title={isWrongNetwork ? "Cambia a Polygon Amoy para continuar" : undefined}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {isCreating ? "Creando…" : "Crear mercado"}
          </button>

          {create.hash && <div className="text-center"><TxLink hash={create.hash} /></div>}
          {create.isSuccess && <p className="text-xs text-success text-center">¡Mercado creado!</p>}

          {create.error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 space-y-1">
              <p className="text-xs text-danger font-semibold">
                {create.error.message.includes("User rejected")
                  ? "Transacción rechazada por el usuario."
                  : "Error del contrato:"}
              </p>
              {!create.error.message.includes("User rejected") && (
                <p className="text-xs text-danger/80 font-mono break-all">
                  {extractRevertReason(create.error)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolve market */}
      <div className="p-6 rounded-xl bg-surface border border-border">
        <h2 className="font-semibold text-foreground mb-5">Resolver mercado</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">ID del mercado</label>
            <input
              type="number"
              min="1"
              value={resolveId}
              onChange={(e) => setResolveId(e.target.value)}
              placeholder="1"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-3">Resultado</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setResolveResult(true)}
                className={`py-3 rounded-lg font-semibold text-sm transition-all ${
                  resolveResult ? "bg-success text-white" : "bg-success/10 text-success border border-success/30"
                }`}
              >
                SÍ ganó
              </button>
              <button
                onClick={() => setResolveResult(false)}
                className={`py-3 rounded-lg font-semibold text-sm transition-all ${
                  !resolveResult ? "bg-danger text-white" : "bg-danger/10 text-danger border border-danger/30"
                }`}
              >
                NO ganó
              </button>
            </div>
          </div>

          <button
            onClick={handleResolve}
            disabled={!resolveId || isResolving || isWrongNetwork}
            title={isWrongNetwork ? "Cambia a Polygon Amoy para continuar" : undefined}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {isResolving ? "Resolviendo…" : "Resolver mercado"}
          </button>

          {resolve.hash && <div className="text-center"><TxLink hash={resolve.hash} /></div>}
          {resolve.isSuccess && <p className="text-xs text-success text-center">¡Mercado resuelto!</p>}

          {resolve.error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 space-y-1">
              <p className="text-xs text-danger font-semibold">
                {resolve.error.message.includes("User rejected")
                  ? "Transacción rechazada por el usuario."
                  : "Error del contrato:"}
              </p>
              {!resolve.error.message.includes("User rejected") && (
                <p className="text-xs text-danger/80 font-mono break-all">
                  {extractRevertReason(resolve.error)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
