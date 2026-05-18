"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Paleta
const CREAM  = "#F5EFE0";
const LGREEN = "#E8F4EC";
const WHITE  = "#FFFFFF";

const PROBLEMS = [
  { icon: "🏦", title: "Mercados cerrados", desc: "Las casas de apuestas tradicionales capturan toda la ganancia. El usuario siempre pierde contra la banca." },
  { icon: "🌎", title: "LATAM desatendido", desc: "Más de 650 millones de hispanohablantes sin acceso a plataformas de predicción en su idioma y moneda." },
  { icon: "🔒", title: "Barrera cripto", desc: "Los mercados de predicción web3 requieren wallet y conocimientos técnicos. El usuario promedio se pierde." },
];

const SOLUTION_POINTS = [
  { icon: "⚡", text: "Cuenta custodial — sin wallet, sin fricción. Registro en 30 segundos." },
  { icon: "⚽", text: "Mercados de deportes, cripto, política y cultura en tiempo real." },
  { icon: "📈", text: "Precio algorítmico LMSR: el mercado fija las probabilidades, no la casa." },
  { icon: "🤖", text: "Mercados automáticos: BTC en 5 minutos, resultados de fútbol sin intervención humana." },
];

const REVENUE_STREAMS = [
  { pct: "2–5%", label: "Comisión del creador por mercado resuelto" },
  { pct: "4%",   label: "Comisión de plataforma sobre cada apuesta custodial" },
  { pct: "∞",    label: "Token VDN: compras, bonos de bienvenida y torneos" },
  { pct: "B2B",  label: "Licencia white-label para operadores y medios deportivos" },
];

const PROJECTIONS = [
  { year: "Año 1", users: "10,000",  vol: "$500K", rev: "$25K" },
  { year: "Año 2", users: "80,000",  vol: "$6M",   rev: "$300K" },
  { year: "Año 3", users: "400,000", vol: "$40M",  rev: "$2M" },
];

const ROADMAP = [
  { q: "Q2 2026", done: true,  text: "MVP: mercados binarios custodiales, torneos, BTC live" },
  { q: "Q3 2026", done: true,  text: "Deportes en vivo con resolución automática" },
  { q: "Q4 2026", done: false, text: "App móvil iOS / Android + notificaciones push" },
  { q: "Q1 2027", done: false, text: "Mercados multi-outcome, ligas privadas y API pública" },
  { q: "Q2 2027", done: false, text: "Expansión Brasil (PT) + integración fiat MercadoPago" },
];

const MARKET_STATS = [
  { value: "$200B+", label: "Tamaño del mercado global de predicciones" },
  { value: "650M+",  label: "Hispanohablantes sin plataforma dedicada" },
  { value: "3×",     label: "Crecimiento anual de Polymarket en 2024" },
  { value: "$2B+",   label: "Volumen Polymarket en solo el primer trimestre de 2025" },
];

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
      <div style={{ background: WHITE, border: "1.5px solid #B8D9C2", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h3 style={{ color: "#0F1E11", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Mensaje recibido</h3>
        <p style={{ color: "#5A6B5C", fontSize: 14 }}>Nos pondremos en contacto contigo en menos de 24 horas.</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: WHITE, border: "1.5px solid #C8D9CC",
    borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#0F1E11",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#5A6B5C",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em",
  };

  return (
    <form onSubmit={submit} style={{ background: WHITE, border: "1.5px solid #C8D9CC", borderRadius: 20, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Nombre *</label>
          <input required value={form.name} onChange={set("name")} placeholder="Tu nombre" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input required type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Empresa / Fondo</label>
        <input value={form.company} onChange={set("company")} placeholder="Nombre de tu empresa o fondo (opcional)" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Mensaje *</label>
        <textarea
          required value={form.message} onChange={set("message")} rows={5}
          placeholder="Cuéntanos sobre tu interés en Viden, ticket aproximado, o cualquier pregunta…"
          style={{ ...inputStyle, resize: "none" }}
        />
      </div>
      {status === "err" && (
        <p style={{ color: "#DC2626", fontSize: 13 }}>
          Error al enviar. Escríbenos a <strong>taller.organico.casa@gmail.com</strong>
        </p>
      )}
      <button
        type="submit" disabled={status === "sending"}
        style={{
          background: "#3D8A56", color: "#fff", border: "none", borderRadius: 12,
          padding: "14px 0", fontWeight: 700, fontSize: 15, cursor: "pointer",
          opacity: status === "sending" ? 0.6 : 1,
        }}
      >
        {status === "sending" ? "Enviando…" : "Enviar mensaje →"}
      </button>
      <p style={{ textAlign: "center", fontSize: 12, color: "#8A9E8D" }}>Respondemos en menos de 24 horas.</p>
    </form>
  );
}

// ── Shared section wrapper ────────────────────────────────────────────────────

function Section({ bg, children, id }: { bg: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ background: bg, width: "100%" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px" }}>
        {children}
      </div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: "#3D8A56", background: "rgba(61,138,86,0.10)",
      border: "1px solid rgba(61,138,86,0.25)",
      borderRadius: 99, padding: "4px 14px", marginBottom: 14,
    }}>
      {children}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, color: "#0F1E11", lineHeight: 1.15, marginBottom: 16 }}>
      {children}
    </h2>
  );
}

