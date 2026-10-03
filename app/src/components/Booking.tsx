import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useMotionPreference } from "@/components/EditorialEffects";
import { dayKey, downloadCalendarEvent, formatDay, formatTime } from "@/lib/appointments";
import { bookingClient } from "@/lib/supabase";

const steps = ["Día", "Hora", "Tus datos", "Confirmación"];
const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
// Los mismos límites que la base de datos, para que nunca rechace algo que aquí parecía válido
const LIMITS = { name: 80, email: 120, phone: 30, topic: 500 };
const bookingSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre (mínimo 2 letras).").max(LIMITS.name, `El nombre no puede pasar de ${LIMITS.name} caracteres.`),
  email: z.string().trim().email("Escribe un correo válido.").max(LIMITS.email, `El correo no puede pasar de ${LIMITS.email} caracteres.`),
  phone: z.string().trim().max(LIMITS.phone, `El teléfono no puede pasar de ${LIMITS.phone} caracteres.`),
  topic: z.string().trim().max(LIMITS.topic, `El mensaje no puede pasar de ${LIMITS.topic} caracteres.`),
  consent: z.literal(true, { error: "Necesitamos tu consentimiento para reservar." }),
});
type Field = "name" | "email" | "phone" | "topic" | "consent";
type Form = { name: string; email: string; phone: string; topic: string; consent: boolean };
// Tipo de reunión: así Mario llega preparado
export const MEETING_TYPES = [
  { id: "primera", label: "Primera reunión", hint: "Conocernos y ver qué necesitas" },
  { id: "presupuesto", label: "Presupuesto", hint: "Ya sabes lo que quieres y buscas precio" },
  { id: "seguimiento", label: "Seguimiento", hint: "Ya trabajamos juntos" },
] as const;
type MeetingType = typeof MEETING_TYPES[number]["id"];

