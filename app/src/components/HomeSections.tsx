import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, ArrowUpRight, AtSign, CalendarDays, FileText, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { useToast } from "@/components/Toast";
import { asset, loadSupabase } from "@/lib/asset";

const Booking = lazy(() => import("@/components/Booking").then(m => ({ default: m.Booking })));

/** Avisa una sola vez cuando la sección está cerca de la pantalla (para cargar cosas sin retrasar la portada). */
function useNear<T extends HTMLElement>(margin = "300px 0px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setNear(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

/* =========================================================
   Fondo del inicio: foto del estudio con movimiento lento
   ========================================================= */
export function HeroBackdrop() {
  return <div className="hero-backdrop" aria-hidden="true">
    <picture>
      <source media="(max-width: 700px)" srcSet={asset("estudio-movil.webp")} type="image/webp" />
      <source media="(max-width: 700px)" srcSet={asset("estudio-movil.jpg")} />
      <source srcSet={asset("estudio.webp")} type="image/webp" />
      <img src={asset("estudio.jpg")} alt="" fetchPriority="high" decoding="async" />
    </picture>
    <span className="hero-backdrop-light" />
    <span className="hero-backdrop-shade" />
  </div>;
}

/* =========================================================
   Cómo trabajo: los 5 pasos con cada cliente
   ========================================================= */
const steps = [
  { title: "Reunión", time: "30 min · gratis", text: "Me cuentas tu negocio, a quién te diriges y qué necesitas. Por teléfono o videollamada, sin compromiso." },
  { title: "Propuesta", time: "En pocos días", text: "Te mando un presupuesto cerrado con lo que incluye, las fechas y el precio final. Empezamos con el 50\u00a0%." },
  { title: "Diseño", time: "1–4 semanas", text: "Diseño tu web con tu marca. Te enseño avances para que veas cómo va tomando forma." },
  { title: "Revisión", time: "2 rondas de cambios", text: "La repasamos juntos con calma: textos, fotos y detalles. Ajusto todo lo que haga falta." },
  { title: "Entrega", time: "Lista para usar", text: "Publico la web, te enseño a manejarla y pagas el 50\u00a0% restante. Sigo a tu lado si me necesitas." },
];

export function Process() {
  const reduced = useMotionPreference();
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <section id="como-trabajo" className="process-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">03 / CÓMO TRABAJO</span><span className="section-rule" /></div>
      <div className="intro-row"><h2>Paso a paso,<br /><em>contigo.</em></h2><p>Sabrás en todo momento en qué punto está tu web, qué toca ahora y qué viene después. Sin sorpresas.</p></div></Reveal>
    <ol ref={listRef} className="process-list">
      <span className="process-track" aria-hidden="true"><motion.span style={{ "--p": reduced ? 1 : progress } as never} /></span>
      {steps.map((step, i) => <li key={step.title}><Reveal delay={i * .07}>
        <span className="process-dot" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
        <h3>{step.title}</h3>
        <span className="process-time">{step.time}</span>
        <p>{step.text}</p>
      </Reveal></li>)}
    </ol>
  </div></section>;
}

/* =========================================================
   Herramienta gratis: crea tu CV (imán para atraer visitas)
   ========================================================= */
export function CvMagnet() {
  return <section className="cv-magnet section-pad"><div className="section-wrap">
    <div className="cv-magnet-grid">
      <Reveal><div className="cv-magnet-text">
        <span className="status-pill"><i aria-hidden="true" />Herramienta gratis</span>
        <h2>Crea tu CV online,<br /><em>gratis.</em></h2>
        <p>Escribe tus datos y míralo tomar forma en directo. Añade tu foto, tu logo y el color de tu marca, y descárgalo en PDF en un clic.</p>
        <ul>
          <li>Sin registrarte y sin dar tu email</li>
          <li>Tus datos se quedan en tu navegador</li>
          <li>PDF listo para enviar o imprimir</li>
        </ul>
        <Button variant="luxury" size="lg" asChild><Link to="/crear-cv" data-cursor="Crear">Crear mi CV gratis <ArrowUpRight /></Link></Button>
      </div></Reveal>
      <Reveal delay={.1}><Link to="/crear-cv" className="cv-magnet-paper" aria-label="Abrir el creador de CV" tabIndex={-1}>
        <span className="cv-magnet-logo" aria-hidden="true">TU<br />LOGO</span>
        <strong>Laura Martín</strong>
        <small>Diseñadora gráfica</small>
        <i /><i /><i className="short" />
        <b>EXPERIENCIA</b>
        <i /><i className="short" />
        <b>FORMACIÓN</b>
        <i /><i className="short" />
        <span className="cv-magnet-badge">PDF ↓</span>
      </Link></Reveal>
    </div>
  </div></section>;
}

/* =========================================================
   Preguntas frecuentes (funcionan también sin JavaScript)
   ========================================================= */
export const faqs = [
  { q: "¿Cuánto se tarda en tener la web?", a: "Depende del paquete: la Esencial está en 1–2 semanas, la de Negocio en unas 3 y la de Reservas en unas 4. En la propuesta te doy las fechas exactas." },
  { q: "¿Cómo se paga?", a: "La mitad al empezar y la otra mitad cuando la web está lista y te gusta. Los precios son cerrados: lo que pone el presupuesto es lo que pagas." },
  { q: "No tengo textos ni fotos, ¿es un problema?", a: "No. Te ayudo a escribir los textos y te digo qué fotos hacen falta y cómo hacerlas con el móvil. Si no tienes, buscamos fotos de calidad que encajen con tu negocio." },
  { q: "¿Puedo hacer cambios en la web después?", a: "Sí. Cada paquete incluye rondas de cambios antes de publicar. Después, con el mantenimiento (29 €/mes) tienes hasta 30 minutos de cambios al mes, o te los presupuesto aparte." },
  { q: "¿La web será mía?", a: "Sí. La web, los textos y las fotos son tuyos. Si un día quieres llevártela a otro sitio, te doy todo lo necesario." },
  { q: "¿Solo trabajas en Tenerife?", a: "Estoy en Adeje, en el sur de Tenerife, pero trabajo online con negocios de toda España. Las reuniones son por teléfono o videollamada." },
  { q: "¿Qué es el sistema de reservas?", a: "Un calendario en tu web donde tus clientes eligen día y hora solos, a cualquier hora. Te llega un aviso por email con cada reserva y lo gestionas desde un panel privado." },
  { q: "Ya tengo web, ¿puedes mejorarla?", a: "Claro. Reserva una reunión, la miramos juntos y te digo qué cambiaría y cuánto costaría, sin compromiso." },
];

export function Faq() {
  return <section id="preguntas" className="faq-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">07 / PREGUNTAS FRECUENTES</span><span className="section-rule" /></div></Reveal>
    <div className="faq-grid">
      <Reveal><div className="faq-intro"><h2>Dudas<br /><em>habituales.</em></h2><p>¿No encuentras la tuya? Escríbeme y te respondo en menos de 24 horas.</p><a className="faq-ask" href="#contacto">Hacer una pregunta <ArrowRight size={15} /></a></div></Reveal>
      <div className="faq-list">{faqs.map((item, i) => <Reveal key={item.q} delay={i * .03}><details className="faq-item">
        <summary><span>{item.q}</span><span className="faq-plus" aria-hidden="true"><Plus /></span></summary>
        <p>{item.a}</p>
      </details></Reveal>)}</div>
    </div>
  </div></section>;
}

/* =========================================================
   Instagram: últimos posts (servicio gratuito Behold)
   ========================================================= */
// Identificador del feed de Behold (behold.so → tu feed → "Feed ID"). Vacío = se enseña solo el enlace.
const BEHOLD_FEED_ID = "";
const INSTAGRAM_URL = "https://www.instagram.com/casaiglesias.studio/";
type Post = { id: string; permalink: string; image: string; caption: string };
const skeleton: Post[] = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, permalink: "", image: "", caption: "" }));

