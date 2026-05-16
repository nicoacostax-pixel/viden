"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiCreateMarket, ApiError } from "@/lib/custodialApi";

const CATEGORIES = [
  "Deportes", "Clima", "Política", "Cultura",
  "Entretenimiento", "Esports", "Local", "Otro",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  Deportes: "⚽", Clima: "🌤️", Política: "🗳️", Cultura: "🎵",
  Entretenimiento: "🎬", Esports: "🎮", Local: "📍", Otro: "🔮",
};

const CREATION_COST = 500;

function toDatetimeLocal(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

function PreviewCard({ question, category }: { question: string; category: string }) {
  const emoji = CATEGORY_EMOJI[category] ?? "🔮";
  const displayQ = question.trim() || "¿Tu pregunta aparecerá aquí?";
  return (
    <div className="p-4 rounded-xl bg-surface border border-border flex flex-col gap-3 opacity-90">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{emoji}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-light border border-accent/20 font-medium">
          {category || "Categoría"}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-3">
        {displayQ}
      </h3>
      <div>
        <div className="h-1.5 rounded-full bg-danger/30 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-success" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-success font-medium">SÍ 50%</span>
          <span className="text-[11px] text-danger font-medium">NO 50%</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <span className="text-[11px] text-muted">Vol: <span className="text-foreground font-medium">0 VDN</span></span>
        <span className="text-[10px] text-accent-light font-medium">Tu mercado</span>
      </div>
    </div>
  );
}

export default function CrearMercado() {
  const router = useRouter();
  const { isLoggedIn, isLoading, token, user, balance, refreshBalance } = useAuth();

  const [question,   setQuestion]   = useState("");
  const [category,   setCategory]   = useState("Deportes");
  const [criteria,   setCriteria]   = useState("");
  const [closeDate,  setCloseDate]  = useState("");
  const [resolveDate, setResolveDate] = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState<{ market_id: number; public_id: string } | null>(null);

  const vdnBalance = balance?.balance_vdn ?? user?.balance_vdn ?? 0;
  const hasEnough  = vdnBalance >= CREATION_COST;

  // Default close = tomorrow, resolve = 2h after close
  useEffect(() => {
    const tomorrow = new Date(Date.now() + 25 * 3600 * 1000);
    const resolve  = new Date(tomorrow.getTime() + 2 * 3600 * 1000);
    setCloseDate(toDatetimeLocal(tomorrow));
    setResolveDate(toDatetimeLocal(resolve));
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login");
  }, [isLoading, isLoggedIn, router]);

  const minClose   = toDatetimeLocal(new Date(Date.now() + 24 * 3600 * 1000 + 60_000));
  const maxClose   = toDatetimeLocal(new Date(Date.now() + 90 * 24 * 3600 * 1000));
  const minResolve = closeDate ? toDatetimeLocal(new Date(new Date(closeDate).getTime() + 3600 * 1000)) : minClose;
  const maxResolve = closeDate ? toDatetimeLocal(new Date(new Date(closeDate).getTime() + 7 * 24 * 3600 * 1000)) : undefined;

  const questionErr  = question.length > 0 && question.length < 10 ? "La pregunta es muy corta (mínimo 10 caracteres)" : null;
  const criteriaErr  = criteria.length > 500 ? "Máximo 500 caracteres" : null;
  const canSubmit    = !submitting && question.length >= 10 && criteria.trim().length > 0 && closeDate && resolveDate && hasEnough;

  async function handleSubmit() {
    if (!token || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const closeTs   = Math.floor(new Date(closeDate).getTime() / 1000);
      const resolveTs = Math.floor(new Date(resolveDate).getTime() / 1000);
      const res = await apiCreateMarket(token, {
        question:             question.trim(),
        resolution_criteria:  criteria.trim(),
        category,
        close_time:           closeTs,
        resolve_time:         resolveTs,
      });
      await refreshBalance();
      setSuccess({ market_id: res.market_id, public_id: res.public_id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear el mercado");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <div className="text-center py-20 text-muted">Cargando…</div>;
  if (!isLoggedIn) return null;

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-foreground">¡Mercado enviado!</h1>
        <p className="text-muted text-sm leading-relaxed">
          Tu mercado <span className="font-mono text-accent-light">{success.public_id}</span> fue enviado a revisión.<br />
          Será aprobado en menos de 24 horas y luego aparecerá públicamente.
        </p>
        <p className="text-sm text-muted">Se descontaron <span className="font-semibold text-foreground">500 VDN</span> de tu saldo (te los devolvemos al resolver el mercado).</p>
        <div className="flex justify-center gap-3">
          <Link href="/mis-mercados"
            className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
            Ver mis mercados
          </Link>
          <Link href="/"
            className="px-5 py-2.5 rounded-lg bg-surface border border-border text-sm font-medium hover:border-accent transition-colors">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Crear un mercado de predicción</h1>
        <p className="text-muted text-sm">Costo: <span className="font-semibold text-foreground">500 VDN</span> · Ganas <span className="font-semibold text-foreground">2% del pool</span> si se resuelve</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Form */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Balance warning */}
          {!hasEnough && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
              <span className="text-danger text-lg">⚠</span>
              <div>
                <p className="text-sm text-danger font-medium">No tienes suficientes VDN</p>
                <p className="text-xs text-muted mt-0.5">
                  Tienes {vdnBalance.toLocaleString("es", { maximumFractionDigits: 0 })} VDN y necesitas {CREATION_COST}.
                </p>
                <Link href="/wallet" className="text-xs text-accent-light underline mt-1 inline-block">Comprar VDN →</Link>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
          )}

          {/* 1. Pregunta */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-sm font-medium text-foreground">Pregunta del mercado</label>
              <span className={`text-xs tabular-nums ${question.length > 140 ? "text-warning" : "text-muted"}`}>
                {question.length}/150
              </span>
            </div>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              maxLength={150}
              placeholder="¿Lloverá más de 10mm en Zacatecas este sábado?"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm"
            />
            {questionErr && <p className="text-xs text-danger mt-1">{questionErr}</p>}
          </div>

          {/* 2. Categoría */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
                    category === c
                      ? "border-accent bg-accent/10 text-accent-light"
                      : "border-border bg-background text-muted hover:border-accent/50 hover:text-foreground"
                  }`}
                >
                  <span className="text-xl leading-none">{CATEGORY_EMOJI[c]}</span>
                  <span className="text-[11px] font-medium leading-tight">{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Criterio de resolución */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-sm font-medium text-foreground">Criterio de resolución</label>
              <span className={`text-xs tabular-nums ${criteria.length > 460 ? "text-warning" : "text-muted"}`}>
                {criteria.length}/500
              </span>
            </div>
            <textarea
              value={criteria}
              onChange={e => setCriteria(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={`Este mercado se resolverá como SÍ si los datos oficiales de CONAGUA registran más de 10mm de lluvia en Zacatecas capital el sábado 17 de mayo de 2026`}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-none"
            />
            {criteriaErr
              ? <p className="text-xs text-danger mt-1">{criteriaErr}</p>
              : <p className="text-xs text-muted mt-1">Sé específico — un criterio claro evita disputas</p>
            }
          </div>

          {/* 4. Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cierre de apuestas</label>
              <input
                type="datetime-local"
                value={closeDate}
                min={minClose}
                max={maxClose}
                onChange={e => {
                  setCloseDate(e.target.value);
                  if (e.target.value) {
                    const r = new Date(new Date(e.target.value).getTime() + 2 * 3600 * 1000);
                    setResolveDate(toDatetimeLocal(r));
                  }
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-accent transition-colors text-sm"
              />
              <p className="text-xs text-muted mt-1">Mín: mañana · Máx: 90 días</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fecha de resolución</label>
              <input
                type="datetime-local"
                value={resolveDate}
                min={minResolve}
                max={maxResolve}
                onChange={e => setResolveDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-accent transition-colors text-sm"
              />
              <p className="text-xs text-muted mt-1">Mín: cierre +1h · Máx: cierre +7d</p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Enviando…" : `Crear mercado — ${CREATION_COST} VDN`}
            </button>
            <p className="text-xs text-center text-muted mt-2">Tu mercado será revisado en menos de 24 horas</p>
          </div>
        </div>

        {/* Preview */}
        <div className="hidden lg:block w-60 shrink-0 sticky top-6">
          <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Vista previa</p>
          <PreviewCard question={question} category={category} />
          <div className="mt-4 p-3 rounded-lg bg-surface border border-border space-y-2 text-xs">
            <p className="text-muted font-medium">Desglose por apuesta:</p>
            <div className="space-y-1 text-muted">
              <div className="flex justify-between"><span>🔥 Quema</span><span>2%</span></div>
              <div className="flex justify-between"><span>🏦 Treasury</span><span>2%</span></div>
              <div className="flex justify-between"><span>💰 Tu fee</span><span className="text-accent-light">2%</span></div>
              <div className="flex justify-between font-medium text-foreground border-t border-border pt-1"><span>Pool</span><span>94%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
