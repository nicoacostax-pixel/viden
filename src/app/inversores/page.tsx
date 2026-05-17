"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Data ──────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: "🏦",
    title: "Mercados cerrados",
    desc: "Las casas de apuestas tradicionales capturan toda la ganancia. El usuario siempre pierde contra la banca.",
  },
  {
    icon: "🌎",
    title: "LATAM desatendido",
    desc: "Más de 650 millones de hispanohablantes sin acceso a plataformas de predicción en su idioma y moneda.",
  },
  {
    icon: "🔒",
    title: "Barrera cripto",
    desc: "Los mercados de predicción web3 requieren wallet y conocimientos técnicos. El usuario promedio se pierde.",
  },
];

const SOLUTION_POINTS = [
  { icon: "⚡", text: "Cuenta custodial — sin wallet, sin fricción. Registro en 30 segundos." },
  { icon: "⚽", text: "Mercados de deportes, cripto, política y cultura en tiempo real." },
  { icon: "📈", text: "Precio algorítmico LMSR: el mercado fija las probabilidades, no la casa." },
  { icon: "🤖", text: "Mercados automáticos: BTC en 5 minutos, resultados de fútbol sin intervención humana." },
];

const REVENUE_STREAMS = [
  { pct: "2–5%", label: "Comisión del creador por mercado resuelto" },
  { pct: "15%", label: "Comisión de plataforma sobre cada apuesta custodial" },
  { pct: "∞", label: "Token VDN: compras, bonos de bienvenida y torneos" },
  { pct: "B2B", label: "Licencia white-label para operadores y medios deportivos" },
];

const PROJECTIONS = [
  { year: "Año 1", users: "10,000", vol: "$500K", rev: "$25K" },
  { year: "Año 2", users: "80,000", vol: "$6M",   rev: "$300K" },
  { year: "Año 3", users: "400,000", vol: "$40M",  rev: "$2M" },
];

const ROADMAP = [
  { q: "Q2 2025", done: true,  text: "MVP: mercados binarios custodiales, torneos, BTC live" },
  { q: "Q3 2025", done: true,  text: "Deportes en vivo con resolución automática" },
  { q: "Q4 2025", done: false, text: "App móvil iOS / Android + notificaciones push" },
  { q: "Q1 2026", done: false, text: "Mercados multi-outcome, ligas privadas y API pública" },
  { q: "Q2 2026", done: false, text: "Expansión Brasil (PT) + integración fiat MercadoPago" },
];

const MARKET_STATS = [
  { value: "$200B+", label: "Tamaño del mercado global de predicciones" },
  { value: "650M+",  label: "Hispanohablantes sin plataforma dedicada" },
  { value: "3×",     label: "Crecimiento anual de Polymarket en 2024" },
  { value: "$2B+",   label: "Volumen Polymarket en solo el primer trimestre de 2025" },
];

