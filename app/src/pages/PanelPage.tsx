import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp, Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { useToast } from "@/components/Toast";
import { isAdminSession, publicClient, supabase } from "@/lib/supabase";
import { capitalize, dayKey, formatDay } from "@/lib/appointments";
import { readStored, writeStored } from "@/lib/utils";

/* ---------- Calendario: mismos datos que el panel antiguo ---------- */
const TAGS = [
  { id: "yellow", label: "Importante", hex: "#FFE98A" },
  { id: "forest", label: "Trabajo", hex: "#F3E9D6" },
  { id: "blue", label: "Personal", hex: "#7EA3C9" },
  { id: "rose", label: "Recordatorio", hex: "#D99A9A" },
] as const;
const CAL_KEY = "mario-calendario-dias";
type DayInfo = { color: string | null; events: { id?: string; text: string }[] };
type DayMap = Record<string, DayInfo>;
const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

const building = [
  { name: "Mi primera web", pct: 100, state: "COMPLETADO" },
  { name: "Mi lista de tareas", pct: 100, state: "COMPLETADO" },
  { name: "Edición de vídeo", pct: 35, state: "EN PROCESO" },
  { name: "Nuevo proyecto", pct: 0, state: "PRÓXIMAMENTE" },
];

function loadLocal(): DayMap {
  const saved = readStored<DayMap>(CAL_KEY, {});
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

function Planner() {
  const toast = useToast();
  const today = dayKey(new Date());
  const [cloud, setCloud] = useState(false);
  const [data, setData] = useState<DayMap>(loadLocal);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(today);
  const [note, setNote] = useState("");

  // Con sesión de administrador, los datos vienen de la nube
  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await isAdminSession())) return;
      const [colors, reminders] = await Promise.all([
        supabase.from("calendar_days").select("day, color"),
        supabase.from("reminders").select("id, day, text").order("created_at"),
      ]);
      if (!active || colors.error || reminders.error) return;
      const next: DayMap = {};
      colors.data.forEach(d => { next[d.day] = { color: d.color, events: [] }; });
      reminders.data.forEach(r => { (next[r.day] ??= { color: null, events: [] }).events.push({ id: r.id, text: r.text }); });
      setData(next);
      setCloud(true);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (!cloud) writeStored(CAL_KEY, data); }, [data, cloud]);

  const [y, m] = today.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1, 12));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const cells = useMemo(() => {
    const lead = (first.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = data[selected] ?? { color: null, events: [] };
  const update = (day: string, fn: (d: DayInfo) => DayInfo) => setData(prev => ({ ...prev, [day]: fn(prev[day] ?? { color: null, events: [] }) }));

  const setColor = async (color: string) => {
    const next = info.color === color ? null : color;
    if (cloud) {
      const { error } = next
        ? await supabase.from("calendar_days").upsert({ day: selected, color: next })
        : await supabase.from("calendar_days").delete().eq("day", selected);
      if (error) return toast("No se ha podido guardar.", true);
    }
    update(selected, d => ({ ...d, color: next }));
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = note.trim().slice(0, 200);
    if (!text) return;
    let id: string | undefined;
    if (cloud) {
      const { data: row, error } = await supabase.from("reminders").insert({ day: selected, text }).select("id").single();
      if (error) return toast("No se ha podido guardar la nota.", true);
      id = row.id;
    }
    update(selected, d => ({ ...d, events: [...d.events, { id, text }] }));
    setNote("");
  };

  const removeNote = async (index: number) => {
    const event = info.events[index];
    if (cloud && event.id) {
      const { error } = await supabase.from("reminders").delete().eq("id", event.id);
      if (error) return toast("No se ha podido borrar.", true);
    }
    update(selected, d => ({ ...d, events: d.events.filter((_, i) => i !== index) }));
  };

  return <div className="lux-panel planner">
    <div className="planner-cal">
      <div className="calendar-heading"><strong>{capitalize(label)}</strong><div>
        <Button variant="calendarNav" size="icon" aria-label="Mes anterior" onClick={() => setOffset(o => o - 1)}><ChevronLeft /></Button>
        <Button variant="calendarNav" size="icon" aria-label="Mes siguiente" onClick={() => setOffset(o => o + 1)}><ChevronRight /></Button>
      </div></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${year}-${month}`} className="calendar-grid" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .28 }}>
          {weekdays.map(d => <span className="weekday" key={d} aria-hidden="true">{d}</span>)}
          {cells.map((date, i) => {
            if (!date) return <span key={`e${i}`} />;
            const d = data[date];
            const tag = TAGS.find(t => t.id === d?.color);
            return <Button key={date} variant="calendarDay" className={`${date === today ? "today" : ""}`} onClick={() => setSelected(date)} aria-pressed={selected === date} aria-label={`${formatDay(date)}${tag ? `, ${tag.label}` : ""}${d?.events.length ? `, ${d.events.length} notas` : ""}`}>
              {selected === date && <motion.span layoutId="planner-day" className="selected-day-pill" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
              <span className="day-number">{Number(date.slice(-2))}</span>
              {tag && <span className="color-dot" style={{ background: tag.hex }} />}
              {!!d?.events.length && <span className="cal-note-dot" />}
            </Button>;
          })}
        </motion.div>
      </AnimatePresence>
      {cloud ? <p className="sync-pill" style={{ marginTop: 22 }}><i /> SINCRONIZADO CON TU CUENTA</p>
        : <p className="form-note" style={{ marginTop: 22 }}>Lo que marques aquí se guarda solo en este navegador. Nadie más lo ve.</p>}
    </div>

    <div className="planner-day" aria-live="polite">
      <div><span className="eyebrow">DÍA SELECCIONADO</span><h3>{capitalize(formatDay(selected).replace(/ de \d{4}$/, ""))}</h3></div>
      <div className="tag-list" role="group" aria-label="Etiqueta del día">
        {TAGS.map(t => <button key={t.id} type="button" className="tag-button" aria-pressed={info.color === t.id} onClick={() => setColor(t.id)}><i style={{ background: t.hex }} />{t.label}</button>)}
      </div>
      <form className="inline-form" onSubmit={addNote}>
        <input className="lux-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Añade una nota para este día…" maxLength={200} aria-label="Nueva nota" />
        <Button type="submit" variant="luxury" disabled={!note.trim()}>Añadir</Button>
      </form>
      {info.events.length
        ? <ul className="note-list"><AnimatePresence initial={false}>{info.events.map((e, i) => <motion.li key={e.id ?? `${e.text}-${i}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}><span>{e.text}</span><button type="button" className="icon-button" aria-label={`Borrar nota "${e.text}"`} onClick={() => removeNote(i)}><X /></button></motion.li>)}</AnimatePresence></ul>
        : <p className="status-text" style={{ margin: 0 }}>Todavía no has añadido nada para este día.</p>}
    </div>
  </div>;
}