function Body({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p style={{ fontSize: 15, color: "#4A5C4C", lineHeight: 1.65, textAlign: center ? "center" : "left", maxWidth: center ? 560 : undefined, margin: center ? "0 auto" : undefined }}>
      {children}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvestorsPage() {
  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #D4DDD5",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#0F1E11" }}>
              Viden<span style={{ color: "#3D8A56" }}>Play</span>
            </span>
          </Link>
          <a
            href="#contacto"
            style={{
              background: "#3D8A56", color: "#fff", textDecoration: "none",
              fontSize: 12, fontWeight: 700, padding: "8px 18px",
              borderRadius: 99, transition: "background 0.15s",
            }}
          >
            Hablar con el equipo
          </a>
        </div>
      </nav>

      <div style={{ paddingTop: 56 }}>

        {/* ── HERO — CREAM ── */}
        <section style={{ background: CREAM, minHeight: "88vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 700, color: "#3D8A56",
              border: "1px solid rgba(61,138,86,0.3)", background: "rgba(61,138,86,0.08)",
              padding: "6px 16px", borderRadius: 99, marginBottom: 32,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2EA855", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              Buscando inversión seed — Ronda abierta 2026
            </div>

            <h1 style={{ fontSize: "clamp(36px,8vw,72px)", fontWeight: 900, color: "#0F1E11", lineHeight: 1.08, marginBottom: 24 }}>
              Predice el futuro.<br />
              <span style={{ color: "#3D8A56" }}>En tu idioma.</span>
            </h1>

            <p style={{ fontSize: "clamp(15px,2.2vw,19px)", color: "#4A5C4C", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 40px" }}>
              Viden es la primera plataforma de mercados de predicción en español — sin wallet, sin fricción, con resolución automática en tiempo real.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <a href="#contacto" style={{
                background: "#3D8A56", color: "#fff", textDecoration: "none",
                fontWeight: 700, fontSize: 14, padding: "14px 32px",
                borderRadius: 99, display: "inline-block",
              }}>
                Solicitar deck →
              </a>
              <a href="#como-funciona" style={{
                background: "transparent", color: "#0F1E11", textDecoration: "none",
                fontWeight: 600, fontSize: 14, padding: "14px 32px",
                borderRadius: 99, border: "1.5px solid #B8C8BA", display: "inline-block",
              }}>
                Ver cómo funciona
              </a>
            </div>
          </div>
        </section>

        {/* ── STATS — WHITE ── */}
        <Section bg={WHITE}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 32, textAlign: "center" }}>
            {MARKET_STATS.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#3D8A56", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "#5A6B5C", marginTop: 8, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── PROBLEMA — LIGHT GREEN ── */}
        <Section bg={LGREEN}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>El problema</Pill>
            <H2>Un mercado de $200B sin<br />solución para LATAM</H2>
            <Body center>
              Las plataformas de predicción globales ignoran a los 650 millones de hispanohablantes. La barrera de entrada es enorme y la confianza, mínima.
            </Body>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {PROBLEMS.map(p => (
              <div key={p.title} style={{
                background: WHITE, border: "1.5px solid #C8D9CC",
                borderRadius: 20, padding: "28px 24px",
              }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{p.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F1E11", marginBottom: 8 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: "#4A5C4C", lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SOLUCIÓN — CREAM ── */}
        <Section bg={CREAM} id="como-funciona">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 48, alignItems: "center" }}>
            <div>
              <Pill>La solución</Pill>
              <H2>Predicciones para todos,<br />no solo para expertos</H2>
              <Body>
                Viden elimina cada barrera de entrada: no se necesita wallet, no se necesita criptomoneda, no se necesita conocimiento técnico. Solo tu intuición y una cuenta.
              </Body>
              <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                {SOLUTION_POINTS.map(s => (
                  <div key={s.text} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
                    <span style={{ fontSize: 14, color: "#0F1E11", lineHeight: 1.6 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock card */}
            <div style={{ background: "#0B1A0C", borderRadius: 20, overflow: "hidden", border: "1.5px solid #1C301D" }}>
              <div style={{ background: "#152018", padding: "12px 16px", borderBottom: "1px solid #1C301D", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", opacity: 0.6, display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EAB308", opacity: 0.6, display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", opacity: 0.6, display: "inline-block" }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: "#4A6B4E" }}>videnplay.com/market/42</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>⚽</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#5CB87A", background: "rgba(92,184,122,0.12)", border: "1px solid rgba(92,184,122,0.25)", padding: "3px 10px", borderRadius: 99, letterSpacing: "0.12em", textTransform: "uppercase" }}>Deportes</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#F5EFE0" }}>¿Ganará el Real Madrid la Champions 2025?</p>
                <div style={{ height: 72, background: "#112012", borderRadius: 12, display: "flex", alignItems: "flex-end", padding: "0 10px 8px", gap: 3, overflow: "hidden" }}>
                  {[45,48,52,50,55,60,58,63,61,67,65,70,68,72].map((v, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: 3, height: `${v}%`, background: `rgba(46,168,85,${0.28 + i * 0.04})` }} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "rgba(46,168,85,0.12)", border: "1px solid rgba(46,168,85,0.25)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#9DB89F", marginBottom: 4 }}>Paga SÍ</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#2EA855" }}>1.45x</div>
                    <div style={{ fontSize: 10, color: "#9DB89F", marginTop: 2 }}>69% prob.</div>
                  </div>
                  <div style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#9DB89F", marginBottom: 4 }}>Paga NO</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#EF4444" }}>3.22x</div>
                    <div style={{ fontSize: 10, color: "#9DB89F", marginTop: 2 }}>31% prob.</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, background: "rgba(46,168,85,0.18)", border: "1px solid rgba(46,168,85,0.3)", color: "#2EA855", fontWeight: 700, fontSize: 12, padding: "10px 0", borderRadius: 10, cursor: "pointer" }}>
                    Apostar SÍ
                  </button>
                  <button style={{ flex: 1, background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.28)", color: "#EF4444", fontWeight: 700, fontSize: 12, padding: "10px 0", borderRadius: 10, cursor: "pointer" }}>
                    Apostar NO
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── MODELO DE NEGOCIO — WHITE ── */}
        <Section bg={WHITE}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>Modelo de negocio</Pill>
            <H2>Múltiples fuentes<br />de ingresos</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
            {REVENUE_STREAMS.map(r => (
              <div key={r.label} style={{
                background: CREAM, border: "1.5px solid #D9CEB5",
                borderRadius: 20, padding: "28px 24px",
              }}>
                <div style={{ fontSize: 34, fontWeight: 900, color: "#3D8A56", marginBottom: 10 }}>{r.pct}</div>
                <p style={{ fontSize: 14, color: "#4A5C4C", lineHeight: 1.55 }}>{r.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── PROYECCIONES — LIGHT GREEN ── */}
        <Section bg={LGREEN}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>Proyecciones</Pill>
            <H2>Camino hacia<br />la rentabilidad</H2>
            <Body center>
              Proyecciones conservadoras basadas en tasas de crecimiento comparables de Polymarket y Augur en sus primeros 3 años.
            </Body>
          </div>
          <div style={{ background: WHITE, borderRadius: 20, border: "1.5px solid #C8D9CC", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: CREAM }}>
                  <th style={{ textAlign: "left", padding: "14px 24px", fontSize: 11, fontWeight: 700, color: "#5A6B5C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Período</th>
                  <th style={{ textAlign: "right", padding: "14px 24px", fontSize: 11, fontWeight: 700, color: "#5A6B5C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Usuarios</th>
                  <th style={{ textAlign: "right", padding: "14px 24px", fontSize: 11, fontWeight: 700, color: "#5A6B5C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Volumen</th>
                  <th style={{ textAlign: "right", padding: "14px 24px", fontSize: 11, fontWeight: 700, color: "#5A6B5C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTIONS.map((p, i) => (
                  <tr key={p.year} style={{ borderTop: "1px solid #E0EBDE", background: i === PROJECTIONS.length - 1 ? "rgba(61,138,86,0.05)" : "transparent" }}>
                    <td style={{ padding: "18px 24px", fontWeight: 700, color: "#0F1E11", fontSize: 15 }}>{p.year}</td>
                    <td style={{ padding: "18px 24px", textAlign: "right", color: "#4A5C4C", fontSize: 14 }}>{p.users}</td>
                    <td style={{ padding: "18px 24px", textAlign: "right", color: "#2E6E42", fontWeight: 700, fontSize: 14 }}>{p.vol}</td>
                    <td style={{ padding: "18px 24px", textAlign: "right", color: "#3D8A56", fontWeight: 700, fontSize: 14 }}>{p.rev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── ROADMAP — CREAM ── */}
        <Section bg={CREAM}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>Roadmap</Pill>
            <H2>Lo que hemos construido<br />y hacia dónde vamos</H2>
          </div>
          <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
            <div style={{ position: "absolute", left: 19, top: 8, bottom: 8, width: 2, background: "#C8D9CC" }} />
            {ROADMAP.map(item => (
              <div key={item.q} style={{ display: "flex", gap: 20, paddingBottom: 28 }}>
                <div style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
                  background: item.done ? "#3D8A56" : WHITE,
                  border: `2px solid ${item.done ? "#3D8A56" : "#C8D9CC"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
                }}>
                  {item.done
                    ? <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>✓</span>
                    : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8D9CC", display: "inline-block" }} />
                  }
                </div>
                <div style={{ paddingTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: item.done ? "#3D8A56" : "#8A9E8D" }}>
                    {item.q}
                  </span>
                  <p style={{ fontSize: 14, color: "#0F1E11", marginTop: 4, lineHeight: 1.6 }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── POR QUÉ AHORA — WHITE ── */}
        <Section bg={WHITE}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>¿Por qué ahora?</Pill>
            <H2>El momento es ahora<br />o nunca</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
            {[
              { icon: "📊", title: "Categoría validada", desc: "Polymarket procesó más de $2B en Q1 2025. El mercado existe y crece. Solo falta la versión para LATAM." },
              { icon: "🏆", title: "Ventana de oportunidad", desc: "Ningún competidor directo en español con UX mobile-first, sin cripto requerida y enfocado en deportes locales." },
              { icon: "🚀", title: "Producto funcional hoy", desc: "No es una idea. El producto está en producción con mercados activos, torneos y resolución automática." },
            ].map(c => (
              <div key={c.title} style={{
                background: LGREEN, border: "1.5px solid #C8D9CC",
                borderRadius: 20, padding: "28px 24px",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0F1E11", marginBottom: 8 }}>{c.title}</h4>
                <p style={{ fontSize: 14, color: "#4A5C4C", lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── VALUACIÓN — CREAM ── */}
        <Section bg={CREAM}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>Valuación</Pill>
            <H2>Valuación pre-money<br /><span style={{ color: "#3D8A56" }}>$1.5M – $4M USD</span></H2>
            <Body center>
              Rango seed justificado por tracción, mercado y modelo. Negociable según perfil del inversor.
            </Body>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto" }}>
            {[
              {
                n: "1",
                title: "Producto en producción, no una idea",
                desc: "La plataforma está live con mercados activos, resolución automática, torneos y usuarios reales. El riesgo de ejecución ya está demostrado.",
              },
              {
                n: "2",
                title: "Mercado de $200B+ sin líder en español",
                desc: "650 millones de hispanohablantes no tienen una plataforma de predicciones dedicada. El TAM existe y está validado por el crecimiento global de la categoría.",
              },
              {
                n: "3",
                title: "Modelo de ingresos claro y probado",
                desc: "4% de fee por apuesta + comisión al creador. Sin depender de publicidad ni de subsidios. Ingresos desde el primer mercado resuelto.",
              },
              {
                n: "4",
                title: "Tecnología diferenciada",
                desc: "Precios algorítmicos LMSR, resolución automática por datos en tiempo real y cuenta custodial sin wallet. Barreras técnicas reales frente a copias.",
              },
              {
                n: "5",
                title: "Momento de mercado único",
                desc: "El interés global en mercados de predicción está en su punto más alto. Entrar ahora es capturar LATAM antes de que llegue un jugador con capital masivo.",
              },
            ].map(item => (
              <div key={item.n} style={{
                display: "flex", gap: 20, alignItems: "flex-start",
                background: WHITE, border: "1.5px solid #D9CEB5",
                borderRadius: 18, padding: "22px 24px",
              }}>
                <div style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
                  background: "#3D8A56", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 15,
                }}>
                  {item.n}
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "#0F1E11", marginBottom: 6 }}>{item.title}</h4>
                  <p style={{ fontSize: 14, color: "#4A5C4C", lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── CONTACTO — LIGHT GREEN ── */}
        <Section bg={LGREEN} id="contacto">
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", marginBottom: 40 }}>
            <Pill>Contacto</Pill>
            <H2>¿Te interesa<br />invertir en Viden?</H2>
            <Body center>
              Estamos buscando inversores seed que compartan la visión de democratizar las predicciones para el mundo hispanohablante. Escríbenos y te enviamos el deck completo.
            </Body>
          </div>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <ContactForm />
          </div>
        </Section>

        {/* ── FOOTER ── */}
        <footer style={{ background: CREAM, borderTop: "1px solid #D9CEB5", padding: "32px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1E11" }}>VidenPlay © 2026</span>
            <Link href="/" style={{ fontSize: 13, color: "#3D8A56", textDecoration: "none", fontWeight: 600 }}>
              Ir a la plataforma →
            </Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