// ── Components ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-accent-light bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mb-4">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight mb-4">
      {children}
    </h2>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API}/api/investors/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  };

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-10 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-foreground mb-2">Mensaje recibido</h3>
        <p className="text-muted text-sm">Nos pondremos en contacto contigo en menos de 24 horas.</p>
      </div>
    );
  }

  const inputCls = "w-full bg-surface-alt border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors";

  return (
    <form onSubmit={submit} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Nombre *</label>
          <input required value={form.name} onChange={set("name")} placeholder="Tu nombre" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Email *</label>
          <input required type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Empresa / Fondo</label>
        <input value={form.company} onChange={set("company")} placeholder="Nombre de tu empresa o fondo (opcional)" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">Mensaje *</label>
        <textarea
          required
          value={form.message}
          onChange={set("message")}
          placeholder="Cuéntanos sobre tu interés en Viden, ticket de inversión aproximado, o cualquier pregunta…"
          rows={5}
          className={`${inputCls} resize-none`}
        />
      </div>
      {status === "err" && (
        <p className="text-danger text-sm">Error al enviar. Escríbenos directamente a <span className="underline">taller.organico.casa@gmail.com</span></p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 text-sm tracking-wide"
      >
        {status === "sending" ? "Enviando…" : "Enviar mensaje →"}
      </button>
      <p className="text-center text-xs text-muted">Respondemos en menos de 24 horas.</p>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvestorsPage() {
  return (
    <div className="min-h-screen bg-[#0D1F10] text-foreground">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0D1F10]/80 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">Viden<span className="text-accent-light">Play</span></span>
          </Link>
          <a
            href="#contacto"
            className="text-xs font-bold bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full transition-colors"
          >
            Hablar con el equipo
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14">

        {/* ── HERO ── */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center text-center py-24 relative">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-semibold border border-accent/30 bg-accent/10 text-accent-light px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Buscando inversión seed — Ronda abierta 2025
            </div>

            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-none mb-6">
              El Polymarket<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-light to-success">
                de Latinoamérica
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-[#8A9E8D] max-w-2xl mx-auto leading-relaxed mb-10">
              Viden es la primera plataforma de mercados de predicción en español — sin wallet, sin fricción, con resolución automática por IA y datos en tiempo real.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#contacto"
                className="bg-accent hover:bg-accent-hover text-white font-bold px-8 py-3.5 rounded-full text-sm transition-colors"
              >
                Solicitar deck →
              </a>
              <a
                href="#como-funciona"
                className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full text-sm transition-colors"
              >
                Ver demo
              </a>
            </div>
          </div>
        </section>

        {/* ── MARKET STATS ── */}
        <section className="py-16 border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {MARKET_STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-[#8A9E8D] leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROBLEMA ── */}
        <section className="py-20 border-t border-white/5">
          <div className="text-center mb-12">
            <SectionLabel>El problema</SectionLabel>
            <SectionTitle>Un mercado de $200B sin<br />solución para LATAM</SectionTitle>
            <p className="text-[#8A9E8D] max-w-xl mx-auto text-base">
              Las plataformas de predicción globales ignoran a los 650 millones de hispanohablantes. La barrera de entrada es enorme y la confianza, mínima.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PROBLEMS.map(p => (
              <div key={p.title} className="rounded-2xl bg-surface border border-border p-6">
                <div className="text-3xl mb-4">{p.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-[#8A9E8D] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SOLUCIÓN ── */}
        <section id="como-funciona" className="py-20 border-t border-white/5">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel>La solución</SectionLabel>
              <SectionTitle>Predicciones para todos,<br />no solo para expertos</SectionTitle>
              <p className="text-[#8A9E8D] text-base leading-relaxed mb-8">
                Viden elimina cada barrera de entrada: no se necesita wallet, no se necesita criptomoneda, no se necesita conocimiento técnico. Solo tu intuición y una cuenta.
              </p>
              <div className="flex flex-col gap-4">
                {SOLUTION_POINTS.map(s => (
                  <div key={s.text} className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                    <span className="text-sm text-[#D4E8D8] leading-relaxed">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-surface border border-border overflow-hidden">
              {/* Mock product screenshot */}
              <div className="bg-[#152018] px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  <span className="ml-2 text-xs text-[#6B7D6E]">videnplay.com/market/42</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚽</span>
                  <span className="text-xs font-bold text-accent-light bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Deportes</span>
                </div>
                <p className="text-base font-bold text-white">¿Ganará el Real Madrid la Champions 2025?</p>
                <div className="h-24 bg-[#1B2A1E] rounded-xl flex items-end px-3 pb-2 gap-1 overflow-hidden">
                  {[45,48,52,50,55,60,58,63,61,67,65,70,68,72].map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${v}%`, background: `rgba(16,185,129,${0.3 + i*0.05})` }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-center">
                    <div className="text-xs text-[#8A9E8D] mb-1">Paga SÍ</div>
                    <div className="text-xl font-extrabold text-success">1.45x</div>
                    <div className="text-[10px] text-[#8A9E8D] mt-0.5">69% prob.</div>
                  </div>
                  <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-center">
                    <div className="text-xs text-[#8A9E8D] mb-1">Paga NO</div>
                    <div className="text-xl font-extrabold text-danger">3.22x</div>
                    <div className="text-[10px] text-[#8A9E8D] mt-0.5">31% prob.</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-success/20 hover:bg-success/30 border border-success/30 text-success text-xs font-bold py-2.5 rounded-xl transition-colors">
                    Apostar SÍ
                  </button>
                  <button className="flex-1 bg-danger/20 hover:bg-danger/30 border border-danger/30 text-danger text-xs font-bold py-2.5 rounded-xl transition-colors">
                    Apostar NO
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MODELO DE NEGOCIO ── */}
        <section className="py-20 border-t border-white/5">
          <div className="text-center mb-12">
            <SectionLabel>Modelo de negocio</SectionLabel>
            <SectionTitle>Múltiples fuentes<br />de ingresos</SectionTitle>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {REVENUE_STREAMS.map(r => (
              <div key={r.label} className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-3">
                <div className="text-3xl font-black text-accent-light">{r.pct}</div>
                <p className="text-sm text-[#8A9E8D] leading-snug">{r.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROYECCIONES ── */}
        <section className="py-20 border-t border-white/5">
          <div className="text-center mb-12">
            <SectionLabel>Proyecciones</SectionLabel>
            <SectionTitle>Camino hacia<br />la rentabilidad</SectionTitle>
            <p className="text-[#8A9E8D] max-w-lg mx-auto text-sm">Proyecciones conservadoras basadas en tasas de crecimiento comparables de Polymarket y Augur en sus primeros 3 años.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#6B7D6E] uppercase tracking-wide">Período</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-[#6B7D6E] uppercase tracking-wide">Usuarios</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-[#6B7D6E] uppercase tracking-wide">Volumen</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-[#6B7D6E] uppercase tracking-wide">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTIONS.map((p, i) => (
                  <tr key={p.year} className={`border-b border-white/5 ${i === PROJECTIONS.length - 1 ? "bg-accent/5" : ""}`}>
                    <td className="py-4 px-4 font-bold text-white text-sm">{p.year}</td>
                    <td className="py-4 px-4 text-right text-sm text-[#D4E8D8]">{p.users}</td>
                    <td className="py-4 px-4 text-right text-sm text-success font-semibold">{p.vol}</td>
                    <td className="py-4 px-4 text-right text-sm text-accent-light font-semibold">{p.rev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── ROADMAP ── */}
        <section className="py-20 border-t border-white/5">
          <div className="text-center mb-12">
            <SectionLabel>Roadmap</SectionLabel>
            <SectionTitle>Lo que hemos construido<br />y hacia dónde vamos</SectionTitle>
          </div>
          <div className="relative flex flex-col gap-0">
            {/* vertical line */}
            <div className="absolute left-[19px] sm:left-[23px] top-3 bottom-3 w-px bg-white/10" />
            {ROADMAP.map((item) => (
              <div key={item.q} className="flex items-start gap-5 py-4 pl-1">
                <div className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 ${
                  item.done
                    ? "bg-success/20 border-success/60"
                    : "bg-surface border-border"
                }`}>
                  {item.done
                    ? <span className="text-success text-sm">✓</span>
                    : <span className="w-2 h-2 rounded-full bg-border block" />
                  }
                </div>
                <div className="pt-1.5">
                  <span className={`text-xs font-bold uppercase tracking-widest ${item.done ? "text-success" : "text-[#6B7D6E]"}`}>
                    {item.q}
                  </span>
                  <p className="text-sm text-[#D4E8D8] mt-0.5 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── POR QUÉ AHORA ── */}
        <section className="py-20 border-t border-white/5">
          <div className="rounded-2xl bg-gradient-to-br from-accent/10 via-surface to-surface border border-accent/20 p-8 sm:p-12 text-center">
            <SectionLabel>¿Por qué ahora?</SectionLabel>
            <SectionTitle>El momento es ahora<br />o nunca</SectionTitle>
            <div className="grid sm:grid-cols-3 gap-6 mt-10 text-left">
              <div className="space-y-2">
                <div className="text-2xl">📊</div>
                <h4 className="font-bold text-white text-sm">Categoría validada</h4>
                <p className="text-xs text-[#8A9E8D] leading-relaxed">Polymarket procesó más de $2B en Q1 2025. El mercado existe y crece. Solo falta la versión para LATAM.</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">🏆</div>
                <h4 className="font-bold text-white text-sm">Ventana de oportunidad</h4>
                <p className="text-xs text-[#8A9E8D] leading-relaxed">Ningún competidor directo en español con UX mobile-first, sin cripto requerida y enfocado en deportes locales.</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">🚀</div>
                <h4 className="font-bold text-white text-sm">Producto funcional hoy</h4>
                <p className="text-xs text-[#8A9E8D] leading-relaxed">No es una idea. El producto está en producción con mercados activos, torneos y resolución automática.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACTO ── */}
        <section id="contacto" className="py-20 border-t border-white/5">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <SectionLabel>Contacto</SectionLabel>
            <SectionTitle>¿Te interesa<br />invertir en Viden?</SectionTitle>
            <p className="text-[#8A9E8D] text-base">
              Estamos buscando inversores seed que compartan la visión de democratizar las predicciones para el mundo hispanohablante. Escríbenos y te enviamos el deck completo.
            </p>
          </div>
          <div className="max-w-xl mx-auto">
            <ContactForm />
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7D6E]">
          <span className="font-bold text-white/40">VidenPlay © 2025</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition-colors">Ir a la plataforma →</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
