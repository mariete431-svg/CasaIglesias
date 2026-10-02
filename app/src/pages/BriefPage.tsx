import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { useToast } from "@/components/Toast";
import { loadSupabase } from "@/lib/asset";
import { readStored, writeStored } from "@/lib/utils";

/* Cuestionario para clientes nuevos: Mario lo manda por email o WhatsApp
   (/cuestionario) y las respuestas le llegan por email y a su panel. */

const DRAFT_KEY = "casa-iglesias-cuestionario";
type Answers = Record<string, string>;

type Question = { id: string; label: string; hint?: string; type?: "text" | "area" | "choice" | "multi"; options?: string[] };
const BLOCKS: { title: string; em: string; questions: Question[] }[] = [
  { title: "Tu", em: "negocio", questions: [
    { id: "sector", label: "¿A qué se dedica tu negocio?", hint: "Ej: peluquería, restaurante, fisioterapia, tienda de ropa…" },
    { id: "hace", label: "Cuéntamelo en dos o tres frases", type: "area", hint: "Qué ofreces y qué te hace diferente de la competencia." },
    { id: "clientes", label: "¿Quiénes son tus clientes?", type: "area", hint: "Edad, zona, si son turistas o gente de la isla, empresas…" },
    { id: "web", label: "¿Tienes web o redes ahora?", hint: "Pega los enlaces (o escribe «no»)." },
  ] },
  { title: "Lo que", em: "necesitas", questions: [
    { id: "servicio", label: "¿Qué necesitas?", type: "choice", options: ["Una web", "Web con reservas", "Marca / logo", "Marca + web", "Aún no lo sé"] },
    { id: "objetivo", label: "¿Qué quieres conseguir con la web?", type: "area", hint: "Ej: que me encuentren en Google, recibir reservas, parecer más profesional…" },
    { id: "paginas", label: "¿Qué páginas o secciones te imaginas?", hint: "Ej: inicio, servicios, precios, galería, contacto…" },
    { id: "marca", label: "¿Tienes logo y colores?", type: "choice", options: ["Sí, todo", "Solo el logo", "No tengo", "Tengo, pero quiero cambiarlo"] },
    { id: "estilo", label: "¿Qué estilo te gusta?", type: "multi", options: ["Elegante", "Moderno", "Cercano", "Natural", "Atrevido", "Minimalista"] },
    { id: "ejemplos", label: "Webs que te gustan (de cualquier sector)", type: "area", hint: "Pega enlaces y, si quieres, qué te gusta de cada una." },
    { id: "textos", label: "¿Tienes textos y fotos?", type: "choice", options: ["Sí", "Algunos", "No, necesito ayuda"] },
  ] },
  { title: "Fechas y", em: "presupuesto", questions: [
    { id: "plazo", label: "¿Para cuándo la necesitas?", type: "choice", options: ["Cuanto antes", "En 1 mes", "En 2–3 meses", "Sin prisa"] },
    { id: "presupuesto", label: "¿Qué presupuesto tienes en mente?", type: "choice", options: ["Menos de 400 €", "400–800 €", "800–1.300 €", "Más de 1.300 €", "No lo sé"] },
    { id: "telefono", label: "Teléfono", hint: "Opcional, por si es más fácil hablar por WhatsApp." },
    { id: "otros", label: "¿Algo más que deba saber?", type: "area" },
  ] },
];

