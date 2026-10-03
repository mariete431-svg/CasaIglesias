import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, ArrowUpRight, AtSign, CalendarDays, FileText, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { useToast } from "@/components/Toast";
import { asset, loadSupabase } from "@/lib/asset";
import { useLocalize, useT } from "@/i18n";

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


export function Process() {
  const t = useT().process;
  const reduced = useMotionPreference();
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <section id="como-trabajo" className="process-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{t.label}</span><span className="section-rule" /></div>
      <div className="intro-row"><h2>{t.title1}<br /><em>{t.titleEm}</em></h2><p>{t.intro}</p></div></Reveal>
    <ol ref={listRef} className="process-list">
      <span className="process-track" aria-hidden="true"><motion.span style={{ "--p": reduced ? 1 : progress } as never} /></span>
      {t.steps.map((step, i) => <li key={step.title}><Reveal delay={i * .07}>
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
  const t = useT().cv;
  const local = useLocalize();
  return <section className="cv-magnet section-pad"><div className="section-wrap">
    <div className="cv-magnet-grid">
      <Reveal><div className="cv-magnet-text">
        <span className="status-pill"><i aria-hidden="true" />{t.pill}</span>
        <h2>{t.title1}<br /><em>{t.titleEm}</em></h2>
        <p>{t.text}</p>
        <ul>{t.points.map(x => <li key={x}>{x}</li>)}</ul>
        <Button variant="luxury" size="lg" asChild><Link to={local("/crear-cv")} data-cursor={useT().cursor.create}>{t.cta} <ArrowUpRight /></Link></Button>
      </div></Reveal>
      <Reveal delay={.1}><Link to={local("/crear-cv")} className="cv-magnet-paper" aria-label={t.open} tabIndex={-1}>
        <span className="cv-magnet-logo" aria-hidden="true">{t.yourLogo}</span>
        <strong>{t.sampleName}</strong>
        <small>{t.sampleRole}</small>
        <i /><i /><i className="short" />
        <b>{t.experience}</b>
        <i /><i className="short" />
        <b>{t.education}</b>
        <i /><i className="short" />
        <span className="cv-magnet-badge">PDF ↓</span>
      </Link></Reveal>
    </div>
  </div></section>;
}

/* =========================================================
   Preguntas frecuentes (funcionan también sin JavaScript)
   ========================================================= */


export function Faq() {
  const t = useT().faq;
  return <section id="preguntas" className="faq-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{t.label}</span><span className="section-rule" /></div></Reveal>
    <div className="faq-grid">
      <Reveal><div className="faq-intro"><h2>{t.title1}<br /><em>{t.titleEm}</em></h2><p>{t.intro}</p><a className="faq-ask" href="#contacto">{t.ask} <ArrowRight size={15} /></a></div></Reveal>
      <div className="faq-list">{t.items.map((item, i) => <Reveal key={item.q} delay={i * .03}><details className="faq-item">
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
const BEHOLD_FEED_ID = "seeFyk5efICRESP1Mi3n";
const INSTAGRAM_URL = "https://www.instagram.com/casaiglesias.studio/";
type Post = { id: string; permalink: string; image: string; caption: string };
const skeleton: Post[] = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, permalink: "", image: "", caption: "" }));

export function InstagramFeed() {
  const t = useT().insta;
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
      <div><span className="eyebrow">{t.label}</span><h2>@casaiglesias<em>.studio</em></h2></div>
      <Button variant="outlineLuxury" size="lg" asChild><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><AtSign /> {t.follow}</a></Button>
    </div></Reveal>
    {BEHOLD_FEED_ID && posts?.length !== 0 && <div className="insta-grid">
      {(posts ?? skeleton).map((post, i) => post.image
        ? <motion.a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="insta-post" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .06, duration: .6 }}>
          <img src={post.image} alt={post.caption || t.alt} loading="lazy" />
          <span className="sr-only">{t.opens}</span>
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
  const t = useT().newsletter;
  const tr = useT();
  const local = useLocalize();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 120) return toast(t.invalid, true);
    if (!consent) return toast(t.needConsent, true);
    if (trap) { setDone(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const { error } = await publicClient.from("subscribers").insert({ email: value });
    setSending(false);
    // 23505 = ya estaba apuntado: para la persona es lo mismo
    if (error && error.code !== "23505") return toast(error.message.includes("too_many") ? t.tooMany : t.error, true);
    setDone(true);
  };

  return <section className="newsletter-section"><div className="section-wrap">
    <Reveal><div className="newsletter-card">
      <div>
        <span className="eyebrow">{t.label}</span>
        <h2>{t.title1}<br />{t.title2} <em>{t.titleEm}</em></h2>
        <p>{t.text}{tr.newsletter.note ? <> <strong>{t.note}</strong></> : null}</p>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {done
          ? <motion.p key="ok" className="newsletter-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{t.done(email.trim())}</motion.p>
          : <motion.form key="form" className="newsletter-form" onSubmit={submit} noValidate exit={{ opacity: 0, y: -8 }}>
            <div className="newsletter-row">
              <label htmlFor="nl-email" className="sr-only">{t.emailLabel}</label>
              <input id="nl-email" type="email" autoComplete="email" maxLength={120} className="lux-input" placeholder={t.emailPh} value={email} onChange={e => setEmail(e.target.value)} />
              <Button type="submit" variant="luxury" disabled={sending}>{sending ? t.joining : t.join} {!sending && <ArrowRight />}</Button>
            </div>
            <div className="hp-field" aria-hidden="true"><label htmlFor="nl-website">{tr.reviews.trap}</label><input id="nl-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t.consent}<Link to={local("/privacidad")}>{tr.reviews.privacyLink}</Link>.</span></label>
          </motion.form>}
      </AnimatePresence>
    </div></Reveal>
  </div></section>;
}

/* =========================================================
   Contacto: calendario a la vista o mensaje por email
   ========================================================= */

function ContactForm() {
  const toast = useToast();
  const t = useT().contact;
  const tr = useT();
  const local = useLocalize();
  const [form, setForm] = useState({ name: "", email: "", kind: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim(), email = form.email.trim(), message = form.message.trim();
    if (name.length < 2) return toast(t.errName, true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast(t.errEmail, true);
    if (message.length < 5) return toast(t.errMsg, true);
    if (!consent) return toast(t.errConsent, true);
    if (trap) { setSent(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const { error } = await publicClient.from("contact_messages").insert({ name: name.slice(0, 80), email: email.slice(0, 120), kind: form.kind || null, message: message.slice(0, 1500) });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? t.tooMany : t.error, true);
    setSent(true);
  };

  if (sent) { const [a, b, c] = t.sent(form.name.trim().split(" ")[0] ?? "", form.email.trim());
    return <div className="contact-sent"><span className="confirmation-check"><Mail strokeWidth={1.2} /></span><h3>{t.sentTitle} <em>{t.sentEm}</em></h3><p>{a}<strong>{b}</strong>{c}</p></div>; }

  return <form className="booking-form contact-form" onSubmit={submit} noValidate>
    <div className="builder-two">
      <div className="form-row"><label htmlFor="ct-name">{t.name} <span aria-hidden="true">*</span></label><input id="ct-name" autoComplete="name" maxLength={80} value={form.name} onChange={e => set("name", e.target.value)} placeholder={t.namePh} /></div>
      <div className="form-row"><label htmlFor="ct-email">{t.email} <span aria-hidden="true">*</span></label><input id="ct-email" type="email" autoComplete="email" maxLength={120} value={form.email} onChange={e => set("email", e.target.value)} placeholder={t.emailPh} /></div>
    </div>
    <fieldset className="form-row kind-row"><legend>{t.kind} <span className="optional">{t.optional}</span></legend>
      <div className="filter-row">{t.kinds.map(kind => <button type="button" key={kind} className="chip" aria-pressed={form.kind === kind} onClick={() => set("kind", form.kind === kind ? "" : kind)}>{kind}</button>)}</div>
    </fieldset>
    <div className="form-row"><label htmlFor="ct-msg">{t.msg} <span aria-hidden="true">*</span></label><textarea id="ct-msg" rows={5} maxLength={1500} value={form.message} onChange={e => set("message", e.target.value)} placeholder={t.msgPh} /></div>
    <div className="hp-field" aria-hidden="true"><label htmlFor="ct-website">{tr.reviews.trap}</label><input id="ct-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t.consent}<Link to={local("/privacidad")}>{tr.reviews.privacyLink}</Link>.</span></label>
    <div className="form-actions"><small className="form-note">{form.message.length}/1500</small><Button type="submit" variant="luxury" disabled={sending}>{sending ? t.sending : t.send} {!sending && <ArrowRight />}</Button></div>
  </form>;
}

export function Contact() {
  const t = useT().contact;
  const local = useLocalize();
  const [mode, setMode] = useState<"calendario" | "mensaje">("calendario");
  const [ref, near] = useNear<HTMLElement>("600px 0px");
  return <section ref={ref} id="contacto" className="contact-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{t.label}</span><span className="section-rule" /></div>
      <h2>{t.title}<span>.</span></h2>
      <div className="contact-switch" role="tablist" aria-label={t.switchLabel}>
        <button type="button" role="tab" aria-selected={mode === "calendario"} onClick={() => setMode("calendario")}><CalendarDays strokeWidth={1.3} /> {t.calendar}</button>
        <button type="button" role="tab" aria-selected={mode === "mensaje"} onClick={() => setMode("mensaje")}><Mail strokeWidth={1.3} /> {t.message}</button>
      </div>
    </Reveal>
    <div className="contact-panel" role="tabpanel">
      {mode === "calendario"
        ? (near ? <Suspense fallback={<p className="status-text">{t.opening}</p>}><Booking compact /></Suspense> : <p className="status-text">{t.opening}</p>)
        : <ContactForm />}
    </div>
    <Reveal><div className="contact-extra">
      <a className="contact-email" href="mailto:hola@casaiglesias.es">hola@casaiglesias.es <ArrowUpRight strokeWidth={1.2} /></a>
      <div className="contact-links">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={16} /></a>
        <Link to={local("/cuestionario")}><FileText size={15} /> {t.brief} <ArrowUpRight size={16} /></Link>
      </div>
    </div></Reveal>
  </div></section>;
}
