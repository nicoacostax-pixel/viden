"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/custodialApi";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pt-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-8 h-8">
            <path fill="#7DAF8D" d="M 4 47 C 12 49, 24 73, 37 79 C 46 83, 55 64, 66 38 L 79 10 L 97 2 L 86 18 L 76 42 C 65 66, 54 83, 42 86 C 30 89, 17 68, 9 57 Z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h1>
        <p className="text-muted text-sm mt-1">Inicia sesión en tu cuenta Viden</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface border border-border space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus autoComplete="email"
            placeholder="tu@email.com"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Contraseña</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-colors disabled:opacity-50">
          {loading ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent-light hover:text-accent font-medium">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