/* ---------- Libro de visitas ---------- */
type Comment = { id: number; name: string; message: string; created_at: string };
const fmtDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Atlantic/Canary" });

function Guestbook() {
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  // Campo trampa contra robots (las personas no lo ven)
  const [trap, setTrap] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await publicClient.from("comments").select("id, name, message, created_at").order("created_at", { ascending: false });
    setLoading(false);
    if (!error && data) setComments(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const n = name.trim(), msg = message.trim();
    if (!n || !msg) return toast("Escribe tu nombre y tu comentario.", true);
    if (trap) { setName(""); setMessage(""); return toast("¡Gracias! Tu comentario se publicará cuando Mario lo revise."); }
    setSending(true);
    const { error } = await publicClient.from("comments").insert({ name: n.slice(0, 50), message: msg.slice(0, 500) });
    setSending(false);
    if (error) return toast(error.message.includes("too_many") ? "Se han escrito muchos comentarios seguidos. Prueba dentro de unos minutos." : "No se ha podido publicar. Inténtalo de nuevo.", true);
    setName(""); setMessage("");
    toast("¡Gracias! Tu comentario se publicará cuando Mario lo revise.");
    load();
  };

  return <div className="guestbook">
    <Reveal><form className="booking-form" onSubmit={submit}>
      <div className="form-row"><label htmlFor="gb-name">Tu nombre</label><input id="gb-name" value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder="¿Cómo te llamas?" /></div>
      <div className="form-row"><label htmlFor="gb-msg">Comentario</label><textarea id="gb-msg" rows={5} value={message} onChange={e => setMessage(e.target.value)} maxLength={500} placeholder="Escribe algo…" /></div>
      <div className="hp-field" aria-hidden="true"><label htmlFor="gb-website">No rellenes este campo</label><input id="gb-website" tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></div>
      <p className="form-note">Tu nombre y tu comentario se publicarán en esta web cuando Mario los revise. Más información en la <Link to="/privacidad">política de privacidad</Link>.</p>
      <div className="form-actions"><small className="tasks-count" style={{ color: "var(--muted-foreground)" }}>{message.length}/500</small><Button type="submit" variant="luxury" disabled={sending}>{sending ? "Publicando…" : "Publicar comentario"} {!sending && <ArrowRight />}</Button></div>
    </form></Reveal>
    <div>
      {loading ? <p className="status-text">Cargando comentarios…</p>
        : comments.length === 0 ? <div className="empty-state"><strong>Sé el primero.</strong><p>Todavía no hay comentarios.</p></div>
          : <ul className="comment-list"><AnimatePresence initial={false}>{comments.map(c => <motion.li key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
            <header><strong>{c.name}</strong><time dateTime={c.created_at}>{fmtDate.format(new Date(c.created_at)).toUpperCase()}</time></header><p>{c.message}</p>
          </motion.li>)}</AnimatePresence></ul>}
    </div>
  </div>;
}

