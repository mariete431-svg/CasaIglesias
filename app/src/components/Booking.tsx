import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useMotionPreference } from "@/components/EditorialEffects";
import { dayKey, downloadCalendarEvent, formatDay, formatTime } from "@/lib/appointments";
import { bookingClient } from "@/lib/supabase";
import { LOCALES, useLang, useLocalize, useT, type Dict } from "@/i18n";

// Los mismos límites que la base de datos, para que nunca rechace algo que aquí parecía válido
const LIMITS = { name: 80, email: 120, phone: 30, topic: 500 };
const makeSchema = (v: Dict["booking"]["v"]) => z.object({
  name: z.string().trim().min(2, v.name).max(LIMITS.name, v.nameMax),
  email: z.string().trim().email(v.email).max(LIMITS.email, v.emailMax),
  phone: z.string().trim().max(LIMITS.phone, v.phoneMax),
  topic: z.string().trim().max(LIMITS.topic, v.topicMax),
  consent: z.literal(true, { error: v.consent }),
});
type Field = "name" | "email" | "phone" | "topic" | "consent";
type Form = { name: string; email: string; phone: string; topic: string; consent: boolean };
// Tipo de reunión: así Mario llega preparado
const MEETING_TYPES = ["primera", "presupuesto", "seguimiento"] as const;
type MeetingType = typeof MEETING_TYPES[number];

