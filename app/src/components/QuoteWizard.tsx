import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useT } from "@/i18n";
import { EXTRA_PRICES, MAINTENANCE_PRICE, MULTI, QUOTE_FLOW, WHATSAPP, euros, type PlanId, type QuestionId } from "@/content/portada";

/* Presupuesto rápido: al pulsar el precio de un plan se abre esta ventana con preguntas
   de botones (distintas según el plan). Al enviar, se abre WhatsApp con todo ya escrito
   para Mario. No se guarda nada en la web: el mensaje lo envía el propio cliente. */

export type QuotePlan = { id: PlanId; name: string; price: number };

export function QuoteWizard({ plan, onClose }: { plan: QuotePlan; onClose: () => void }) {
  const t = useT();
  const q = t.quote;
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string[]>>>({});
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Extras con precio: la ficha de Google ya va incluida en el plan Esencial
  const extras = useMemo(() => {
    const list = t.pricing.extras.map((label, i) => ({ label, price: EXTRA_PRICES[i]!, included: plan.id === "esencial" && i === 2 }));
    return [...list.filter(e => !e.included), { label: q.maintenance, price: MAINTENANCE_PRICE, monthly: true, included: false }];
  }, [t, q, plan.id]);

  // Cerrar con Escape, bloquear el fondo y volver al botón al cerrar
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  const toggle = (id: QuestionId, option: string) => setAnswers(prev => {
    const current = prev[id] ?? [];
    if (!MULTI.includes(id)) return { ...prev, [id]: current[0] === option ? [] : [option] };
    return { ...prev, [id]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] };
  });

  const chosenExtras = extras.filter(e => answers.extras?.includes(e.label));
  const oneOff = plan.price + chosenExtras.filter(e => !("monthly" in e)).reduce((sum, e) => sum + e.price, 0);
  const monthly = chosenExtras.some(e => "monthly" in e);
  const totalText = `${euros(oneOff)} ${t.pricing.tax}${monthly ? ` + ${euros(MAINTENANCE_PRICE)}${q.perMonth}` : ""}`;

  const message = () => {
    const lines = [q.msgHello(name.trim()), "", `*${q.msgPlan}:* ${plan.name} · ${euros(plan.price)} ${t.pricing.tax}`];
    if (business.trim()) lines.push(`*${q.msgBusiness}:* ${business.trim()}`);
    for (const id of QUOTE_FLOW[plan.id]) {
      const picked = answers[id];
      if (!picked?.length) continue;
      const label = id === "extras" ? q.extrasLabel : q.questions[id as Exclude<QuestionId, "extras">].label;
      const value = id === "extras" ? chosenExtras.map(e => `${e.label} (${euros(e.price)}${"monthly" in e ? q.perMonth : ""})`).join(", ") : picked.join(", ");
      lines.push(`*${label}* ${value}`);
    }
    if (notes.trim()) lines.push(`*${q.msgNotes}:* ${notes.trim()}`);
    lines.push("", `*${q.total}:* ${totalText}`);
    return lines.join("\n");
  };

  const send = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (name.trim().length < 2) {
      event.preventDefault();
      setError(true);
      nameRef.current?.focus();
      return;
    }
    event.currentTarget.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message())}`;
  };

  return createPortal(<motion.div className="quote-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
    <motion.div ref={dialogRef} className="quote-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title" tabIndex={-1} data-lenis-prevent
      onClick={event => event.stopPropagation()} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: .35, ease: [.22, 1, .36, 1] }}>
      <button type="button" className="quote-close icon-button" onClick={onClose} aria-label={q.close}><X /></button>
      <span className="eyebrow">{q.eyebrow}</span>
      <h2 id="quote-title">{q.title} <em>{q.titleEm}</em></h2>
      <p className="quote-sub">{q.sub}</p>
      <div className="quote-plan"><span>{plan.name}</span><strong>{euros(plan.price)} <small>{t.pricing.tax}</small></strong></div>

      {QUOTE_FLOW[plan.id].map(id => {
        const multi = MULTI.includes(id);
        const label = id === "extras" ? q.extrasLabel : q.questions[id as Exclude<QuestionId, "extras">].label;
        const options = id === "extras" ? extras.map(e => e.label) : q.questions[id as Exclude<QuestionId, "extras">].options;
        return <fieldset key={id} className="quote-question">
          <legend>{label}{multi && <small> · {q.multi}</small>}</legend>
          <div className="quote-options">{options.map(option => {
            const extra = id === "extras" ? extras.find(e => e.label === option) : undefined;
            return <button key={option} type="button" className="chip" aria-pressed={answers[id]?.includes(option) ?? false} onClick={() => toggle(id, option)}>
              {option}{extra && <span className="quote-extra-price"> +{euros(extra.price)}{"monthly" in extra ? q.perMonth : ""}</span>}
            </button>;
          })}</div>
        </fieldset>;
      })}

      <div className="quote-fields">
        <div className="form-row"><label htmlFor="quote-name">{q.name} <span>*</span></label>
          <input id="quote-name" ref={nameRef} value={name} placeholder={q.namePh} autoComplete="name" maxLength={80} aria-invalid={error}
            onChange={event => { setName(event.target.value); setError(false); }} />
          {error && <small role="alert">{q.needName}</small>}</div>
        <div className="form-row"><label htmlFor="quote-business">{q.business} <em className="optional">{q.optional}</em></label>
          <input id="quote-business" value={business} placeholder={q.businessPh} autoComplete="organization" maxLength={80} onChange={event => setBusiness(event.target.value)} /></div>
        <div className="form-row quote-notes"><label htmlFor="quote-notes">{q.notes} <em className="optional">{q.optional}</em></label>
          <textarea id="quote-notes" rows={2} value={notes} placeholder={q.notesPh} maxLength={500} onChange={event => setNotes(event.target.value)} /></div>
      </div>

      <div className="quote-footer">
        <div><span className="eyebrow">{q.total}</span><strong className="quote-total">{totalText}</strong></div>
        <a className="quote-send" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" onClick={send}><MessageCircle /> {q.send}</a>
      </div>
      <p className="quote-note">{q.note}</p>
      <a className="quote-meeting" href="#reservar" onClick={onClose}>{q.meeting}</a>
    </motion.div>
  </motion.div>, document.body);
}
