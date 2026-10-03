import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { useToast } from "@/components/Toast";
import { loadSupabase } from "@/lib/asset";
import { LOCALES, useLang, useLocalize, useT } from "@/i18n";

type Comment = { id: number; name: string; message: string; created_at: string; sector: string | null; photo_url: string | null };

/** Reduce la foto a 400 px y la pasa a JPG: carga rápido y ocupa poco. */
function shrinkPhoto(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(400, side);
      // Recorte cuadrado desde el centro, como una foto de perfil
      canvas.getContext("2d")?.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("foto")), "image/jpeg", .82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("foto")); };
    img.src = url;
  });
}
const fmtDate = (locale: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Atlantic/Canary" });

const EVERY = 6000;

/** Formulario para dejar una opinión: se publica cuando Mario la aprueba desde /admin. */
function OpinionForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const t = useT().reviews;
  const local = useLocalize();
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const [sending, setSending] = useState(false);
  // Campo trampa contra robots (las personas no lo ven)
  const [trap, setTrap] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const n = name.trim(), msg = message.trim();
    if (!n || !msg) return toast(t.missing, true);
    if (photo && !photoConsent) return toast(t.needConsent, true);
    const thanks = t.thanks;
    if (trap) { setName(""); setMessage(""); onDone(); return toast(thanks); }
    setSending(true);
    const { publicClient } = await loadSupabase();
    let photo_url: string | null = null;
    if (photo && photoConsent) {
      try {
        const blob = await shrinkPhoto(photo);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
        const { error: upError } = await publicClient.storage.from("opiniones").upload(path, blob, { contentType: "image/jpeg" });
        if (upError) throw upError;
        photo_url = publicClient.storage.from("opiniones").getPublicUrl(path).data.publicUrl;
      } catch {
        setSending(false);
        return toast(t.photoError, true);
      }
    }
    const { error } = await publicClient.from("comments").insert({ name: n.slice(0, 50), sector: sector.trim().slice(0, 60) || null, message: msg.slice(0, 500), photo_url, photo_consent: !!photo_url });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? t.tooMany : t.error, true);
    setName(""); setSector(""); setMessage(""); setPhoto(null); setPhotoConsent(false); onDone();
    toast(thanks);
  };

  return <form className="booking-form opinion-form" onSubmit={submit}>
    <div className="builder-two">
      <div className="form-row"><label htmlFor="op-name">{t.name}</label><input id="op-name" value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder={t.namePh} /></div>
      <div className="form-row"><label htmlFor="op-sector">{t.sector} <span className="optional">{useT().contact.optional}</span></label><input id="op-sector" value={sector} onChange={e => setSector(e.target.value)} maxLength={60} placeholder={t.sectorPh} /></div>
    </div>
    <div className="form-row"><label htmlFor="op-msg">{t.opinion}</label><textarea id="op-msg" rows={4} value={message} onChange={e => setMessage(e.target.value)} maxLength={500} placeholder={t.opinionPh} /></div>
    <div className="photo-picker">
      <div className="thumb round">{preview ? <img src={preview} alt={t.yourPhoto} /> : t.photo}</div>
      <Button variant="outlineLuxury" asChild><label htmlFor="op-photo">{photo ? t.changePhoto : t.addPhoto}</label></Button>
      <input id="op-photo" type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f && f.type.startsWith("image/")) setPhoto(f); }} />
      {photo && <Button type="button" variant="text" onClick={() => { setPhoto(null); setPhotoConsent(false); }}>{t.remove}</Button>}
    </div>
    {photo && <label className="consent-row"><input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)} /><span>{t.photoConsent}</span></label>}
    <div className="hp-field" aria-hidden="true"><label htmlFor="op-website">{t.trap}</label><input id="op-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
    <p className="form-note">{t.note(!!sector.trim(), !!photo)}<Link to={local("/privacidad")}>{t.privacyLink}</Link>.</p>
    <div className="form-actions"><small style={{ color: "var(--muted-foreground)" }}>{message.length}/500</small><Button type="submit" variant="luxury" disabled={sending}>{sending ? t.sending : t.send} {!sending && <ArrowRight />}</Button></div>
  </form>;
}

/** Opiniones de la gente (tabla comments): pasan solas una a una, sin flechas. */
export function Testimonials({ label }: { label: string }) {
  const tr = useT();
  const t = tr.reviews;
  const dateFmt = fmtDate(LOCALES[useLang()]);
  const reduced = useMotionPreference();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [index, setIndex] = useState(0);
  // Solo se para con el botón de pausa (o con "reducir movimiento" activado en el móvil)
  const [stopped, setStopped] = useState(false);
  const [writing, setWriting] = useState(false);

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
      .then(({ publicClient }) => publicClient.from("comments").select("id, name, message, created_at, sector, photo_url").order("created_at", { ascending: false }).limit(12))
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

  const current = comments?.[index];

  return <section ref={sectionRef} id="opiniones" className="testimonials-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{label}</span><span className="section-rule" /></div></Reveal>
    <div className="testimonials-grid">
      <Reveal><div className="testimonials-intro">
        <h2>{t.title1} <em>{t.titleEm}</em></h2>
        <p>{comments === null ? t.loading : count ? t.count(count) : t.empty}</p>
        {!writing && <Button variant="outlineLuxury" size="lg" onClick={() => setWriting(true)} data-cursor={tr.cursor.write}>{t.leave} <ArrowRight /></Button>}
        {writing && <OpinionForm onDone={() => setWriting(false)} />}
      </div></Reveal>

      {count > 0 && <Reveal delay={.08}><figure className="testimonial">
        <span className="testimonial-mark" aria-hidden="true">“</span>
        {/* Mientras cambian solas no se anuncian, para no interrumpir al lector de pantalla */}
        <div className="testimonial-body" aria-live={playing ? "off" : "polite"}>
          <AnimatePresence mode="wait">
            {current && <motion.div key={current.id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, rotateX: -24 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18, rotateX: 18 }} transition={{ type: "spring", bounce: 0, duration: .75, opacity: { duration: .45 } }} style={{ transformPerspective: 900, transformOrigin: "50% 50%" }}>
              <blockquote>{current.message}</blockquote>
              <figcaption>
                {current.photo_url && <img className="testimonial-photo" src={current.photo_url} alt={t.photoOf(current.name)} loading="lazy" width={56} height={56} />}
                <span className="testimonial-who"><strong>{current.name}</strong><span>{current.sector ? `${current.sector} · ` : ""}{dateFmt.format(new Date(current.created_at))}</span></span>
              </figcaption>
            </motion.div>}
          </AnimatePresence>
        </div>
        {count > 1 && <>
          {/* Barrita que se llena mientras se lee la opinión; al llenarse pasa a la siguiente */}
          <div className="testimonial-timer" aria-hidden="true">{playing && <motion.span key={`${index}-${current?.id}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: EVERY / 1000, ease: "linear" }} />}</div>
          <div className="testimonial-nav">
            <span className="testimonial-count">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
            <div className="testimonial-dots">{comments!.map((c, i) => <button key={c.id} type="button" aria-label={t.reviewBy(c.name)} aria-current={i === index} onClick={() => setIndex(i)}>{i === index && <motion.i layoutId="testimonial-dot" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}</button>)}</div>
            <button type="button" className="icon-button testimonial-pause" aria-label={stopped ? t.play : t.pause} onClick={() => setStopped(value => !value)}>{stopped ? <Play /> : <Pause />}</button>
          </div>
        </>}
      </figure></Reveal>}
    </div>
  </div></section>;
}
