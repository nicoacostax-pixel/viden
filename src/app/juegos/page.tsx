"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const GAMES = [
  {
    href: "/juegos/snake",
    emoji: "🐍",
    title: "Snake",
    desc: "Come monedas VDN y evita las paredes. Gana hasta 300 VDN diarios.",
    badge: "Clásico",
    badgeColor: "text-accent-light bg-accent/10 border-accent/20",
    reward: "1 VDN / moneda",
    lives: "3 vidas",
  },
  {
    href: "/juegos/ruleta",
    emoji: "🎯",
    title: "Ruleta de Predicciones",
    desc: "Gira, cae en un mercado aleatorio, predice SÍ o NO. Si aciertas cuando resuelve, ganas VDN.",
    badge: "Nuevo",
    badgeColor: "text-success bg-success/10 border-success/20",
    reward: "15 VDN / acierto",
    lives: "5 giros/día",
  },
  {
    href: "/juegos/pickem",
    emoji: "⚽",
    title: "Pick'em Deportivo",
    desc: "Elige los resultados de hasta 5 partidos de la semana. Perfecta → jackpot de VDN.",
    badge: "Nuevo",
    badgeColor: "text-success bg-success/10 border-success/20",
    reward: "8 VDN / acierto · 60 VDN perfecta",
    lives: "1 vez/semana",
  },
];

export default function JuegosPage() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Juegos</h1>
        <p className="text-muted text-sm">Gana VDN jugando — todos los juegos son gratis para jugar.</p>
      </div>

      <div className="flex flex-col gap-4">
        {GAMES.map(g => (
          <Link key={g.href} href={g.href}>
            <div className="rounded-2xl bg-surface border border-border p-5 flex items-start gap-4 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer group">
              <div className="text-4xl shrink-0 mt-0.5">{g.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-foreground group-hover:text-accent-light transition-colors">{g.title}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${g.badgeColor}`}>
                    {g.badge}
                  </span>
                </div>
                <p className="text-sm text-muted leading-snug mb-3">{g.desc}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs text-success font-semibold bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                    {g.reward}
                  </span>
                  <span className="text-xs text-muted bg-surface-alt border border-border px-2.5 py-1 rounded-full">
                    {g.lives}
                  </span>
                </div>
              </div>
              <span className="text-muted group-hover:text-accent-light transition-colors text-lg shrink-0 mt-1">›</span>
            </div>
          </Link>
        ))}
      </div>

      {!isLoggedIn && (
        <div className="mt-8 rounded-xl bg-accent/10 border border-accent/20 px-5 py-4 text-center">
          <p className="text-sm text-muted mb-3">Inicia sesión para ganar VDN jugando</p>
          <Link href="/login" className="text-sm font-bold text-accent-light underline">Entrar →</Link>
        </div>
      )}
    </div>
  );
}
