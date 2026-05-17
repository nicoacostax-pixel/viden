"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushPrompt() {
  const { permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // start hidden

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const already = localStorage.getItem("push_prompted");
    if (!already && permission === "default") setDismissed(false);
  }, [permission]);

  function dismiss() {
    localStorage.setItem("push_prompted", "1");
    setDismissed(true);
  }

  async function enable() {
    await subscribe();
    dismiss();
  }

  if (dismissed || permission === "denied") return null;
  if (typeof Notification === "undefined" || !("PushManager" in window)) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40
                    rounded-2xl border border-border bg-surface shadow-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🔔</span>
        <div>
          <p className="text-sm font-bold text-foreground">Activa las notificaciones</p>
          <p className="text-xs text-muted mt-0.5">
            Te avisamos cuando tu mercado cierra o ganas VDN.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={enable}
          className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors">
          Activar
        </button>
        <button onClick={dismiss}
          className="flex-1 py-2 rounded-lg bg-surface-alt border border-border text-muted text-xs font-semibold hover:text-foreground transition-colors">
          Ahora no
        </button>
      </div>
    </div>
  );
}
