'use client';
import { useEffect, useState } from 'react';

export default function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(standalone);

    if (standalone) {
      claimInstallBonus();
      return;
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const dismissed = localStorage.getItem('pwa_banner_dismissed_v2');
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return;

    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (ios) setShowBanner(true);

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  useEffect(() => {
    const handleTrigger = () => setShowBanner(true);
    window.addEventListener('pwa-install-trigger', handleTrigger);
    return () => window.removeEventListener('pwa-install-trigger', handleTrigger);
  }, []);

  const claimInstallBonus = async () => {
    const token = localStorage.getItem('token');
    const claimed = localStorage.getItem('install_bonus_claimed');
    if (!token || claimed) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/users/claim-install-bonus`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('install_bonus_claimed', 'true');
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `🎉 ¡${data.vdn_received} VDN por instalar Viden!`, type: 'success' }
        }));
        window.dispatchEvent(new Event('balance-updated'));
      }
    } catch (err) {
      console.log('Error al reclamar bono:', err);
    }
  };

  const handleInstall = async () => {
    if (isIOS) { setShowIOSInstructions(true); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed_v2', Date.now().toString());
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registrado:', reg.scope))
        .catch(err => console.log('SW error:', err));
    });
    // Recargar cuando el SW nuevo tome el control (limpia caché viejo)
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'SW_UPDATED') window.location.reload();
    });
  }, []);

  if (!showBanner || isInstalled) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .pwa-sheet {
          animation: pwa-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        .pwa-install-btn {
          background: linear-gradient(135deg, #10B981, #059669);
          transition: filter 0.15s, transform 0.15s;
        }
        .pwa-install-btn:hover  { filter: brightness(1.1); transform: scale(1.02); }
        .pwa-install-btn:active { transform: scale(0.97); }
        .pwa-dismiss-btn:hover  { color: #E2E8F0; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div className="pwa-sheet" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(19,19,31,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0',
        padding: '12px 20px 32px',
        boxShadow: '0 -8px 40px rgba(79,70,229,0.25)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />

        {!showIOSInstructions ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
              }}>
                🎁
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 17, lineHeight: 1.3, marginBottom: 4 }}>
                  Instala Viden y gana 500 VDN
                </div>
                <div style={{ color: '#8B8BA0', fontSize: 13, lineHeight: 1.4 }}>
                  Acceso rápido desde tu pantalla de inicio · equivale a ~$5 USD gratis
                </div>
              </div>
            </div>

            {/* Pill badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['⚡ Más rápido', '📴 Funciona sin internet', '🔔 Notificaciones'].map(t => (
                <span key={t} style={{
                  fontSize: 11, fontWeight: 600, color: '#A5B4FC',
                  background: 'rgba(79,70,229,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 99, padding: '4px 10px',
                }}>
                  {t}
                </span>
              ))}
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleInstall}
                className="pwa-install-btn"
                style={{
                  flex: 1, border: 'none', borderRadius: 14,
                  padding: '14px 0', color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  letterSpacing: 0.2,
                }}
              >
                📲 Instalar ahora
              </button>
              <button
                onClick={handleDismiss}
                className="pwa-dismiss-btn"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '14px 18px',
                  color: '#6B7280', fontSize: 14, cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                Ahora no
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📲</div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 18 }}>Instala Viden en tu iPhone</div>
              <div style={{ color: '#8B8BA0', fontSize: 13, marginTop: 4 }}>Sigue estos 3 pasos rápidos</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { n: '1', icon: '⬆️', title: 'Toca el botón Compartir', sub: 'En la barra inferior de Safari' },
                { n: '2', icon: '➕', title: 'Añadir a pantalla de inicio', sub: 'Desplázate hasta encontrar la opción' },
                { n: '3', icon: '🎁', title: 'Toca "Añadir"', sub: '500 VDN se acreditarán automáticamente' },
              ].map(step => (
                <div key={step.n} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '12px 14px',
                }}>
                  <div style={{
                    width: 34, height: 34, flexShrink: 0,
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    borderRadius: 10, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15,
                  }}>
                    {step.n}
                  </div>
                  <div>
                    <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>
                      {step.icon} {step.title}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{step.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleDismiss}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: 14,
                color: '#6B7280', fontSize: 15, cursor: 'pointer',
              }}
            >
              Ahora no
            </button>
          </>
        )}
      </div>
    </>
  );
}
