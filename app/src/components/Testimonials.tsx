import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { loadSupabase } from "@/lib/asset";

type Comment = { id: number; name: string; message: string; created_at: string };
const fmtDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Atlantic/Canary" });

const EVERY = 6000;

/** Opiniones de la gente (tabla comments): pasan solas una a una, sin flechas. */
export function Testimonials({ label }: { label: string }) {
  const reduced = useMotionPreference();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [index, setIndex] = useState(0);
  // Solo se para con el botón de pausa (o con "reducir movimiento" activado en el móvil)
  const [stopped, setStopped] = useState(false);

  // Las opiniones se piden al acercarse a la sección, no al abrir la portada
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) { setNear(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: "900px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let active = true;
    loadSupabase()
      .then(({ publicClient }) => publicClient.from("comments").select("id, name, message, created_at").order("created_at", { ascending: false }).limit(12))
      .then(({ data, error }) => { if (active) setComments(!error && data ? data : []); })
      .catch(() => { if (active) setComments([]); });
    return () => { active = false; };
  }, [near]);

  const count = comments?.length ?? 0;
  // Pasan solas siempre, también con "Reducir movimiento" (entonces solo con un fundido suave).
  // El botón de pausa permite pararlas.
  const playing = !stopped && count > 1;
  // Cada cambio de opinión reinicia la cuenta, así al tocar un punto se ve completa
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex(i => (i + 1) % count), EVERY);
    return () => window.clearTimeout(timer);
  }, [playing, count, index]);

  if (comments !== null && count === 0) return null;
  const current = comments?.[index];

  return <section ref={sectionRef} id="opiniones" className="testimonials-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{label}</span><span className="section-rule" /></div></Reveal>
    <div className="testimonials-grid">
      <Reveal><div className="testimonials-intro">
        <h2>Lo que <em>dicen.</em></h2>
        <p>{count ? `${count} ${count === 1 ? "persona ha" : "personas han"} dejado su nota.` : "Cargando opiniones…"}</p>
        <Button variant="outlineLuxury" size="lg" asChild><Link to="/panel#visitantes" data-cursor="Escribir">Dejar un comentario <ArrowUpRight /></Link></Button>
      </div></Reveal>

      <Reveal delay={.08}><figure className="testimonial">
        <span className="testimonial-mark" aria-hidden="true">“</span>
        {/* Mientras cambian solas no se anuncian, para no interrumpir al lector de pantalla */}
        <div className="testimonial-body" aria-live={playing ? "off" : "polite"}>
          <AnimatePresence mode="wait">
            {current && <motion.div key={current.id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, rotateX: -24 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18, rotateX: 18 }} transition={{ type: "spring", bounce: 0, duration: .75, opacity: { duration: .45 } }} style={{ transformPerspective: 900, transformOrigin: "50% 50%" }}>
              <blockquote>{current.message}</blockquote>
              <figcaption><strong>{current.name}</strong><span>{fmtDate.format(new Date(current.created_at))}</span></figcaption>
            </motion.div>}
          </AnimatePresence>
        </div>
        {count > 1 && <>
          {/* Barrita que se llena mientras se lee la opinión; al llenarse pasa a la siguiente */}
          <div className="testimonial-timer" aria-hidden="true">{playing && <motion.span key={`${index}-${current?.id}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: EVERY / 1000, ease: "linear" }} />}</div>
          <div className="testimonial-nav">
            <span className="testimonial-count">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
            <div className="testimonial-dots">{comments!.map((c, i) => <button key={c.id} type="button" aria-label={`Opinión de ${c.name}`} aria-current={i === index} onClick={() => setIndex(i)}>{i === index && <motion.i layoutId="testimonial-dot" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}</button>)}</div>
            <button type="button" className="icon-button testimonial-pause" aria-label={stopped ? "Pasar las opiniones solas" : "Pausar las opiniones"} onClick={() => setStopped(value => !value)}>{stopped ? <Play /> : <Pause />}</button>
          </div>
        </>}
      </figure></Reveal>
    </div>
  </div></section>;
}