/** compact: versión reducida para mostrarla dentro del desplegable de la portada. */
export function Booking({ compact = false }: { compact?: boolean }) {
  const reduced = useMotionPreference();
  const t = useT().booking;
  const locale = LOCALES[useLang()];
  const local = useLocalize();
  const fDay = (key: string) => formatDay(key, locale);
  const fTime = (iso: string) => formatTime(iso, locale);
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
  const typeLabel = t.types[meetingType]?.[0] ?? "";
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
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(currentMonth);

  useEffect(() => {
    let active = true;
    setDaysLoading(true);
    setDaysError("");
    bookingClient.rpc("get_available_days", { p_from: from, p_to: last }).then(({ data, error }) => {
      if (!active) return;
      setDaysLoading(false);
      if (error) { setDaysError(t.daysError); setAvailable([]); }
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
      if (error) { setSlotsError(t.slotsError); setSlots([]); }
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
    const result = makeSchema(t.v).safeParse(form);
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
        setSubmitError(t.taken);
      } else if (error.message.includes("too_many")) {
        setSubmitError(t.tooMany);
      } else if (error.message.includes("busy")) {
        setSubmitError(t.busy);
      } else if (error.message.includes("invalid_input") || error.code === "23514") {
        setSubmitError(t.invalid);
      } else setSubmitError(t.failed);
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
    <div className="booking-progress" aria-label={t.stepOf(step + 1)}>
      <div className="booking-step-labels">{t.steps.map((label, index) => <span key={label} className={index === step ? "active" : index < step ? "complete" : ""}><small>{index + 1}</small> {label}</span>)}</div>
      <div className="progress-track"><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
    </div>
    <div className="booking-grid">
      <aside className="booking-summary">
        <span className="eyebrow">{t.eyebrow}</span>
        <h3>{t.title1}<br /><em>{t.titleEm}</em></h3>
        <div className="summary-lines">{t.lines.map(x => <p key={x}>{x}</p>)}</div>
        <div className="summary-selection">
          <span className="eyebrow">{t.selection}</span>
          <p>{typeLabel}</p>
          <p>{selectedDay ? fDay(selectedDay) : t.pickDay}</p>
          {selectedSlot && <p>{fTime(selectedSlot)} · {t.canaryTime}</p>}
        </div>
      </aside>
      <div className="booking-main" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? {} : { opacity: 0, y: -8 }} transition={{ duration: .26 }}>
            {step === 0 && <>
              <span className="eyebrow">01 / 04</span><h3>{t.step1}</h3>
              <div className="calendar-heading"><strong>{monthLabel}</strong><div><Button variant="calendarNav" size="icon" aria-label={t.prevMonth} disabled={monthOffset === 0} onClick={() => setMonthOffset(value => value - 1)}><ChevronLeft /></Button><Button variant="calendarNav" size="icon" aria-label={t.nextMonth} disabled={monthOffset === 2} onClick={() => setMonthOffset(value => value + 1)}><ChevronRight /></Button></div></div>
              <div className="calendar-grid" role="group" aria-label={t.availability(monthLabel)}>
                {t.weekdays.map(day => <span className="weekday" key={day} aria-hidden="true">{day}</span>)}
                {cells.map((date, index) => date ? <Button key={date} variant="calendarDay" className={`${date === today ? "today" : ""} ${selectedDay === date ? "selected" : ""} ${daysLoading ? "loading-day" : ""}`} disabled={daysLoading || !available.includes(date) || date < today} onClick={() => { setSelectedDay(date); setSelectedSlot(""); setStep(1); }} aria-label={`${fDay(date)}, ${available.includes(date) ? t.available : t.unavailable}`} aria-pressed={selectedDay === date}>{selectedDay === date && <motion.span layoutId="selected-calendar-day" className="selected-day-pill" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}<span className="day-number">{Number(date.slice(-2))}</span>{!daysLoading && available.includes(date) && <i />}</Button> : <span key={`empty-${index}`} />)}
              </div>
              {daysLoading && <p className="status-text">{t.checking}</p>}
              {daysError && <div className="status-text error" role="alert">{daysError} <Button variant="text" onClick={() => setRetryDays(value => value + 1)}>{t.retry} <ArrowRight /></Button></div>}
              {!daysLoading && !daysError && available.length === 0 && <p className="status-text">{t.noDays}</p>}
            </>}
            {step === 1 && <>
              <span className="eyebrow">02 / 04</span><h3>{t.step2}</h3>
              <p className="step-subtitle">{selectedDay && fDay(selectedDay)} · {t.canaryTime}</p>
              {submitError && <p className="status-text error" role="alert">{submitError}</p>}
              {slotsLoading ? <div className="slots-grid">{Array.from({ length: 8 }, (_, i) => <span className="slot-skeleton" key={i} />)}</div> : <>
                {slotsError && <p className="status-text error" role="alert">{slotsError} <Button variant="text" onClick={() => setRetrySlots(value => value + 1)}>{t.retry} <ArrowRight /></Button></p>}
                {!slotsError && slots.length === 0 && <p className="status-text">{t.noSlots}</p>}
                <motion.div className="slots-grid" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : .045 } } }}>{slots.map(slot => <motion.div key={slot} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}><Button variant={selectedSlot === slot ? "slotSelected" : "slot"} onClick={() => selectedSlot === slot ? setStep(2) : setSelectedSlot(slot)}>{fTime(slot)}{selectedSlot === slot && <span>— {t.confirm} <ArrowRight /></span>}</Button></motion.div>)}</motion.div>
              </>}
              <Button variant="text" className="back-button" onClick={() => { setSelectedSlot(""); setStep(0); }}><ArrowLeft /> {t.backDay}</Button>
            </>}
            {step === 2 && <>
              <span className="eyebrow">03 / 04</span><h3>{t.step3}</h3>
              <p className="step-subtitle">{t.step3sub}</p>
              <form className="booking-form" onSubmit={submit} noValidate>
                <fieldset className="meeting-types"><legend>{t.typeLegend}</legend>
                  {MEETING_TYPES.map(id => <label key={id} className={`meeting-type ${meetingType === id ? "is-selected" : ""}`}>
                    <input type="radio" name="meeting-type" value={id} checked={meetingType === id} onChange={() => setMeetingType(id)} />
                    <strong>{t.types[id]?.[0]}</strong><small>{t.types[id]?.[1]}</small>
                  </label>)}
                </fieldset>
                <div className="form-row"><label htmlFor="booking-name">{t.name} <span aria-hidden="true">*</span></label><input id="booking-name" autoComplete="name" maxLength={LIMITS.name} required aria-required="true" value={form.name} onChange={e => setField("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} placeholder={t.namePh} />{errors.name && <small id="name-error" role="alert">{errors.name}</small>}</div>
                <div className="form-row"><label htmlFor="booking-email">{t.email} <span aria-hidden="true">*</span></label><input id="booking-email" type="email" autoComplete="email" maxLength={LIMITS.email} required aria-required="true" value={form.email} onChange={e => setField("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} placeholder={t.emailPh} />{errors.email && <small id="email-error" role="alert">{errors.email}</small>}</div>
                <div className="form-row"><label htmlFor="booking-phone">{t.phone} <span className="optional">{t.optional}</span></label><input id="booking-phone" type="tel" autoComplete="tel" maxLength={LIMITS.phone} value={form.phone} onChange={e => setField("phone", e.target.value)} aria-invalid={!!errors.phone} placeholder="+34" />{errors.phone && <small role="alert">{errors.phone}</small>}</div>
                <div className="form-row"><label htmlFor="booking-topic">{t.topic} <span className="optional">{t.optional} · {form.topic.length}/{LIMITS.topic}</span></label><textarea id="booking-topic" rows={3} maxLength={LIMITS.topic} value={form.topic} onChange={e => setField("topic", e.target.value)} aria-invalid={!!errors.topic} placeholder={t.topicPh} />{errors.topic && <small role="alert">{errors.topic}</small>}</div>
                <div className="hp-field" aria-hidden="true"><label htmlFor="booking-website">{useT().reviews.trap}</label><input id="booking-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
                <label className="consent-row"><input type="checkbox" checked={form.consent} onChange={e => setField("consent", e.target.checked)} aria-invalid={!!errors.consent} aria-required="true" /><span>{t.consent}<Link to={local("/privacidad")} target="_blank" rel="noopener">{t.privacyLink}<span className="sr-only">{t.newTab}</span></Link>.</span></label>
                {errors.consent && <small className="form-error" role="alert">{errors.consent}</small>}
                {submitError && <p className="form-error" role="alert">{submitError}</p>}
                <div className="form-actions"><Button type="button" variant="text" onClick={() => setStep(1)}><ArrowLeft /> {t.backTime}</Button><Button type="submit" variant="luxury" disabled={submitting}>{submitting ? t.confirming : t.confirmMeeting} {!submitting && <ArrowRight />}</Button></div>
              </form>
            </>}
            {step === 3 && <div className="confirmation">
              <motion.div className="confirmation-check" initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }}><motion.svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><motion.path d="M5 12.5l4.3 4.2L19 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .25, duration: .75, ease: "easeInOut" }} /></motion.svg></motion.div>
              <span className="eyebrow">04 / 04</span><h3>{t.step4}</h3>
              <p>{t.booked(typeLabel, fDay(selectedDay), fTime(selectedSlot))}<strong>{confirmedEmail}</strong>{t.booked2}</p>
              <div className="confirmation-actions"><Button variant="luxury" onClick={() => downloadCalendarEvent(selectedSlot, { summary: t.icsSummary(typeLabel), description: t.icsDescription, alarm: t.icsAlarm })}><Download /> {t.addCalendar}</Button><Button variant="outlineLuxury" onClick={reset}>{t.another} <ArrowRight /></Button></div>
            </div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>;
}
