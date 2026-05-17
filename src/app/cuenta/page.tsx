"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiUpdateProfile, apiChangePassword, apiGetMyBets,
} from "@/lib/custodialApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es", { maximumFractionDigits: 0 });
}
function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, username, size = 80 }: { src?: string | null; username: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = username.slice(0, 2).toUpperCase();
  const colors = ["from-violet-500 to-indigo-600", "from-pink-500 to-rose-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-cyan-500 to-blue-600"];
  const gradient = colors[username.charCodeAt(0) % colors.length];

  if (src && !err) {
    return (
      <img src={src} alt={username} onError={() => setErr(true)}
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-surface border border-border">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}

// ── Bet row ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-blue-500/15 text-blue-400",
  won:       "bg-success/15 text-success",
  claimed:   "bg-success/15 text-success",
  lost:      "bg-danger/15 text-danger",
  cancelled: "bg-border text-muted",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activa", won: "Ganada", claimed: "Cobrada", lost: "Perdida", cancelled: "Cancelada",
};

function BetRow({ bet }: { bet: any }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <span className="text-xl shrink-0">{bet.emoji ?? "🔮"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground font-medium leading-snug line-clamp-2">{bet.question}</p>
        <p className="text-[11px] text-muted mt-0.5">{fmtDate(bet.created_at)} · {bet.side === "yes" ? "SÍ" : "NO"}</p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[bet.status] ?? "bg-border text-muted"}`}>
          {STATUS_LABEL[bet.status] ?? bet.status}
        </span>
        <p className="text-xs font-semibold text-foreground tabular-nums">
          {(bet.status === "won" || bet.status === "claimed") ? `+${fmt(bet.reward_vdn)}` : fmt(bet.amount_vdn_gross)} VDN
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CuentaPage() {
  const { user, token, balance, logout, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  const [bets, setBets]           = useState<any[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  // Profile form
  const [username, setUsername]   = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [curPwd, setCurPwd]       = useState("");
  const [newPwd, setNewPwd]       = useState("");
  const [confPwd, setConfPwd]     = useState("");
  const [pwdMsg, setPwdMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login");
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setAvatarUrl((user as any).avatar_url ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    apiGetMyBets(token)
      .then(d => setBets(d.bets ?? []))
      .catch(() => {})
      .finally(() => setBetsLoading(false));
  }, [token]);

  async function saveProfile() {
    if (!token) return;
    setSavingProfile(true); setProfileMsg(null);
    try {
      const res = await apiUpdateProfile(token, {
        username: username !== user?.username ? username : undefined,
        avatar_url: avatarUrl !== ((user as any)?.avatar_url ?? "") ? (avatarUrl || "") : undefined,
      });
      // Update token in localStorage so auth context picks it up
      localStorage.setItem("viden-auth-token", res.token);
      setProfileMsg({ ok: true, text: "Perfil actualizado" });
      // Reload to refresh AuthContext
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      setProfileMsg({ ok: false, text: e.message });
    } finally { setSavingProfile(false); }
  }

  async function savePassword() {
    if (!token) return;
    if (newPwd !== confPwd) { setPwdMsg({ ok: false, text: "Las contraseñas no coinciden" }); return; }
    if (newPwd.length < 8)  { setPwdMsg({ ok: false, text: "Mínimo 8 caracteres" }); return; }
    setSavingPwd(true); setPwdMsg(null);
    try {
      await apiChangePassword(token, curPwd, newPwd);
      setPwdMsg({ ok: true, text: "Contraseña actualizada" });
      setCurPwd(""); setNewPwd(""); setConfPwd("");
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e.message });
    } finally { setSavingPwd(false); }
  }

  if (isLoading || !user) {
    return <div className="flex items-center justify-center py-24"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>;
  }

  const vdn = (balance?.balance_vdn ?? (user as any).balance_vdn) ?? 0;
  const wonBets  = bets.filter(b => b.status === "won" || b.status === "claimed").length;
  const lostBets = bets.filter(b => b.status === "lost").length;
  const activeBets = bets.filter(b => b.status === "active").length;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">

      {/* Hero card */}
      <div className="relative rounded-3xl bg-surface border border-border overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Avatar src={(user as any).avatar_url} username={user.username ?? "?"} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-none">@{user.username}</h1>
            <p className="text-sm text-muted mt-1 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent-light border border-accent/20">
                {fmt(vdn)} VDN
              </span>
              <span className="text-xs text-muted">≈ ${(vdn * 0.01).toFixed(2)} USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Apuestas activas" value={String(activeBets)} />
        <StatCard label="Ganadas" value={String(wonBets)} />
        <StatCard label="Perdidas" value={String(lostBets)} />
      </div>

      {/* Historial */}
      <Section title="Historial de apuestas">
        {betsLoading ? (
          <div className="flex justify-center py-6"><div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : bets.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Sin apuestas aún</p>
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {bets.slice(0, 50).map(b => <BetRow key={b.id} bet={b} />)}
          </div>
        )}
      </Section>

      {/* Editar perfil */}
      <Section title="Editar perfil">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl || null} username={username || (user.username ?? "?")} size={56} />
            <div className="flex-1">
              <Field
                label="URL de foto de perfil"
                type="url"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <Field
            label="Nombre de usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="tu_usuario"
          />
          {profileMsg && (
            <p className={`text-xs ${profileMsg.ok ? "text-success" : "text-danger"}`}>{profileMsg.text}</p>
          )}
          <button onClick={saveProfile} disabled={savingProfile}
            className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </Section>

      {/* Cambiar contraseña */}
      <Section title="Cambiar contraseña">
        <div className="space-y-4">
          <Field label="Contraseña actual" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" />
          <Field label="Nueva contraseña" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
          <Field label="Confirmar nueva contraseña" type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="••••••••" />
          {pwdMsg && (
            <p className={`text-xs ${pwdMsg.ok ? "text-success" : "text-danger"}`}>{pwdMsg.text}</p>
          )}
          <button onClick={savePassword} disabled={savingPwd || !curPwd || !newPwd || !confPwd}
            className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {savingPwd ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </div>
      </Section>

      {/* Cerrar sesión */}
      <button onClick={() => { logout(); router.replace("/"); }}
        className="w-full py-3 rounded-2xl border border-danger/30 text-danger text-sm font-semibold hover:bg-danger/5 transition-colors">
        Cerrar sesión
      </button>

    </div>
  );
}
