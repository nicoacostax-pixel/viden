"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/custodialApi";

function WelcomeAnimation({ vdn }: { vdn: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm">
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="text-7xl">🎉</div>
        <h2 className="text-3xl font-black text-foreground">¡Bienvenido a Viden!</h2>
        <p className="text-accent-light text-xl font-bold">+{vdn.toLocaleString()} VDN de bienvenida</p>
        <p className="text-muted text-sm">Redirigiendo a tu wallet…</p>
      </div>
    </div>
  );
}

function RegistroForm() {
  const { register } = useAuth();
  const router       = useRouter();
  const params       = useSearchParams();

  const [email,     setEmail]     = useState("");
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [referral,  setReferral]  = useState(params.get("ref") ?? "");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [welcomeVdn, setWelcomeVdn] = useState<number | null>(null);

  useEffect(() => {
    if (welcomeVdn !== null) {
      const t = setTimeout(() => router.push("/wallet"), 2500);
      return () => clearTimeout(t);
    }
  }, [welcomeVdn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { welcomeVdn: vdn } = await register(email.trim(), password, username.trim(), referral.trim() || undefined);
      setWelcomeVdn(vdn);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  if (welcomeVdn !== null) return <WelcomeAnimation vdn={welcomeVdn} />;

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-8 h-8">
            <path fill="#818CF8" d="M 4 47 C 12 49, 24 73, 37 79 C 46 83, 55 64, 66 38 L 79 10 L 97 2 L 86 18 L 76 42 C 65 66, 54 83, 42 86 C 30 89, 17 68, 9 57 Z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
        <p className="text-muted text-sm mt-1">Recibe 1,000 VDN gratis al registrarte</p>
      </div>

      {/* Welcome bonus banner */}
      <div className="mb-5 p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3 text-sm">
        <span className="text-2xl">🎁</span>
        <div>
          <p className="font-semibold text-accent-light">1,000 VDN de bienvenida</p>
          <p className="text-muted text-xs">+200 VDN extra si usas un código de referido</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface border border-border space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus autoComplete="email" placeholder="tu@email.com"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            required autoComplete="username" placeholder="tuusername"
            pattern="[a-zA-Z0-9_]{3,20}" title="3-20 caracteres, solo letras, números y _"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="new-password" placeholder="Min. 8 caracteres"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Confirmar</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required autoComplete="new-password" placeholder="Repite la contraseña"
              className={`w-full px-4 py-3 rounded-lg bg-background border text-foreground placeholder:text-muted focus:outline-none transition-colors ${confirm && confirm !== password ? "border-danger" : "border-border focus:border-accent"}`} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Código de referido <span className="text-muted/60">(opcional)</span></label>
          <input type="text" value={referral} onChange={e => setReferral(e.target.value.toUpperCase())}
            placeholder="ABC123" maxLength={10}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors font-mono uppercase" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-accent-light hover:text-accent font-medium">Iniciar sesión</Link>
      </p>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted py-20">Cargando…</div>}>
      <RegistroForm />
    </Suspense>
  );
}
