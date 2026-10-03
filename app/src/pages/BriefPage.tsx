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
import { useLang, useLocalize, useT } from "@/i18n";

/* Cuestionario para clientes nuevos: Mario lo manda por email o WhatsApp
   (/cuestionario) y las respuestas le llegan por email y a su panel. */

const DRAFT_KEY = "casa-iglesias-cuestionario";
type Answers = Record<string, string>;

export default function BriefPage() {
  const tr = useT();
  const t = tr.brief;
  const BLOCKS = t.blocks;
  const local = useLocalize();
  const lang = useLang();
  usePageTitle(tr.meta.brief);
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
    if (name.trim().length < 2) return toast(t.errName, true);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast(t.errEmail, true);
    if (!business.trim()) return toast(t.errBusiness, true);
    if (!consent) return toast(t.errConsent, true);
    if (trap) { setSent(true); return; }
    setSending(true);
    const { publicClient } = await loadSupabase();
    const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()));
    const { error } = await publicClient.from("briefs").insert({ name: name.trim().slice(0, 80), email: email.trim().slice(0, 120), business: business.trim().slice(0, 120), answers: clean, lang });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? t.tooMany : t.error, true);
    writeStored(DRAFT_KEY, {});
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main>
    <PageHero
      eyebrow={t.eyebrow}
      lines={t.lines}
      subtitle={t.subtitle}
      bottomHref="#cuestionario"
      bottom={t.start}
    />

    <section id="cuestionario" className="section-pad"><div className="section-wrap brief-wrap">
      <AnimatePresence mode="wait">
        {sent ? <motion.div key="ok" className="contact-sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="confirmation-check"><Check strokeWidth={1.2} /></span>
          <h3>{t.okTitle} <em>{t.okEm}</em></h3>
          <p>{t.ok(email.trim())[0]}<strong>{email.trim()}</strong>{t.ok(email.trim())[2]}</p>
          <Button variant="outlineLuxury" asChild><Link to={local("/")}>{t.home} <ArrowRight /></Link></Button>
        </motion.div>
          : <motion.form key="form" className="booking-form brief-form" onSubmit={submit} noValidate exit={{ opacity: 0 }}>
            <div className="brief-progress" aria-live="polite"><span>{t.progress(answered, total)}</span><div className="progress-track"><div style={{ width: `${(answered / total) * 100}%` }} /></div></div>

            <SectionHeading label={t.dataLabel} />
            <div className="builder-two">
              <div className="form-row"><label htmlFor="br-name">{t.name} <span aria-hidden="true">*</span></label><input id="br-name" autoComplete="name" maxLength={80} value={name} onChange={e => { setName(e.target.value); save({ name: e.target.value }); }} /></div>
              <div className="form-row"><label htmlFor="br-email">{t.email} <span aria-hidden="true">*</span></label><input id="br-email" type="email" autoComplete="email" maxLength={120} value={email} onChange={e => { setEmail(e.target.value); save({ email: e.target.value }); }} /></div>
            </div>
            <div className="form-row"><label htmlFor="br-business">{t.business} <span aria-hidden="true">*</span></label><input id="br-business" autoComplete="organization" maxLength={120} value={business} onChange={e => { setBusiness(e.target.value); save({ business: e.target.value }); }} /></div>

            {BLOCKS.map((block, b) => <div key={block.em} className="brief-block">
              <SectionHeading label={`0${b + 1} / ${`${block.title} ${block.em}`.toUpperCase()}`} />
              <Reveal><h2 className="brief-title">{block.title} <em>{block.em}.</em></h2></Reveal>
              {block.questions.map(q => {
                const value = answers[q.id] ?? "";
                if (q.type === "choice" || q.type === "multi") return <fieldset key={q.id} className="form-row kind-row"><legend>{q.label}{q.type === "multi" && <span className="optional">{t.multi}</span>}</legend>
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

            <div className="hp-field" aria-hidden="true"><label htmlFor="br-website">{tr.reviews.trap}</label><input id="br-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t.consent}<Link to={local("/privacidad")}>{tr.reviews.privacyLink}</Link>.</span></label>
            <div className="form-actions"><small className="form-note">{t.noNeed}</small><Button type="submit" variant="luxury" size="lg" disabled={sending}>{sending ? t.sending : t.send} {!sending && <ArrowRight />}</Button></div>
          </motion.form>}
      </AnimatePresence>
    </div></section>
  </main>;
}