/** compact: versión reducida para mostrarla dentro del desplegable de la portada. */
export function Booking({ compact = false }: { compact?: boolean }) {
  const reduced = useMotionPreference();
  const today = dayKey(new Date());
  const [monthOffset, setMonthOffset] = useState(0);
  const [step, setStep] = useState(0);
  const [available, setAvailable] = useState<string[]>([]);
  const [daysLoading, setDaysLoading] = useState(true);
  const [daysError, setDaysError] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState<Form>({ name: "", email: "", phone: "", topic: "", consent: false });
  const [meetingType, setMeetingType] = useState<MeetingType>("primera");
  const typeLabel = MEETING_TYPES.find(t => t.id === meetingType)?.label ?? "Reunión";
  // Campo trampa: las personas no lo ven; los robots que rellenan todo, sí
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [retryDays, setRetryDays] = useState(0);
  const [retrySlots, setRetrySlots] = useState(0);

  const currentMonth = useMemo(() => {
    const [year = 2026, month = 1] = today.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1 + monthOffset, 1, 12));
  }, [today, monthOffset]);
  const year = currentMonth.getUTCFullYear();
  const month = currentMonth.getUTCMonth();
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const last = dayKey(new Date(Date.UTC(year, month + 1, 0, 12)));
  const from = first > today ? first : today;
  const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(currentMonth);

  useEffect(() => {
    let active = true;
    setDaysLoading(true);
    setDaysError("");
    bookingClient.rpc("get_available_days", { p_from: from, p_to: last }).then(({ data, error }) => {
      if (!active) return;
      setDaysLoading(false);
      if (error) { setDaysError("No se ha podido cargar el calendario. Inténtalo de nuevo."); setAvailable([]); }
      else setAvailable(Array.isArray(data) ? data : []);
    });
    return () => { active = false; };
  }, [from, last, retryDays]);

  useEffect(() => {
    if (!selectedDay) return;
    let active = true;
    setSlotsLoading(true);
    setSlotsError("");
    bookingClient.rpc("get_available_slots", { p_day: selectedDay }).then(({ data, error }) => {
      if (!active) return;
      setSlotsLoading(false);
      if (error) { setSlotsError("No se han podido cargar las horas. Inténtalo de nuevo."); setSlots([]); }
      else setSlots(Array.isArray(data) ? data.map((item: { starts_at: string }) => item.starts_at) : []);
    });
    return () => { active = false; };
  }, [selectedDay, retrySlots]);

  const cells = useMemo(() => {
    const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  }, [year, month]);

  const setField = (field: Field, value: string | boolean) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setSubmitError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !selectedSlot) return;
    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      const next: Partial<Record<Field, string>> = {};
      result.error.issues.forEach(issue => { const field = issue.path[0] as Field; if (!next[field]) next[field] = issue.message; });
      setErrors(next);
      return;
    }
    if (trap) { setConfirmedEmail(result.data.email); setStep(3); return; }
    setSubmitting(true);
    setSubmitError("");
    const { error } = await bookingClient.rpc("book_appointment", {
      p_name: result.data.name,
      p_email: result.data.email,
      p_phone: result.data.phone || null,
      p_topic: result.data.topic || null,
      p_starts_at: selectedSlot,
      p_type: meetingType,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("slot_unavailable")) {
        setSelectedSlot("");
        setRetrySlots(value => value + 1);
        setStep(1);
        setSubmitError("Esa hora acaba de ocuparse. Elige otra disponible.");
      } else if (error.message.includes("too_many")) {
        setSubmitError("Ya hay varias reuniones pendientes con este correo. Escríbele a Mario para organizar otra.");
      } else if (error.message.includes("busy")) {
        setSubmitError("Ahora mismo hay muchas reservas. Inténtalo dentro de un rato o escribe a mariete431@icloud.com.");
      } else if (error.message.includes("invalid_input") || error.code === "23514") {
        setSubmitError("Revisa tus datos: el nombre debe tener entre 2 y 80 caracteres y el correo debe ser válido.");
      } else setSubmitError("No hemos podido completar la reserva. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setConfirmedEmail(result.data.email);
    setStep(3);
  };

  const reset = () => {
    setSelectedDay(""); setSelectedSlot(""); setConfirmedEmail(""); setErrors({}); setSubmitError("");
    setForm({ name: "", email: "", phone: "", topic: "", consent: false }); setTrap(""); setMeetingType("primera");
    setMonthOffset(0); setRetryDays(value => value + 1); setStep(0);
  };

  return <div className={`booking-panel ${compact ? "booking-compact" : ""}`}>
    <div className="booking-progress" aria-label={`Paso ${step + 1} de 4`}>
      <div className="booking-step-labels">{steps.map((label, index) => <span key={label} className={index === step ? "active" : index < step ? "complete" : ""}><small>{index + 1}</small> {label}</span>)}</div>
      <div className="progress-track"><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
    </div>
    <div className="booking-grid">
      <aside className="booking-summary">
        <span className="eyebrow">ENCUENTRO PERSONAL</span>
        <h3>Un momento para<br /><em>conversar.</em></h3>
        <div className="summary-lines">
          <p>Reunión de 30 minutos</p><p>Por teléfono o videollamada</p><p>Hora de Canarias</p>
        </div>
        <div className="summary-selection">
          <span className="eyebrow">TU SELECCIÓN</span>
          <p>{typeLabel}</p>
          <p>{selectedDay ? formatDay(selectedDay) : "Elige un día para empezar"}</p>
          {selectedSlot && <p>{formatTime(selectedSlot)} · hora de Canarias</p>}
        </div>
      </aside>
      <div className="booking-main" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? {} : { opacity: 0, y: -8 }} transition={{ duration: .26 }}>
            {step === 0 && <>
              <span className="eyebrow">PASO 01 / 04</span><h3>Elige un día.</h3>
              <div className="calendar-heading"><strong>{monthLabel}</strong><div><Button variant="calendarNav" size="icon" aria-label="Mes anterior" disabled={monthOffset === 0} onClick={() => setMonthOffset(value => value - 1)}><ChevronLeft /></Button><Button variant="calendarNav" size="icon" aria-label="Mes siguiente" disabled={monthOffset === 2} onClick={() => setMonthOffset(value => value + 1)}><ChevronRight /></Button></div></div>
              <div className="calendar-grid" role="group" aria-label={`Disponibilidad de ${monthLabel}`}>
                {weekdays.map(day => <span className="weekday" key={day} aria-hidden="true">{day}</span>)}
                {cells.map((date, index) => date ? <Button key={date} variant="calendarDay" className={`${date === today ? "today" : ""} ${selectedDay === date ? "selected" : ""} ${daysLoading ? "loading-day" : ""}`} disabled={daysLoading || !available.includes(date) || date < today} onClick={() => { setSelectedDay(date); setSelectedSlot(""); setStep(1); }} aria-label={`${formatDay(date)}${available.includes(date) ? ", disponible" : ", no disponible"}`} aria-pressed={selectedDay === date}>{selectedDay === date && <motion.span layoutId="selected-calendar-day" className="selected-day-pill" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}<span className="day-number">{Number(date.slice(-2))}</span>{!daysLoading && available.includes(date) && <i />}</Button> : <span key={`empty-${index}`} />)}
              </div>
              {daysLoading && <p className="status-text">Consultando disponibilidad…</p>}
              {daysError && <div className="status-text error" role="alert">{daysError} <Button variant="text" onClick={() => setRetryDays(value => value + 1)}>Reintentar <ArrowRight /></Button></div>}
              {!daysLoading && !daysError && available.length === 0 && <p className="status-text">No hay huecos este mes. Consulta el mes siguiente.</p>}
            </>}
            {step === 1 && <>
              <span className="eyebrow">PASO 02 / 04</span><h3>Elige una hora.</h3>
              <p className="step-subtitle">{selectedDay && formatDay(selectedDay)} · hora de Canarias</p>
              {submitError && <p className="status-text error" role="alert">{submitError}</p>}
              {slotsLoading ? <div className="slots-grid">{Array.from({ length: 8 }, (_, i) => <span className="slot-skeleton" key={i} />)}</div> : <>
                {slotsError && <p className="status-text error" role="alert">{slotsError} <Button variant="text" onClick={() => setRetrySlots(value => value + 1)}>Reintentar <ArrowRight /></Button></p>}
                {!slotsError && slots.length === 0 && <p className="status-text">Ya no quedan horas para este día. Elige otro.</p>}
                <motion.div className="slots-grid" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : .045 } } }}>{slots.map(slot => <motion.div key={slot} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}><Button variant={selectedSlot === slot ? "slotSelected" : "slot"} onClick={() => selectedSlot === slot ? setStep(2) : setSelectedSlot(slot)}>{formatTime(slot)}{selectedSlot === slot && <span>— Confirmar <ArrowRight /></span>}</Button></motion.div>)}</motion.div>
              </>}
              <Button variant="text" className="back-button" onClick={() => { setSelectedSlot(""); setStep(0); }}><ArrowLeft /> Volver al día</Button>
            </>}
            {step === 2 && <>
              <span className="eyebrow">PASO 03 / 04</span><h3>Tus datos.</h3>
              <p className="step-subtitle">Solo lo necesario para ponernos en contacto.</p>
              <form className="booking-form" onSubmit={submit} noValidate>
                <fieldset className="meeting-types"><legend>Tipo de reunión</legend>
                  {MEETING_TYPES.map(t => <label key={t.id} className={`meeting-type ${meetingType === t.id ? "is-selected" : ""}`}>
                    <input type="radio" name="meeting-type" value={t.id} checked={meetingType === t.id} onChange={() => setMeetingType(t.id)} />
                    <strong>{t.label}</strong><small>{t.hint}</small>
                  </label>)}
                </fieldset>
                <div className="form-row"><label htmlFor="booking-name">Nombre <span aria-hidden="true">*</span></label><input id="booking-name" autoComplete="name" maxLength={LIMITS.name} required aria-required="true" value={form.name} onChange={e => setField("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder="Tu nombre" />{errors.name && <small id="name-error" role="alert">{errors.name}</small>}</div>
                <div className="form-row"><label htmlFor="booking-email">Email <span aria-hidden="true">*</span></label><input id="booking-email" type="email" autoComplete="email" maxLength={LIMITS.email} required aria-required="true" value={form.email} onChange={e => setField("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} placeholder="tu@email.com" />{errors.email && <small id="email-error" role="alert">{errors.email}</small>}</div>
                <div className="form-row"><label htmlFor="booking-phone">Teléfono <span className="optional">Opcional</span></label><input id="booking-phone" type="tel" autoComplete="tel" maxLength={LIMITS.phone} value={form.phone} onChange={e => setField("phone", e.target.value)} aria-invalid={!!errors.phone} placeholder="+34" />{errors.phone && <small role="alert">{errors.phone}</small>}</div>
                <div className="form-row"><label htmlFor="booking-topic">¿De qué quieres hablar? <span className="optional">Opcional · {form.topic.length}/{LIMITS.topic}</span></label><textarea id="booking-topic" rows={3} maxLength={LIMITS.topic} value={form.topic} onChange={e => setField("topic", e.target.value)} aria-invalid={!!errors.topic} placeholder="Cuéntame brevemente…" />{errors.topic && <small role="alert">{errors.topic}</small>}</div>
                <div className="hp-field" aria-hidden="true"><label htmlFor="booking-website">No rellenes este campo</label><input id="booking-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
                <label className="consent-row"><input type="checkbox" checked={form.consent} onChange={e => setField("consent", e.target.checked)} aria-invalid={!!errors.consent} aria-required="true" /><span>Acepto que Mario use estos datos solo para contactarme sobre esta reunión, según la <Link to="/privacidad" target="_blank" rel="noopener">política de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span></Link>.</span></label>
                {errors.consent && <small className="form-error" role="alert">{errors.consent}</small>}
                {submitError && <p className="form-error" role="alert">{submitError}</p>}
                <div className="form-actions"><Button type="button" variant="text" onClick={() => setStep(1)}><ArrowLeft /> Volver a la hora</Button><Button type="submit" variant="luxury" disabled={submitting}>{submitting ? "Confirmando…" : "Confirmar reunión"} {!submitting && <ArrowRight />}</Button></div>
              </form>
            </>}
            {step === 3 && <div className="confirmation">
              <motion.div className="confirmation-check" initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}><motion.svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><motion.path d="M5 12.5l4.3 4.2L19 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .25, duration: .75, ease: "easeInOut" }} /></motion.svg></motion.div>
              <span className="eyebrow">PASO 04 / 04</span><h3>Nos vemos pronto.</h3>
              <p>{typeLabel} reservada. Nos vemos el {formatDay(selectedDay)} a las {formatTime(selectedSlot)} (hora de Canarias). Te escribiré a <strong>{confirmedEmail}</strong> para confirmarla.</p>
              <div className="confirmation-actions"><Button variant="luxury" onClick={() => downloadCalendarEvent(selectedSlot, typeLabel)}><Download /> Añadir a mi calendario</Button><Button variant="outlineLuxury" onClick={reset}>Reservar otra <ArrowRight /></Button></div>
            </div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>;
}
