import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Viden",
  description: "Política de Privacidad de la plataforma Viden.",
};

const sections = [
  { id: "responsable",   title: "1. Responsable del Tratamiento" },
  { id: "datos",         title: "2. Datos que Recopilamos" },
  { id: "uso",           title: "3. Uso de los Datos" },
  { id: "comparticion",  title: "4. Compartición de Datos" },
  { id: "blockchain",    title: "5. Blockchain y Datos Públicos" },
  { id: "retencion",     title: "6. Retención de Datos" },
  { id: "derechos",      title: "7. Derechos del Usuario (LFPDPPP)" },
  { id: "cookies",       title: "8. Cookies" },
  { id: "seguridad",     title: "9. Seguridad" },
  { id: "menores",       title: "10. Menores de Edad" },
  { id: "cambios",       title: "11. Cambios a esta Política" },
  { id: "contacto",      title: "12. Contacto" },
];

export default function Privacidad() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidad</h1>
        <p className="text-sm text-muted">Última actualización: mayo 2026</p>
      </div>

      {/* Índice */}
      <nav className="mb-10 p-5 rounded-xl bg-surface border border-border">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Contenido</p>
        <ul className="space-y-1.5">
          {sections.map(s => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-sm text-accent-light hover:text-accent transition-colors hover:underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10 text-sm text-foreground leading-relaxed">

        <section id="responsable">
          <h2 className="text-lg font-bold text-foreground mb-3">1. Responsable del Tratamiento</h2>
          <p className="text-muted">
            El responsable del tratamiento de tus datos personales es <span className="text-foreground font-medium">Viden</span>, con domicilio en Guadalajara, Jalisco, México.
          </p>
          <p className="text-muted mt-2">
            Contacto: <a href="mailto:legal@viden.app" className="text-accent-light hover:underline">legal@viden.app</a>
          </p>
          <p className="text-muted mt-2">
            Esta Política de Privacidad se rige por la <span className="text-foreground font-medium">Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</span> de México y aplica a todos los usuarios de la plataforma, independientemente de su ubicación.
          </p>
        </section>

        <section id="datos">
          <h2 className="text-lg font-bold text-foreground mb-3">2. Datos que Recopilamos</h2>

          <p className="text-foreground font-medium mb-2">Datos que el usuario proporciona directamente:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2 mb-4">
            <li>Dirección de correo electrónico y nombre de usuario al registrarse</li>
            <li>Dirección de wallet de criptomonedas (si conecta MetaMask u otra wallet Web3)</li>
            <li>Información de pago procesada por Stripe o Moonpay — <span className="text-foreground">Viden no almacena datos de tarjetas bancarias</span></li>
            <li>Documentos de identidad en caso de verificación KYC</li>
          </ul>

          <p className="text-foreground font-medium mb-2">Datos que recopilamos automáticamente:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Dirección IP y geolocalización aproximada</li>
            <li>Tipo de navegador, sistema operativo y dispositivo</li>
            <li>Páginas visitadas y tiempo de permanencia en la plataforma</li>
            <li>Historial de apuestas y transacciones dentro del sistema custodial</li>
            <li>Datos de sesión (token de autenticación almacenado en localStorage)</li>
          </ul>
        </section>

        <section id="uso">
          <h2 className="text-lg font-bold text-foreground mb-3">3. Uso de los Datos</h2>
          <p className="text-muted mb-2">Utilizamos tus datos personales para:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Crear y operar tu cuenta de usuario</li>
            <li>Procesar depósitos, apuestas y transacciones dentro de la plataforma</li>
            <li>Prevenir el fraude, el lavado de dinero y otras actividades ilícitas (AML/KYC)</li>
            <li>Mejorar la plataforma, sus funciones y la experiencia del usuario</li>
            <li>Enviarte notificaciones sobre tus mercados, apuestas o cambios en el servicio</li>
            <li>Cumplir con obligaciones legales y requerimientos de autoridades competentes</li>
            <li>Resolver disputas y hacer cumplir nuestros Términos y Condiciones</li>
          </ul>
        </section>

        <section id="comparticion">
          <h2 className="text-lg font-bold text-foreground mb-3">4. Compartición de Datos</h2>
          <p className="text-muted mb-2">Compartimos tus datos únicamente con:</p>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li><span className="text-foreground font-medium">Stripe / Moonpay:</span> para el procesamiento de pagos. Estos servicios tienen sus propias políticas de privacidad.</li>
            <li><span className="text-foreground font-medium">Proveedores de KYC:</span> para la verificación de identidad cuando sea requerida.</li>
            <li><span className="text-foreground font-medium">Autoridades y organismos reguladores:</span> cuando la ley mexicana o de otras jurisdicciones aplicables lo requiera.</li>
          </ul>
          <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
            <p className="text-foreground font-medium text-xs">
              Viden <span className="text-accent-light">NO</span> vende, alquila ni cede datos personales a terceros con fines publicitarios o comerciales.
            </p>
          </div>
        </section>

        <section id="blockchain">
          <h2 className="text-lg font-bold text-foreground mb-3">5. Blockchain y Datos Públicos</h2>
          <p className="text-muted">
            Algunas funciones de Viden interactúan con la blockchain pública de <span className="text-foreground font-medium">Polygon</span>. Debes tener en cuenta que:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2 mt-2">
            <li>Las transacciones registradas en la blockchain son <span className="text-foreground font-medium">públicas, permanentes e irreversibles</span></li>
            <li>Tu dirección de wallet y el historial de operaciones on-chain son visibles para cualquier persona en exploradores de bloques como PolygonScan</li>
            <li>Viden no puede eliminar ni modificar datos almacenados en la blockchain</li>
          </ul>
          <p className="text-muted mt-2">
            El sistema custodial (saldos internos en la plataforma) sí está bajo control de Viden y los datos se almacenan en servidores seguros.
          </p>
        </section>

        <section id="retencion">
          <h2 className="text-lg font-bold text-foreground mb-3">6. Retención de Datos</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li><span className="text-foreground font-medium">Datos de cuenta:</span> mientras la cuenta permanezca activa</li>
            <li><span className="text-foreground font-medium">Historial de transacciones:</span> 5 años desde cada transacción (obligación legal)</li>
            <li><span className="text-foreground font-medium">Datos de KYC:</span> 5 años después del último uso activo de la cuenta</li>
            <li><span className="text-foreground font-medium">Datos de navegación:</span> máximo 12 meses</li>
          </ul>
          <p className="text-muted mt-2">
            Al cancelar tu cuenta, los datos personales son anonimizados, salvo aquellos que debamos conservar por obligación legal.
          </p>
        </section>

        <section id="derechos">
          <h2 className="text-lg font-bold text-foreground mb-3">7. Derechos del Usuario (LFPDPPP)</h2>
          <p className="text-muted mb-2">
            De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), tienes los siguientes derechos <span className="text-foreground font-medium">ARCO</span>:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li><span className="text-foreground font-medium">Acceso:</span> conocer qué datos personales tenemos sobre ti</li>
            <li><span className="text-foreground font-medium">Rectificación:</span> corregir datos incorrectos o incompletos</li>
            <li><span className="text-foreground font-medium">Cancelación:</span> solicitar la eliminación de tus datos cuando ya no sean necesarios</li>
            <li><span className="text-foreground font-medium">Oposición:</span> oponerte al tratamiento de tus datos en determinadas circunstancias</li>
          </ul>
          <div className="mt-3 p-3 rounded-lg bg-surface border border-border text-muted text-xs">
            <p>Para ejercer tus derechos ARCO, envía un correo a <a href="mailto:legal@viden.app" className="text-accent-light hover:underline">legal@viden.app</a> indicando tu nombre de usuario, el derecho que deseas ejercer y los datos a los que se refiere tu solicitud.</p>
            <p className="mt-1">Responderemos en un plazo máximo de <span className="text-foreground font-medium">20 días hábiles</span>.</p>
          </div>
        </section>

        <section id="cookies">
          <h2 className="text-lg font-bold text-foreground mb-3">8. Cookies</h2>
          <p className="text-muted mb-2">Viden utiliza cookies y almacenamiento local para:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li><span className="text-foreground font-medium">Cookies necesarias:</span> mantener tu sesión iniciada (token de autenticación en localStorage) y recordar preferencias de tema (claro/oscuro)</li>
            <li><span className="text-foreground font-medium">Cookies de analítica:</span> recopilar datos de uso de forma agregada y anónima para mejorar la plataforma</li>
          </ul>
          <p className="text-muted mt-2">
            Puedes desactivar las cookies no esenciales en la configuración de tu navegador. Ten en cuenta que deshabilitar cookies necesarias puede afectar el funcionamiento de la plataforma.
          </p>
        </section>

        <section id="seguridad">
          <h2 className="text-lg font-bold text-foreground mb-3">9. Seguridad</h2>
          <p className="text-muted mb-2">Implementamos las siguientes medidas de seguridad para proteger tus datos:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Contraseñas almacenadas con <span className="text-foreground font-medium">bcrypt</span> (hash criptográfico seguro; nunca almacenamos contraseñas en texto plano)</li>
            <li>Todas las comunicaciones cifradas mediante <span className="text-foreground font-medium">TLS/HTTPS</span></li>
            <li>Sin almacenamiento de datos de tarjetas bancarias en nuestros servidores</li>
            <li>Acceso restringido a datos sensibles solo para personal autorizado</li>
          </ul>
          <p className="text-muted mt-2">
            A pesar de estas medidas, ningún sistema es 100% seguro. En caso de detectar una brecha de seguridad que afecte tus datos, te notificaremos en el menor tiempo posible.
          </p>
        </section>

        <section id="menores">
          <h2 className="text-lg font-bold text-foreground mb-3">10. Menores de Edad</h2>
          <p className="text-muted">
            Viden no está dirigido ni permite el acceso a personas menores de <span className="text-foreground font-medium">18 años</span>. No recopilamos conscientemente datos personales de menores. Si detectamos que un usuario es menor de edad, procederemos a cancelar la cuenta de inmediato y a eliminar los datos asociados.
          </p>
          <p className="text-muted mt-2">
            Si eres padre, madre o tutor y crees que tu hijo menor ha creado una cuenta en Viden, contáctanos en <a href="mailto:legal@viden.app" className="text-accent-light hover:underline">legal@viden.app</a>.
          </p>
        </section>

        <section id="cambios">
          <h2 className="text-lg font-bold text-foreground mb-3">11. Cambios a esta Política</h2>
          <p className="text-muted">
            Viden puede actualizar esta Política de Privacidad periódicamente. Ante cambios significativos, te notificaremos por correo electrónico o mediante un aviso destacado en la plataforma antes de que los cambios entren en vigor.
          </p>
          <p className="text-muted mt-2">
            Te recomendamos revisar esta política regularmente. El uso continuado de la plataforma tras los cambios implica su aceptación.
          </p>
        </section>

        <section id="contacto">
          <h2 className="text-lg font-bold text-foreground mb-3">12. Contacto</h2>
          <p className="text-muted">
            Para cualquier duda, solicitud o reclamación relacionada con el tratamiento de tus datos personales, puedes contactarnos en:
          </p>
          <p className="mt-2">
            <a href="mailto:legal@viden.app" className="text-accent-light hover:underline font-medium">legal@viden.app</a>
          </p>
          <p className="text-muted mt-1">
            Viden — Guadalajara, Jalisco, México
          </p>
        </section>

      </div>

      <div className="mt-14 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
        <Link href="/terminos" className="text-sm text-accent-light hover:underline">
          Ver Términos y Condiciones →
        </Link>
        <Link href="/" className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:border-accent transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