export default function BriefPage() {
  usePageTitle("Cuestionario para empezar tu web — Casa Iglesias");
  const toast = useToast();
  const saved = readStored<{ name?: string; email?: string; business?: string; answers?: Answers }>(DRAFT_KEY, {});
  const [name, setName] = useState(saved.name ?? "");
  const [email, setEmail] = useState(saved.email ?? "");
  const [business, setBusiness] = useState(saved.business ?? "");
  const [answers, setAnswers] = useState<Answers>(saved.answers ?? {});
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // El borrador se guarda en el navegador: si cierras la página, no pierdes lo escrito
  const save = (next: { name?: string; email?: string; business?: string; answers?: Answers }) =>
    writeStored(DRAFT_KEY, { name, email, business, answers, ...next });
  const setAnswer = (id: string, value: string) => { const next = { ...answers, [id]: value.slice(0, 800) }; setAnswers(next); save({ answers: next }); };
  const toggleMulti = (id: string, option: string) => {
    const current = (answers[id] ?? "").split(", ").filter(Boolean);
    setAnswer(id, (current.includes(option) ? current.filter(o => o !== option) : [...current, option]).join(", "));
  };

  const answered = BLOCKS.flatMap(b => b.questions).filter(q => (answers[q.id] ?? "").trim()).length;
  const total = BLOCKS.flatMap(b => b.questions).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return toast("Escribe tu nombre.", true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast("Escribe un email válido.", true);
    if (!business.trim()) return toast("Escribe el nombre de tu negocio.", true);
    if (!consent) return toast("Marca la casilla de privacidad para enviarlo.", true);
    if (trap) { setSent(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()));
    const { error } = await publicClient.from("briefs").insert({ name: name.trim().slice(0, 80), email: email.trim().slice(0, 120), business: business.trim().slice(0, 120), answers: clean });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? "Hay muchos envíos seguidos. Prueba en unos minutos." : "No se ha podido enviar. Revisa tu conexión e inténtalo de nuevo.", true);
    writeStored(DRAFT_KEY, {});
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main>
    <PageHero
      eyebrow="CUESTIONARIO — PARA EMPEZAR TU PROYECTO"
      lines={["Cuéntame", "tu negocio."]}
      subtitle="Diez minutos, a tu ritmo. Con tus respuestas preparo una propuesta a tu medida antes de nuestra reunión. Lo que escribes se guarda en tu navegador hasta que lo envías."
      bottomHref="#cuestionario"
      bottom="Empezar"
    />

    <section id="cuestionario" className="section-pad"><div className="section-wrap brief-wrap">
      <AnimatePresence mode="wait">
        {sent ? <motion.div key="ok" className="contact-sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="confirmation-check"><Check strokeWidth={1.2} /></span>
          <h3>¡Recibido, <em>gracias!</em></h3>
          <p>Ya tengo tus respuestas. Las reviso y te escribo a <strong>{email.trim()}</strong> en menos de 48 horas con los siguientes pasos.</p>
          <Button variant="outlineLuxury" asChild><Link to="/">Volver al inicio <ArrowRight /></Link></Button>
        </motion.div>
          : <motion.form key="form" className="booking-form brief-form" onSubmit={submit} noValidate exit={{ opacity: 0 }}>
            <div className="brief-progress" aria-live="polite"><span>{answered} de {total} preguntas respondidas</span><div className="progress-track"><div style={{ width: `${(answered / total) * 100}%` }} /></div></div>

            <SectionHeading label="00 / TUS DATOS" />
            <div className="builder-two">
              <div className="form-row"><label htmlFor="br-name">Tu nombre <span aria-hidden="true">*</span></label><input id="br-name" autoComplete="name" maxLength={80} value={name} onChange={e => { setName(e.target.value); save({ name: e.target.value }); }} /></div>
              <div className="form-row"><label htmlFor="br-email">Email <span aria-hidden="true">*</span></label><input id="br-email" type="email" autoComplete="email" maxLength={120} value={email} onChange={e => { setEmail(e.target.value); save({ email: e.target.value }); }} /></div>
            </div>
            <div className="form-row"><label htmlFor="br-business">Nombre de tu negocio <span aria-hidden="true">*</span></label><input id="br-business" autoComplete="organization" maxLength={120} value={business} onChange={e => { setBusiness(e.target.value); save({ business: e.target.value }); }} /></div>

            {BLOCKS.map((block, b) => <div key={block.em} className="brief-block">
              <SectionHeading label={`0${b + 1} / ${`${block.title} ${block.em}`.toUpperCase()}`} />
              <Reveal><h2 className="brief-title">{block.title} <em>{block.em}.</em></h2></Reveal>
              {block.questions.map(q => {
                const value = answers[q.id] ?? "";
                if (q.type === "choice" || q.type === "multi") return <fieldset key={q.id} className="form-row kind-row"><legend>{q.label}{q.type === "multi" && <span className="optional">Puedes elegir varios</span>}</legend>
                  <div className="filter-row">{q.options!.map(o => {
                    const on = q.type === "multi" ? value.split(", ").includes(o) : value === o;
                    return <button type="button" key={o} className="chip" aria-pressed={on} onClick={() => q.type === "multi" ? toggleMulti(q.id, o) : setAnswer(q.id, on ? "" : o)}>{o}</button>;
                  })}</div>
                </fieldset>;
                return <div key={q.id} className="form-row"><label htmlFor={`br-${q.id}`}>{q.label}</label>
                  {q.hint && <small className="form-hint">{q.hint}</small>}
                  {q.type === "area"
                    ? <textarea id={`br-${q.id}`} rows={3} maxLength={800} value={value} onChange={e => setAnswer(q.id, e.target.value)} />
                    : <input id={`br-${q.id}`} type={q.id === "telefono" ? "tel" : "text"} maxLength={300} value={value} onChange={e => setAnswer(q.id, e.target.value)} />}
                </div>;
              })}
            </div>)}

            <div className="hp-field" aria-hidden="true"><label htmlFor="br-website">No rellenes este campo</label><input id="br-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Acepto que Mario use estas respuestas solo para preparar mi propuesta, según la <Link to="/privacidad">política de privacidad</Link>.</span></label>
            <div className="form-actions"><small className="form-note">No hace falta responderlo todo.</small><Button type="submit" variant="luxury" size="lg" disabled={sending}>{sending ? "Enviando…" : "Enviar cuestionario"} {!sending && <ArrowRight />}</Button></div>
          </motion.form>}
      </AnimatePresence>
    </div></section>
  </main>;
}
