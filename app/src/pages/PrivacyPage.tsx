import { Link } from "react-router-dom";
import { Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";

const EMAIL = "mariete431@icloud.com";

export default function PrivacyPage() {
  usePageTitle("Privacidad y aviso legal — Mario Iglesias");
  return <main>
    <PageHero
      eyebrow="PRIVACIDAD — ACTUALIZADO EN SEPTIEMBRE DE 2026"
      lines={["Tus datos,", "cuidados."]}
      subtitle="Qué datos guarda esta web, para qué los uso y cómo puedes pedir que los borre."
      bottomHref="#privacidad"
    />

    <section id="privacidad" className="section-pad"><div className="section-wrap">
      <SectionHeading label="01 / POLÍTICA DE PRIVACIDAD" />
      <Reveal><div className="legal">
        <h2>Quién es el responsable</h2>
        <p>Mario Iglesias Martínez, con domicilio en Adeje (Santa Cruz de Tenerife, España). Contacto: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>

        <h2>Qué datos se recogen y para qué</h2>
        <ul>
          <li><strong>Reservar una reunión:</strong> nombre, email y, si quieres, teléfono y tema. Solo sirven para organizar la reunión y ponerme en contacto contigo. Para evitar reservas falsas se guarda también una huella anónima de tu conexión (no tu dirección IP: a partir de la huella no se puede averiguar).</li>
          <li><strong>Dejar un comentario:</strong> el nombre y el mensaje que escribas. Se publican en esta web después de que los revise, así que no pongas datos que no quieras que se vean.</li>
          <li><strong>Lista de tareas, creador de CV y calendario:</strong> lo que escribes se guarda solo en tu propio navegador. No me llega a mí ni a nadie. La foto del CV también se guarda solo en tu navegador, ya reducida.</li>
        </ul>
        <p>La base legal es tu consentimiento, que das al marcar la casilla o al enviar el comentario. Puedes retirarlo cuando quieras.</p>

        <h2>Cuánto tiempo se guardan</h2>
        <p>Los datos de una reunión se guardan mientras haga falta para organizarla y, como máximo, 12 meses después. Los comentarios se mantienen publicados hasta que pidas que los borre.</p>

        <h2>Quién más interviene</h2>
        <p>No vendo ni cedo tus datos. Para que la web funcione uso estos servicios, que solo tratan los datos por mi cuenta:</p>
        <ul>
          <li><strong>Supabase:</strong> base de datos de las reservas y comentarios, con servidores en Londres (Reino Unido, país con nivel de protección reconocido por la Unión Europea).</li>
          <li><strong>Resend:</strong> me envía un aviso por email cuando alguien reserva (Estados Unidos, con cláusulas contractuales tipo).</li>
          <li><strong>GitHub Pages:</strong> aloja la web (Estados Unidos).</li>
        </ul>
        <p>Las letras, las fotos y el resto de archivos se sirven desde esta misma web: mientras navegas no se conecta con Google ni con otras empresas.</p>

        <h2>Cookies</h2>
        <p>Esta web no usa cookies de publicidad ni de analítica. Solo guarda en tu navegador lo necesario para que funcione: tus tareas, tu borrador de CV, tu calendario y si ya viste la animación de entrada.</p>

        <h2>Tus derechos</h2>
        <p>Puedes pedirme acceder a tus datos, corregirlos, borrarlos, limitar su uso u oponerte, escribiendo a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Si crees que no los he tratado bien, puedes reclamar ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos<span className="sr-only"> (se abre en una pestaña nueva)</span></a>.</p>
      </div></Reveal>
    </div></section>

    <section className="section-pad"><div className="section-wrap">
      <SectionHeading label="02 / AVISO LEGAL" />
      <Reveal><div className="legal">
        <p>Esta es la web personal de Mario Iglesias Martínez (Adeje, Santa Cruz de Tenerife, España). Contacto: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
        <p>Los textos, el diseño y las fotos son de Mario Iglesias, salvo que se indique lo contrario. Puedes enlazar a esta web libremente, pero no copiar su contenido sin permiso.</p>
        <p>Los comentarios son responsabilidad de quien los escribe. Me reservo el derecho a no publicar o borrar los que sean ofensivos, falsos o spam.</p>
        <p><Link to="/">Volver al inicio</Link></p>
      </div></Reveal>
    </div></section>
  </main>;
}
