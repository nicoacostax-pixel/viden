"use client";

import { useEffect, useState } from "react";
import { apiGetMyAchievements, type Achievement } from "@/lib/custodialApi";
import { useAuth } from "@/context/AuthContext";

// Hardcoded so siempre se muestran aunque la API falle
const ALL_ACHIEVEMENTS: Achievement[] = [
  { slug: "primera_apuesta",  name: "Primera Apuesta",    description: "Realizaste tu primera apuesta",                icon: "🎯", rarity: "common"    },
  { slug: "racha_3_dias",     name: "Racha de 3 días",    description: "Apostaste 3 días seguidos",                    icon: "🔥", rarity: "common"    },
  { slug: "racha_7_dias",     name: "Racha de 7 días",    description: "Apostaste 7 días seguidos",                    icon: "⚡", rarity: "rare"      },
  { slug: "ballena",          name: "Ballena",             description: "Apostaste 1,000 VDN en una sola apuesta",      icon: "🐋", rarity: "rare"      },
  { slug: "tiburon",          name: "Tiburón",             description: "Apostaste 5,000 VDN en una sola apuesta",      icon: "🦈", rarity: "epic"      },
  { slug: "contrarian",       name: "Contrarian",          description: "Ganaste apostando contra la mayoría (< 30%)",  icon: "🧠", rarity: "epic"      },
  { slug: "vidente",          name: "Vidente",             description: "Ganaste 10 apuestas",                          icon: "🔮", rarity: "rare"      },
  { slug: "racha_ganadora_5", name: "En Llamas",           description: "Ganaste 5 apuestas seguidas",                  icon: "🏆", rarity: "epic"      },
  { slug: "referidor",        name: "Conector",            description: "Referiste a alguien",                          icon: "🤝", rarity: "common"    },
  { slug: "multi_referidor",  name: "Influencer",          description: "Referiste a 5 personas",                       icon: "📢", rarity: "rare"      },
  { slug: "mercado_creador",  name: "Creador de Mercados", description: "Creaste tu primer mercado",                    icon: "🏗️", rarity: "common"   },
  { slug: "gran_ganador",     name: "Gran Ganador",        description: "Ganaste más de 10,000 VDN en total",           icon: "💰", rarity: "legendary" },
  { slug: "platino",          name: "Leyenda Platino",     description: "Desbloqueaste todos los demás logros (+10,000 VDN)", icon: "💎", rarity: "legendary" },
];

const RARITY_LABEL: Record<string, string> = {
  common:    "Común",
  rare:      "Raro",
  epic:      "Épico",
  legendary: "Legendario",
};

const RARITY_STYLE: Record<string, string> = {
  common:    "border-border bg-surface",
  rare:      "border-blue-500/40 bg-blue-500/5",
  epic:      "border-purple-500/40 bg-purple-500/5",
  legendary: "border-yellow-500/40 bg-yellow-500/5",
};

const RARITY_TAG: Record<string, string> = {
  common:    "bg-border/60 text-muted",
  rare:      "bg-blue-500/20 text-blue-400",
  epic:      "bg-purple-500/20 text-purple-400",
  legendary: "bg-yellow-500/20 text-yellow-400",
};

function BadgeCard({ ach, earned }: { ach: Achievement; earned: boolean }) {
  const isPlatino = ach.slug === "platino";

  if (isPlatino) {
    return (
      <div
        className={[
          "relative rounded-xl border p-5 flex items-center gap-5 transition-all duration-200",
          earned
            ? "border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 via-surface to-yellow-500/5"
            : "border-border/30 bg-surface/40 opacity-40 grayscale",
        ].join(" ")}
      >
        {earned && (
          <div className="absolute top-3 right-3">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${RARITY_TAG[ach.rarity]}`}>
              {RARITY_LABEL[ach.rarity]}
            </span>
          </div>
        )}
        <span className="text-5xl leading-none shrink-0">{ach.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-bold leading-tight ${earned ? "text-foreground" : "text-muted"}`}>
            {ach.name}
          </p>
          <p className="text-sm text-muted mt-1 leading-snug">{ach.description}</p>
          {earned && (
            <p className="text-xs text-success font-semibold mt-2">✓ Obtenido</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "relative rounded-xl border p-4 h-full flex flex-col items-center gap-2 text-center transition-all duration-200",
        earned
          ? RARITY_STYLE[ach.rarity]
          : "border-border/30 bg-surface/40 opacity-40 grayscale",
      ].join(" ")}
    >
      {earned && (
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${RARITY_TAG[ach.rarity]}`}>
            {RARITY_LABEL[ach.rarity]}
          </span>
        </div>
      )}
      <span className="text-4xl leading-none">{ach.icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-bold leading-tight ${earned ? "text-foreground" : "text-muted"}`}>
          {ach.name}
        </p>
        <p className="text-xs text-muted mt-1 leading-snug">{ach.description}</p>
      </div>
      {earned && (
        <p className="text-[10px] text-success font-semibold pt-1">✓ Obtenido</p>
      )}
    </div>
  );
}

export default function LogrosPage() {
  const { token, isLoggedIn } = useAuth();
  const [earned, setEarned]   = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setLoading(false);
      return;
    }
    apiGetMyAchievements(token)
      .then(d => setEarned(new Set(d.earned.map(a => a.slug))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, token]);

  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const platino = ALL_ACHIEVEMENTS.find(a => a.slug === "platino")!;
  const rest = ALL_ACHIEVEMENTS.filter(a => a.slug !== "platino");
  const sorted = [...rest].sort((a, b) => {
    const ea = earned.has(a.slug) ? -1 : 1;
    const eb = earned.has(b.slug) ? -1 : 1;
    if (ea !== eb) return ea - eb;
    return (rarityOrder[a.rarity] ?? 3) - (rarityOrder[b.rarity] ?? 3);
  });

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">🏅 Logros</h1>
        <p className="text-sm text-muted mt-1">
          {isLoggedIn
            ? loading
              ? "Cargando tus logros…"
              : `${earned.size} de ${ALL_ACHIEVEMENTS.length} logros desbloqueados`
            : "Inicia sesión para ver cuáles has desbloqueado"}
        </p>
      </div>

      {!isLoggedIn && (
        <div className="mb-5 rounded-xl bg-accent/10 border border-accent/30 px-4 py-3 text-sm text-accent-light">
          Inicia sesión para ver qué logros has desbloqueado.
        </div>
      )}

      {/* Grid de logros normales — todos con el mismo height */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sorted.map(ach => (
          <BadgeCard key={ach.slug} ach={ach} earned={!loading && earned.has(ach.slug)} />
        ))}
      </div>

      {/* Platino — siempre full width al final */}
      <div className="mt-3">
        <BadgeCard ach={platino} earned={!loading && earned.has("platino")} />
      </div>
    </div>
  );
}
