import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Viden",
  description: "Términos y Condiciones de uso de la plataforma Viden.",
};

const sections = [
  { id: "aceptacion",      title: "1. Aceptación de Términos" },
  { id: "descripcion",     title: "2. Descripción del Servicio" },
  { id: "elegibilidad",    title: "3. Elegibilidad" },
  { id: "token",           title: "4. El Token VDN" },
  { id: "mercados",        title: "5. Mercados de Predicción" },
  { id: "adquisicion",     title: "6. Adquisición y Uso de VDN" },
  { id: "responsable",     title: "7. Juego Responsable" },
  { id: "prohibida",       title: "8. Conducta Prohibida" },
  { id: "usuario-mercados",title: "9. Mercados Creados por Usuarios" },
  { id: "propiedad",       title: "10. Propiedad Intelectual" },
  { id: "limitacion",      title: "11. Limitación de Responsabilidad" },
  { id: "modificaciones",  title: "12. Modificaciones" },
  { id: "ley",             title: "13. Ley Aplicable" },
  { id: "contacto",        title: "14. Contacto" },
];

export default function Terminos() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Términos y Condiciones</h1>
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

        <section id="aceptacion">
          <h2 className="text-lg font-bold text-foreground mb-3">1. Aceptación de Términos</h2>
          <p className="text-muted">
            El acceso y uso de la plataforma Viden (<span className="text-foreground">https://frontend-three-rho-31.vercel.app</span>) implica la aceptación plena e incondicional de los presentes Términos y Condiciones. Si no estás de acuerdo con alguna de las disposiciones aquí establecidas, debes abstenerte de utilizar el servicio.
          </p>
          <p className="text-muted mt-2">
            Estos términos constituyen un acuerdo legalmente vinculante entre tú (el usuario) y Viden. El uso continuado de la plataforma tras cualquier modificación implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section id="descripcion">
          <h2 className="text-lg font-bold text-foreground mb-3">2. Descripción del Servicio</h2>
          <p className="text-muted mb-2">
            Viden es una plataforma de mercados de predicción que opera con el token digital VDN. A través de Viden, los usuarios pueden:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Participar en mercados de predicción sobre eventos del mundo real</li>
            <li>Adquirir tokens VDN mediante métodos de pago habilitados</li>
            <li>Participar en juegos para ganar tokens VDN</li>
            <li>Crear mercados de predicción (usuarios verificados con saldo suficiente)</li>
          </ul>
          <p className="text-muted mt-2">
            El servicio se presta bajo un modelo custodial: Viden administra los saldos de los usuarios en su plataforma y no garantiza la conversión a moneda fiduciaria.
          </p>
        </section>

        <section id="elegibilidad">
          <h2 className="text-lg font-bold text-foreground mb-3">3. Elegibilidad</h2>
          <p className="text-muted mb-2">Para usar Viden debes cumplir los siguientes requisitos:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Tener mínimo <span className="text-foreground font-medium">18 años de edad</span></li>
            <li>Residir en un país donde el servicio esté disponible (México, Latinoamérica y España)</li>
            <li>Proporcionar información veraz, completa y actualizada al registrarte</li>
            <li>No haber sido previamente suspendido o expulsado de la plataforma</li>
          </ul>
          <p className="text-muted mt-3">
            <span className="text-foreground font-medium">Restricciones geográficas:</span> El servicio no está disponible para residentes de Estados Unidos de América, Reino Unido, ni de otros países donde las leyes locales prohíban o restrinjan este tipo de actividades. Es responsabilidad del usuario verificar la legalidad del servicio en su jurisdicción.
          </p>
          <p className="text-muted mt-2">
            Al registrarte, declaras y garantizas que cumples con todos los requisitos de elegibilidad. Viden se reserva el derecho de verificar esta información y cancelar cuentas que no cumplan con los requisitos.
          </p>
        </section>

        <section id="token">
          <h2 className="text-lg font-bold text-foreground mb-3">4. El Token VDN</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li>VDN es un <span className="text-foreground font-medium">token de utilidad digital</span>, no un instrumento de inversión, valor mobiliario ni equivalente a moneda de curso legal</li>
            <li>El valor del VDN puede fluctuar y Viden no garantiza su valor futuro</li>
            <li>El supply total es fijo: <span className="text-foreground font-medium">500,000,000 VDN</span></li>
            <li>Una parte de cada apuesta (2%) es quemada de forma permanente e irreversible</li>
            <li>VDN no puede ser canjeado directamente por moneda fiduciaria, excepto cuando Viden habilite expresamente mecanismos de retiro</li>
            <li>Las transacciones registradas en la blockchain de Polygon son públicas e irreversibles</li>
          </ul>
        </section>

        <section id="mercados">
          <h2 className="text-lg font-bold text-foreground mb-3">5. Mercados de Predicción</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li>Los resultados de los mercados de predicción son inciertos por naturaleza; Viden no garantiza ningún resultado</li>
            <li>Los mercados pueden cancelarse por causas de fuerza mayor, errores técnicos o eventos que hagan imposible la resolución objetiva</li>
            <li>En caso de cancelación, se devuelve el <span className="text-foreground font-medium">96% del monto apostado</span> (el 4% correspondiente al fee de quema y treasury es no reembolsable)</li>
            <li>Viden se reserva el derecho de resolver disputas sobre resultados de mercados de forma definitiva</li>
            <li>Las fechas de cierre y resolución son orientativas; circunstancias excepcionales pueden modificarlas</li>
          </ul>
          <div className="mt-3 p-3 rounded-lg bg-surface border border-border text-xs text-muted">
            <p className="font-medium text-foreground mb-1">Distribución de cada apuesta:</p>
            <ul className="space-y-0.5">
              <li>🔥 2% — Quema de tokens (irreversible)</li>
              <li>🏦 2% — Treasury de Viden</li>
              <li>💰 2% — Fee del creador del mercado (solo mercados de usuarios)</li>
              <li>✅ 94% — Pool de apuestas</li>
            </ul>
          </div>
        </section>

        <section id="adquisicion">
          <h2 className="text-lg font-bold text-foreground mb-3">6. Adquisición y Uso de VDN</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li>Los VDN adquiridos mediante depósito no son reembolsables en efectivo, salvo cuando Viden habilite expresamente un mecanismo de retiro</li>
            <li>Los retiros están sujetos a verificación de identidad (KYC) y pueden estar limitados</li>
            <li>Viden puede establecer límites mínimos y máximos de depósito y retiro</li>
            <li>Las transacciones procesadas en blockchain son irreversibles</li>
            <li>Los pagos con tarjeta son procesados por Stripe; Viden no almacena datos de tarjetas</li>
            <li>Viden se reserva el derecho de revertir transacciones fraudulentas o erróneas en el sistema custodial</li>
          </ul>
        </section>

        <section id="responsable">
          <h2 className="text-lg font-bold text-foreground mb-3">7. Juego Responsable</h2>
          <p className="text-muted mb-2">
            Viden promueve el uso responsable de la plataforma y reconoce que la participación excesiva puede ser perjudicial. Si experimentas problemas relacionados con el juego compulsivo:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Puedes solicitar límites de uso o el bloqueo temporal de tu cuenta escribiendo a <a href="mailto:legal@viden.app" className="text-accent-light hover:underline">legal@viden.app</a></li>
            <li>Jugadores Anónimos México: <a href="https://jugadoresanonimos.org.mx" className="text-accent-light hover:underline" target="_blank" rel="noopener noreferrer">jugadoresanonimos.org.mx</a></li>
          </ul>
          <p className="text-muted mt-2">
            Nunca apuestes más de lo que puedes permitirte perder. Los mercados de predicción implican riesgo de pérdida total del monto apostado.
          </p>
        </section>

        <section id="prohibida">
          <h2 className="text-lg font-bold text-foreground mb-3">8. Conducta Prohibida</h2>
          <p className="text-muted mb-2">Está estrictamente prohibido:</p>
          <ul className="list-disc list-inside space-y-1 text-muted pl-2">
            <li>Crear múltiples cuentas para evadir restricciones o manipular mercados</li>
            <li>Manipular mercados haciendo uso de información privilegiada o no pública</li>
            <li>Usar bots, scripts o sistemas automatizados para realizar apuestas</li>
            <li>Realizar actividades de lavado de dinero o cualquier actividad ilegal</li>
            <li>Compartir credenciales de acceso con terceros</li>
            <li>Intentar hackear, comprometer o realizar ingeniería inversa de la plataforma</li>
            <li>Publicar mercados con contenido ofensivo, discriminatorio o ilegal</li>
            <li>Proporcionar información falsa al registrarse o en procesos de verificación</li>
          </ul>
          <p className="text-muted mt-2">
            La violación de estas normas puede resultar en la suspensión inmediata de la cuenta y la pérdida del saldo disponible, sin perjuicio de las acciones legales que procedan.
          </p>
        </section>

        <section id="usuario-mercados">
          <h2 className="text-lg font-bold text-foreground mb-3">9. Mercados Creados por Usuarios</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li>El creador del mercado es responsable de la precisión, objetividad y legalidad del contenido del mercado</li>
            <li>El costo de creación es de <span className="text-foreground font-medium">500 VDN</span>, que se devuelven al resolver el mercado, salvo que sea rechazado por violar estas normas</li>
            <li>Si el mercado es rechazado por violación de normas, los 500 VDN no son reembolsables</li>
            <li>Viden modera todos los mercados enviados y puede rechazar cualquiera sin necesidad de justificación</li>
            <li>El creador no puede apostar en su propio mercado</li>
            <li>Los criterios de resolución deben ser objetivos, verificables y basados en fuentes públicas</li>
            <li>El creador gana un fee del 2% del pool total, pagado al momento de la resolución</li>
          </ul>
        </section>

        <section id="propiedad">
          <h2 className="text-lg font-bold text-foreground mb-3">10. Propiedad Intelectual</h2>
          <p className="text-muted">
            El nombre <span className="text-foreground font-medium">Viden</span>, el logotipo, el token VDN, el diseño de la plataforma y todos los contenidos generados por Viden son propiedad exclusiva de sus creadores. Queda prohibido reproducir, distribuir o usar la marca Viden, el logo o cualquier otro elemento sin autorización expresa por escrito.
          </p>
          <p className="text-muted mt-2">
            Los usuarios conservan la propiedad intelectual sobre el contenido que crean (preguntas de mercado), pero otorgan a Viden una licencia no exclusiva para mostrar y operar dichos mercados en la plataforma.
          </p>
        </section>

        <section id="limitacion">
          <h2 className="text-lg font-bold text-foreground mb-3">11. Limitación de Responsabilidad</h2>
          <ul className="list-disc list-inside space-y-2 text-muted pl-2">
            <li>Viden no es responsable por pérdidas derivadas de la participación en mercados de predicción</li>
            <li>No garantizamos la disponibilidad continua o ininterrumpida del servicio</li>
            <li>No somos responsables por pérdidas causadas por fallas en la blockchain de Polygon, interrupciones de red o ataques de terceros</li>
            <li>La responsabilidad máxima de Viden frente a cualquier usuario está limitada al monto de VDN activos en la cuenta del usuario en el momento del incidente</li>
            <li>Viden no ofrece asesoría financiera, legal o fiscal</li>
          </ul>
        </section>

        <section id="modificaciones">
          <h2 className="text-lg font-bold text-foreground mb-3">12. Modificaciones</h2>
          <p className="text-muted">
            Viden se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios significativos serán notificados con un mínimo de <span className="text-foreground font-medium">15 días de antelación</span> mediante aviso en la plataforma o por email. El uso continuado de Viden tras la fecha de entrada en vigor de los cambios implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section id="ley">
          <h2 className="text-lg font-bold text-foreground mb-3">13. Ley Aplicable</h2>
          <p className="text-muted">
            Estos Términos y Condiciones se rigen e interpretan de conformidad con las leyes de los Estados Unidos Mexicanos. Cualquier controversia derivada de estos términos será sometida a la jurisdicción exclusiva de los tribunales competentes de <span className="text-foreground font-medium">Guadalajara, Jalisco, México</span>, renunciando expresamente a cualquier otro fuero que pudiera corresponder.
          </p>
        </section>

        <section id="contacto">
          <h2 className="text-lg font-bold text-foreground mb-3">14. Contacto</h2>
          <p className="text-muted">
            Para consultas, reclamaciones o solicitudes relacionadas con estos Términos y Condiciones, puedes contactarnos en:
          </p>
          <p className="mt-2">
            <a href="mailto:legal@viden.app" className="text-accent-light hover:underline font-medium">legal@viden.app</a>
          </p>
        </section>

      </div>

      <div className="mt-14 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
        <Link href="/privacidad" className="text-sm text-accent-light hover:underline">
          Ver Política de Privacidad →
        </Link>
        <Link href="/" className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:border-accent transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