export function InstagramFeed() {
  const [ref, near] = useNear<HTMLElement>("500px 0px");
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    if (!near || !BEHOLD_FEED_ID) return;
    let active = true;
    fetch(`https://feeds.behold.so/${BEHOLD_FEED_ID}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const list: Record<string, any>[] = Array.isArray(data) ? data : data?.posts ?? [];
        const clean = list.slice(0, 6).map(p => ({
          id: String(p.id),
          permalink: String(p.permalink ?? INSTAGRAM_URL),
          image: String(p.sizes?.medium?.mediaUrl ?? p.thumbnailUrl ?? p.mediaUrl ?? ""),
          caption: String(p.prunedCaption ?? p.caption ?? "").slice(0, 120),
        })).filter(p => p.image);
        if (active) setPosts(clean);
      })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [near]);

  return <section ref={ref} className="insta-section section-pad"><div className="section-wrap">
    <Reveal><div className="insta-head">
      <div><span className="eyebrow">EN INSTAGRAM</span><h2>@casaiglesias<em>.studio</em></h2></div>
      <Button variant="outlineLuxury" size="lg" asChild><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><AtSign /> Seguir en Instagram</a></Button>
    </div></Reveal>
    {BEHOLD_FEED_ID && posts?.length !== 0 && <div className="insta-grid">
      {(posts ?? skeleton).map((post, i) => post.image
        ? <motion.a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="insta-post" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .06, duration: .6 }}>
          <img src={post.image} alt={post.caption || "Publicación de Instagram de Casa Iglesias"} loading="lazy" />
          <span className="sr-only">(se abre en Instagram)</span>
        </motion.a>
        : <span key={post.id} className="insta-post is-loading" aria-hidden="true" />)}
    </div>}
  </div></section>;
}

/* =========================================================
   Boletín: un consejo práctico al mes
   ========================================================= */
export function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 120) return toast("Escribe un email válido.", true);
    if (!consent) return toast("Marca la casilla para apuntarte.", true);
    if (trap) { setDone(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const { error } = await publicClient.from("subscribers").insert({ email: value });
    setSending(false);
    // 23505 = ya estaba apuntado: para la persona es lo mismo
    if (error && error.code !== "23505") return toast(error.message.includes("too_many") ? "Hay muchas suscripciones seguidas. Prueba en unos minutos." : "No se ha podido apuntar. Inténtalo de nuevo.", true);
    setDone(true);
  };

  return <section className="newsletter-section"><div className="section-wrap">
    <Reveal><div className="newsletter-card">
      <div>
        <span className="eyebrow">BOLETÍN MENSUAL</span>
        <h2>Un consejo al mes<br />para tu <em>web.</em></h2>
        <p>Una idea práctica para cuidar la web y la imagen de tu negocio, que puedes aplicar tú en diez minutos. Sin publicidad, y te das de baja con un clic.</p>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {done
          ? <motion.p key="ok" className="newsletter-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>¡Apuntado! El próximo consejo llegará a <strong>{email.trim()}</strong>.</motion.p>
          : <motion.form key="form" className="newsletter-form" onSubmit={submit} noValidate exit={{ opacity: 0, y: -8 }}>
            <div className="newsletter-row">
              <label htmlFor="nl-email" className="sr-only">Tu email</label>
              <input id="nl-email" type="email" autoComplete="email" maxLength={120} className="lux-input" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Button type="submit" variant="luxury" disabled={sending}>{sending ? "Apuntando…" : "Apuntarme"} {!sending && <ArrowRight />}</Button>
            </div>
            <div className="hp-field" aria-hidden="true"><label htmlFor="nl-website">No rellenes este campo</label><input id="nl-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Quiero recibir el boletín de Casa Iglesias. Más información en la <Link to="/privacidad">política de privacidad</Link>.</span></label>
          </motion.form>}
      </AnimatePresence>
    </div></Reveal>
  </div></section>;
}

/* =========================================================
   Contacto: calendario a la vista o mensaje por email
   ========================================================= */
const KINDS = ["Una web", "Reservas online", "Marca / logo", "Otra cosa"];

function ContactForm() {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", kind: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim(), email = form.email.trim(), message = form.message.trim();
    if (name.length < 2) return toast("Escribe tu nombre.", true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Escribe un email válido.", true);
    if (message.length < 5) return toast("Cuéntame un poco más en el mensaje.", true);
    if (!consent) return toast("Marca la casilla de privacidad para enviarlo.", true);
    if (trap) { setSent(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const { error } = await publicClient.from("contact_messages").insert({ name: name.slice(0, 80), email: email.slice(0, 120), kind: form.kind || null, message: message.slice(0, 1500) });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? "Hay muchos mensajes seguidos. Prueba en unos minutos o escribe a mariete431@icloud.com." : "No se ha podido enviar. Inténtalo de nuevo.", true);
    setSent(true);
  };

  if (sent) return <div className="contact-sent"><span className="confirmation-check"><Mail strokeWidth={1.2} /></span><h3>Mensaje <em>enviado.</em></h3><p>Gracias, {form.name.trim().split(" ")[0]}. Te respondo a <strong>{form.email.trim()}</strong> en menos de 24 horas.</p></div>;

  return <form className="booking-form contact-form" onSubmit={submit} noValidate>
    <div className="builder-two">
      <div className="form-row"><label htmlFor="ct-name">Nombre <span aria-hidden="true">*</span></label><input id="ct-name" autoComplete="name" maxLength={80} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Tu nombre" /></div>
      <div className="form-row"><label htmlFor="ct-email">Email <span aria-hidden="true">*</span></label><input id="ct-email" type="email" autoComplete="email" maxLength={120} value={form.email} onChange={e => set("email", e.target.value)} placeholder="tu@email.com" /></div>
    </div>
    <fieldset className="form-row kind-row"><legend>¿Qué buscas? <span className="optional">Opcional</span></legend>
      <div className="filter-row">{KINDS.map(kind => <button type="button" key={kind} className="chip" aria-pressed={form.kind === kind} onClick={() => set("kind", form.kind === kind ? "" : kind)}>{kind}</button>)}</div>
    </fieldset>
    <div className="form-row"><label htmlFor="ct-msg">Mensaje <span aria-hidden="true">*</span></label><textarea id="ct-msg" rows={5} maxLength={1500} value={form.message} onChange={e => set("message", e.target.value)} placeholder="Cuéntame tu negocio y qué necesitas…" /></div>
    <div className="hp-field" aria-hidden="true"><label htmlFor="ct-website">No rellenes este campo</label><input id="ct-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Acepto que Mario use estos datos solo para responder a mi mensaje, según la <Link to="/privacidad">política de privacidad</Link>.</span></label>
    <div className="form-actions"><small className="form-note">{form.message.length}/1500</small><Button type="submit" variant="luxury" disabled={sending}>{sending ? "Enviando…" : "Enviar mensaje"} {!sending && <ArrowRight />}</Button></div>
  </form>;
}

export function Contact() {
  const [mode, setMode] = useState<"calendario" | "mensaje">("calendario");
  const [ref, near] = useNear<HTMLElement>("600px 0px");
  return <section ref={ref} id="contacto" className="contact-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">08 / CONTACTO</span><span className="section-rule" /></div>
      <h2>Hablemos<span>.</span></h2>
      <div className="contact-switch" role="tablist" aria-label="Cómo quieres contactar">
        <button type="button" role="tab" aria-selected={mode === "calendario"} onClick={() => setMode("calendario")}><CalendarDays strokeWidth={1.3} /> Elegir día en el calendario</button>
        <button type="button" role="tab" aria-selected={mode === "mensaje"} onClick={() => setMode("mensaje")}><Mail strokeWidth={1.3} /> Escribir un mensaje</button>
      </div>
    </Reveal>
    <div className="contact-panel" role="tabpanel">
      {mode === "calendario"
        ? (near ? <Suspense fallback={<p className="status-text">Abriendo el calendario…</p>}><Booking compact /></Suspense> : <p className="status-text">Abriendo el calendario…</p>)
        : <ContactForm />}
    </div>
    <Reveal><div className="contact-extra">
      <a className="contact-email" href="mailto:mariete431@icloud.com">mariete431@icloud.com <ArrowUpRight strokeWidth={1.2} /></a>
      <div className="contact-links">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={16} /></a>
        <Link to="/cuestionario"><FileText size={15} /> ¿Vamos a trabajar juntos? Rellena el cuestionario <ArrowUpRight size={16} /></Link>
      </div>
    </div></Reveal>
  </div></section>;
}