export default function PanelPage() {
  usePageTitle("Mi panel — Casa Iglesias");
  return <main>
    <PageHero
      eyebrow="PROYECTO 03 — PANEL PERSONAL · 2026"
      lines={["Hola,", "Mario."]}
      subtitle="Un vistazo rápido a lo que estoy aprendiendo, construyendo y consiguiendo."
      bottomHref="#resumen"
    />

    <section id="resumen" className="section-pad"><div className="section-wrap">
      <SectionHeading label="01 / RESUMEN" />
      <Reveal><div className="stat-row">
        <div className="stat"><span className="eyebrow">PROYECTOS</span><div className="stat-value"><CountUp to={3} /><small>/4</small></div><p>3 terminados de 4</p><div className="bar"><motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: .75 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [.22, 1, .36, 1] }} /></div></div>
        <div className="stat"><span className="eyebrow">TECNOLOGÍAS</span><div className="stat-value"><CountUp to={3} /></div><p>HTML · CSS · JavaScript</p></div>
        <div className="stat"><span className="eyebrow">IDIOMAS</span><div className="stat-value"><CountUp to={1} /><small>/2</small></div><p>Español nativo · Inglés medio</p></div>
      </div></Reveal>
    </div></section>

    <section className="skills-section section-pad"><div className="section-wrap">
      <SectionHeading label="02 / EN MARCHA" />
      <Reveal><div className="intro-row"><h2>Lo que estoy<br /><em>construyendo.</em></h2><p>Cada proyecto terminado es un paso más.</p></div></Reveal>
      <div className="progress-list">{building.map((item, i) => <Reveal key={item.name} delay={i * .05}><div className="progress-item">
        <strong>{item.name}</strong>
        <span><span className="pct">{item.pct}%</span><br />{item.state}</span>
        <div className="bar"><motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: item.pct / 100 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: .15 + i * .1, ease: [.22, 1, .36, 1] }} /></div>
      </div></Reveal>)}</div>
    </div></section>

    <section className="section-pad"><div className="section-wrap">
      <SectionHeading label="03 / MI CALENDARIO" />
      <Reveal><div className="intro-row"><h2>Días que<br /><em>importan.</em></h2><p>Elige un día para marcarlo con un color o apuntar una nota.</p></div></Reveal>
      <Reveal><Planner /></Reveal>
    </div></section>

    <section id="visitantes" className="reserve-section section-pad"><div className="section-wrap">
      <SectionHeading label="04 / VISITANTES" />
      <Reveal><div className="intro-row"><h2>Deja una<br /><em>nota.</em></h2><p>Si has pasado por aquí, puedes dejarme un comentario.</p></div></Reveal>
      <Guestbook />
    </div></section>
  </main>;
}
