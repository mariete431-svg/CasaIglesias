import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LogOut, Trash2, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { HeroTitle, Reveal } from "@/components/EditorialEffects";
import { usePageTitle } from "@/components/SiteChrome";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { ZONE, capitalize, formatDay } from "@/lib/appointments";
import { onTabListKeyDown } from "@/lib/utils";

/* =========================================================
   Acceso: email + contraseña de Supabase, solo para admins
   ========================================================= */

type Gate = "loading" | "login" | "recovery" | "denied" | "ok";

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.append(meta);
    return () => meta.remove();
  }, []);
}

export default function AdminPage() {
  usePageTitle("Panel privado — Casa Iglesias");
  useNoIndex();
  const [gate, setGate] = useState<Gate>("loading");
  const [session, setSession] = useState<Session | null>(null);

  const check = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) return setGate("login");
    const { data, error } = await supabase.rpc("is_admin");
    setGate(!error && data === true ? "ok" : "denied");
  }, []);

  useEffect(() => {
    let recovering = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") { recovering = true; setSession(s); setGate("recovery"); return; }
      if (recovering) return;
      // Fuera del aviso de Supabase: llamar a Supabase dentro de él puede bloquearse
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.setTimeout(() => check(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => { if (!recovering) check(data.session); });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  return <main>
    <AnimatePresence mode="wait">
      <motion.div key={gate} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
        {gate === "loading" && <div className="auth-wrap"><p className="status-text">Comprobando acceso…</p></div>}
        {gate === "login" && <LoginCard />}
        {gate === "recovery" && <RecoveryCard onDone={() => check(session)} />}
        {gate === "denied" && <div className="auth-wrap"><div className="auth-card lux-panel lux-panel-pad">
          <span className="eyebrow">PANEL PRIVADO</span><h1>Sin <em>acceso.</em></h1>
          <p>Esta cuenta ({session?.user.email}) no tiene acceso al panel.</p>
          <Button variant="luxury" onClick={() => supabase.auth.signOut()}>Cerrar sesión <LogOut /></Button>
        </div></div>}
        {gate === "ok" && <Dashboard email={session?.user.email ?? ""} />}
      </motion.div>
    </AnimatePresence>
  </main>;
}

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return setStatus({ text: "Escribe tu email y tu contraseña.", error: true });
    setBusy(true); setStatus({ text: "Entrando…" });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setStatus({ text: "Email o contraseña incorrectos.", error: true });
  };

  const forgot = async () => {
    if (!email.trim()) return setStatus({ text: "Escribe primero tu email arriba.", error: true });
    // Se vuelve a admin.html, que reenvía aquí conservando el enlace de recuperación
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}admin.html`;
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setStatus({ text: "Si el email es correcto, te llegará un enlace para cambiar la contraseña." });
  };

  return <div className="auth-wrap"><Reveal immediate><div className="auth-card lux-panel lux-panel-pad">
    <span className="eyebrow">PANEL PRIVADO</span>
    <h1>Bienvenido<br /><em>de nuevo.</em></h1>
    <p>Entra con tu email y tu contraseña.</p>
    <form className="booking-form" onSubmit={login} noValidate>
      <div className="form-row"><label htmlFor="adm-email">Email</label><input id="adm-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="form-row"><label htmlFor="adm-pass">Contraseña</label><input id="adm-pass" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {status && <p className={`status-text ${status.error ? "error" : ""}`} role="status" style={{ margin: 0 }}>{status.text}</p>}
      <div className="form-actions"><Button type="button" variant="text" onClick={forgot}>¿Has olvidado la contraseña?</Button><Button type="submit" variant="luxury" disabled={busy}>Entrar <ArrowRight /></Button></div>
    </form>
  </div></Reveal></div>;
}

function RecoveryCard({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setStatus({ text: "Mínimo 8 caracteres.", error: true });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setStatus({ text: "No se ha podido cambiar. Pide otro enlace.", error: true });
    onDone();
  };
  return <div className="auth-wrap"><div className="auth-card lux-panel lux-panel-pad">
    <span className="eyebrow">PANEL PRIVADO</span>
    <h1>Nueva<br /><em>contraseña.</em></h1>
    <p>Elige una contraseña nueva de al menos 8 caracteres.</p>
    <form className="booking-form" onSubmit={save}>
      <div className="form-row"><label htmlFor="adm-new">Nueva contraseña</label><input id="adm-new" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {status && <p className={`status-text ${status.error ? "error" : ""}`} style={{ margin: 0 }}>{status.text}</p>}
      <div className="form-actions"><span /><Button type="submit" variant="luxury">Guardar <ArrowRight /></Button></div>
    </form>
  </div></div>;
}

/* =========================================================
   Panel
   ========================================================= */

type Booking = { id: string; name: string; email: string; phone: string | null; topic: string | null; starts_at: string; status: string; admin_note: string | null; created_at: string };
const STATUSES = [
  { id: "pendiente", label: "Pendiente", color: "oklch(0.78 0.13 96)" },
  { id: "confirmada", label: "Confirmada", color: "oklch(0.55 0.09 150)" },
  { id: "completada", label: "Completada", color: "oklch(0.6 0.01 80)" },
  { id: "cancelada", label: "Cancelada", color: "oklch(0.54 0.17 30)" },
];
const fmtWhen = new Intl.DateTimeFormat("es-ES", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });
const fmtHour = new Intl.DateTimeFormat("es-ES", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" });
const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit" }).format(d);
const TABS = [
  { id: "citas", label: "Citas" }, { id: "tareas", label: "Tareas" },
  { id: "recordatorios", label: "Recordatorios" }, { id: "horario", label: "Horario" },
  { id: "comentarios", label: "Comentarios" },
] as const;
type Tab = typeof TABS[number]["id"];

function Dashboard({ email }: { email: string }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("citas");
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadBookings = useCallback(async () => {
    const { data, error } = await supabase.from("bookings").select("*").order("starts_at", { ascending: true });
    if (error) return toast("No se han podido cargar las citas.", true);
    setBookings(data as Booking[]);
  }, [toast]);
  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Comentarios que esperan tu aprobación (para el número de la pestaña)
  const [pendingComments, setPendingComments] = useState(0);
  const loadPendingComments = useCallback(async () => {
    const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("approved", false);
    setPendingComments(count ?? 0);
  }, []);
  useEffect(() => { loadPendingComments(); }, [loadPendingComments]);

  const now = Date.now();
  const active = bookings.filter(b => b.status !== "cancelada");
  const pending = bookings.filter(b => b.status === "pendiente").length;
  const upcoming = active.filter(b => new Date(b.starts_at).getTime() > now).length;
  const thisMonth = active.filter(b => monthKey(new Date(b.starts_at)) === monthKey(new Date())).length;

  return <section className="section-pad" style={{ paddingTop: 150 }}><div className="section-wrap">
    <div className="admin-top">
      <div><Reveal immediate><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> PANEL PRIVADO · {email.toUpperCase()}</p></Reveal><HeroTitle lines={["Hola,", "Mario."]} id="admin-title" delay={.1} /></div>
      <Button variant="outlineLuxury" onClick={() => supabase.auth.signOut()}>Cerrar sesión <LogOut /></Button>
    </div>

    <Reveal><div className="admin-stats">
      <div><span className="eyebrow">PENDIENTES</span><strong>{pending}</strong></div>
      <div><span className="eyebrow">PRÓXIMAS</span><strong>{upcoming}</strong></div>
      <div><span className="eyebrow">ESTE MES</span><strong>{thisMonth}</strong></div>
    </div></Reveal>

    <LayoutGroup id="admin-tabs"><div className="tab-bar" role="tablist" aria-label="Secciones del panel" onKeyDown={onTabListKeyDown}>
      {TABS.map(t => <button key={t.id} id={`pestana-${t.id}`} role="tab" aria-selected={tab === t.id} aria-controls="panel-pestana" tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}>
        {t.label}{t.id === "citas" && pending > 0 && <span className="count-badge">{pending}</span>}{t.id === "comentarios" && pendingComments > 0 && <span className="count-badge">{pendingComments}</span>}
        {tab === t.id && <motion.span layoutId="admin-tab" className="tab-indicator" transition={{ type: "spring", stiffness: 400, damping: 36 }} />}
      </button>)}
    </div></LayoutGroup>

    <AnimatePresence mode="wait">
      <motion.div key={tab} id="panel-pestana" role="tabpanel" aria-labelledby={`pestana-${tab}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .3 }}>
        {tab === "citas" && <BookingsTab bookings={bookings} setBookings={setBookings} />}
        {tab === "tareas" && <TasksTab />}
        {tab === "recordatorios" && <RemindersTab />}
        {tab === "horario" && <ScheduleTab />}
        {tab === "comentarios" && <CommentsTab onChange={loadPendingComments} />}
      </motion.div>
    </AnimatePresence>
  </div></section>;
}

/* ---------- Citas ---------- */
function BookingsTab({ bookings, setBookings }: { bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const toast = useToast();
  const [when, setWhen] = useState<"next" | "past" | "all">("next");
  const [status, setStatus] = useState("all");
  const now = Date.now();

  const visible = useMemo(() => {
    const list = bookings.filter(b => {
      const t = new Date(b.starts_at).getTime();
      if (when === "next" && t < now) return false;
      if (when === "past" && t >= now) return false;
      return status === "all" || b.status === status;
    });
    return when === "past" ? [...list].reverse() : list;
  }, [bookings, when, status, now]);

  const patch = async (b: Booking, change: Partial<Booking>, ok: string) => {
    const { error } = await supabase.from("bookings").update(change).eq("id", b.id);
    if (error) return toast("No se ha podido guardar.", true);
    setBookings(list => list.map(x => x.id === b.id ? { ...x, ...change } : x));
    toast(ok);
  };

  const remove = async (b: Booking) => {
    if (!confirm(`¿Borrar la cita de ${b.name}? No se puede deshacer.`)) return;
    const { error } = await supabase.from("bookings").delete().eq("id", b.id);
    if (error) return toast("No se ha podido borrar.", true);
    setBookings(list => list.filter(x => x.id !== b.id));
    toast("Cita borrada.");
  };

  return <>
    <div className="filter-row">
      {([["next", "Próximas"], ["past", "Pasadas"], ["all", "Todas"]] as const).map(([id, label]) => <button key={id} className="chip" aria-pressed={when === id} onClick={() => setWhen(id)}>{label}</button>)}
      <span style={{ width: 16 }} />
      <button className="chip" aria-pressed={status === "all"} onClick={() => setStatus("all")}>Todos los estados</button>
      {STATUSES.map(s => <button key={s.id} className="chip" aria-pressed={status === s.id} onClick={() => setStatus(s.id)}>{s.label}</button>)}
    </div>
    {visible.length === 0
      ? <div className="empty-state"><strong>Sin citas.</strong><p>No hay citas con estos filtros.</p></div>
      : <div><AnimatePresence initial={false}>{visible.map(b => <BookingCard key={b.id} b={b} onPatch={patch} onRemove={remove} />)}</AnimatePresence></div>}
  </>;
}

function BookingCard({ b, onPatch, onRemove }: { b: Booking; onPatch: (b: Booking, c: Partial<Booking>, ok: string) => void; onRemove: (b: Booking) => void }) {
  const [note, setNote] = useState(b.admin_note ?? "");
  const st = STATUSES.find(s => s.id === b.status) ?? STATUSES[0];
  const date = new Date(b.starts_at);
  return <motion.article layout className="booking-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: .35 }}>
    <div className="booking-when"><strong>{fmtHour.format(date)}</strong><span>{capitalize(fmtWhen.format(date))}</span></div>
    <div className="booking-who">
      <strong>{b.name}</strong>
      <a href={`mailto:${b.email}`}>{b.email}</a>{b.phone && <a href={`tel:${b.phone}`}>{b.phone}</a>}
      {b.topic && <p>“{b.topic}”</p>}
      <form className="note-form" onSubmit={e => { e.preventDefault(); onPatch(b, { admin_note: note.trim() || null }, "Nota guardada."); }}>
        <input className="lux-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Nota privada…" maxLength={500} aria-label={`Nota privada sobre ${b.name}`} />
        <Button type="submit" variant="outlineLuxury" disabled={(b.admin_note ?? "") === note.trim()}>Guardar</Button>
      </form>
    </div>
    <div className="booking-side">
      <span className="status-tag"><i style={{ background: st.color }} />{st.label}</span>
      <select className="status-select" value={b.status} aria-label={`Estado de la cita de ${b.name}`} onChange={e => onPatch(b, { status: e.target.value }, "Estado actualizado.")}>
        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <button type="button" className="icon-button" aria-label={`Borrar la cita de ${b.name}`} onClick={() => onRemove(b)}><Trash2 /></button>
    </div>
  </motion.article>;
}

/* ---------- Comentarios: aprobar, ocultar o borrar ---------- */
type AdminComment = { id: number; name: string; message: string; created_at: string; approved: boolean };
const fmtComment = new Intl.DateTimeFormat("es-ES", { timeZone: ZONE, day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

function CommentsTab({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<"pending" | "approved" | "all">("pending");

  useEffect(() => {
    supabase.from("comments").select("id, name, message, created_at, approved").order("created_at", { ascending: false }).then(({ data, error }) => {
      setLoading(false);
      if (error) toast("No se han podido cargar los comentarios.", true); else setComments(data as AdminComment[]);
    });
  }, [toast]);

  const setApproved = async (c: AdminComment, approved: boolean) => {
    const { error } = await supabase.from("comments").update({ approved }).eq("id", c.id);
    if (error) return toast("No se ha podido guardar.", true);
    setComments(list => list.map(x => x.id === c.id ? { ...x, approved } : x));
    onChange();
    toast(approved ? "Comentario publicado." : "Comentario oculto.");
  };

  const remove = async (c: AdminComment) => {
    if (!confirm(`¿Borrar el comentario de ${c.name}? No se puede deshacer.`)) return;
    const { error } = await supabase.from("comments").delete().eq("id", c.id);
    if (error) return toast("No se ha podido borrar.", true);
    setComments(list => list.filter(x => x.id !== c.id));
    onChange();
    toast("Comentario borrado.");
  };

  const pendingCount = comments.filter(c => !c.approved).length;
  const visible = comments.filter(c => show === "all" || (show === "pending" ? !c.approved : c.approved));

  return <div style={{ paddingTop: 30, maxWidth: 860 }}>
    <p className="form-note" style={{ marginBottom: 20 }}>Los comentarios nuevos no salen en la web hasta que los publicas.</p>
    <div className="filter-row">
      {([["pending", `Por revisar (${pendingCount})`], ["approved", "Publicados"], ["all", "Todos"]] as const).map(([id, label]) => <button key={id} className="chip" aria-pressed={show === id} onClick={() => setShow(id)}>{label}</button>)}
    </div>
    {loading ? <p className="status-text">Cargando comentarios…</p>
      : visible.length === 0 ? <div className="empty-state"><strong>{show === "pending" ? "Nada por revisar." : "Sin comentarios."}</strong><p>{show === "pending" ? "Cuando alguien escriba, aparecerá aquí." : "No hay comentarios en este filtro."}</p></div>
        : <ul className="comment-list"><AnimatePresence initial={false}>{visible.map(c => <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}>
          <header><strong>{c.name}</strong><time dateTime={c.created_at}>{fmtComment.format(new Date(c.created_at)).toUpperCase()}</time></header>
          <p>{c.message}</p>
          <div className="filter-row" style={{ margin: "12px 0 0" }}>
            <span className="status-tag"><i style={{ background: c.approved ? STATUSES[1].color : STATUSES[0].color }} />{c.approved ? "Publicado" : "Por revisar"}</span>
            {c.approved
              ? <Button variant="outlineLuxury" onClick={() => setApproved(c, false)}><EyeOff /> Ocultar</Button>
              : <Button variant="luxury" onClick={() => setApproved(c, true)}><Eye /> Publicar</Button>}
            <button type="button" className="icon-button" aria-label={`Borrar el comentario de ${c.name}`} onClick={() => remove(c)}><Trash2 /></button>
          </div>
        </motion.li>)}</AnimatePresence></ul>}
  </div>;
}

/* ---------- Tareas ---------- */
type Task = { id: string; text: string; done: boolean; created_at: string };
function TasksTab() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  useEffect(() => {
    supabase.from("tasks").select("*").order("created_at", { ascending: true }).then(({ data, error }) => {
      if (error) toast("No se han podido cargar las tareas.", true); else setTasks(data as Task[]);
    });
  }, [toast]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim().slice(0, 300);
    if (!value) return;
    const { data, error } = await supabase.from("tasks").insert({ text: value }).select().single();
    if (error) return toast("No se ha podido añadir.", true);
    setTasks(list => [...list, data as Task]); setText("");
  };
  const toggle = async (t: Task) => {
    const { error } = await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    if (error) return toast("No se ha podido guardar.", true);
    setTasks(list => list.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
  };
  const remove = async (t: Task) => {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast("No se ha podido borrar.", true);
    setTasks(list => list.filter(x => x.id !== t.id));
  };

  return <div style={{ maxWidth: 860, paddingTop: 30 }}>
    <form className="inline-form" onSubmit={add}><input className="lux-input" value={text} onChange={e => setText(e.target.value)} placeholder="Nueva tarea…" aria-label="Nueva tarea" maxLength={300} /><Button type="submit" variant="luxury" disabled={!text.trim()}>Añadir <ArrowRight /></Button></form>
    {tasks.length === 0 ? <div className="empty-state"><strong>Todo hecho.</strong><p>No tienes tareas pendientes.</p></div>
      : <ul className="task-list" style={{ marginTop: 26 }}><AnimatePresence initial={false}>{tasks.map(t => <motion.li key={t.id} layout className={`task-item ${t.done ? "done" : ""}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
        <input type="checkbox" className="lux-check" checked={t.done} onChange={() => toggle(t)} aria-label={`Marcar "${t.text}"`} />
        <span className="task-text">{t.text}<motion.span className="task-strike" initial={false} animate={{ scaleX: t.done ? 1 : 0 }} transition={{ duration: .45 }} /></span>
        <button type="button" className="icon-button" aria-label={`Borrar "${t.text}"`} onClick={() => remove(t)}><X /></button>
      </motion.li>)}</AnimatePresence></ul>}
  </div>;
}

/* ---------- Recordatorios ---------- */
type Reminder = { id: string; day: string; text: string; created_at: string };
function RemindersTab() {
  const toast = useToast();
  const [items, setItems] = useState<Reminder[]>([]);
  const [day, setDay] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    supabase.from("reminders").select("*").order("day").order("created_at").then(({ data, error }) => {
      if (error) toast("No se han podido cargar los recordatorios.", true); else setItems(data as Reminder[]);
    });
  }, [toast]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!day || !text.trim()) return toast("Elige un día y escribe el recordatorio.", true);
    const { data, error } = await supabase.from("reminders").insert({ day, text: text.trim().slice(0, 300) }).select().single();
    if (error) return toast("No se ha podido añadir.", true);
    setItems(list => [...list, data as Reminder].sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at)));
    setText("");
  };
  const remove = async (r: Reminder) => {
    const { error } = await supabase.from("reminders").delete().eq("id", r.id);
    if (error) return toast("No se ha podido borrar.", true);
    setItems(list => list.filter(x => x.id !== r.id));
  };
  const groups = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    items.forEach(r => map.set(r.day, [...(map.get(r.day) ?? []), r]));
    return [...map.entries()];
  }, [items]);

  return <div style={{ paddingTop: 30 }}>
    <form className="inline-form" onSubmit={add} style={{ maxWidth: 860 }}>
      <input type="date" className="lux-input" style={{ flex: "0 0 180px" }} value={day} onChange={e => setDay(e.target.value)} aria-label="Día" />
      <input className="lux-input" value={text} onChange={e => setText(e.target.value)} placeholder="¿Qué tienes que recordar?" aria-label="Recordatorio" maxLength={300} />
      <Button type="submit" variant="luxury">Añadir <ArrowRight /></Button>
    </form>
    {groups.length === 0 ? <div className="empty-state"><strong>Nada que recordar.</strong><p>Añade tu primer recordatorio.</p></div>
      : <div style={{ marginTop: 26, borderTop: "1px solid var(--border)" }}>{groups.map(([d, list]) => <div className="day-group" key={d}>
        <h4>{capitalize(formatDay(d))}</h4>
        <ul className="admin-list"><AnimatePresence initial={false}>{list.map(r => <motion.li key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }}><span>{r.text}</span><button type="button" className="icon-button" aria-label={`Borrar "${r.text}"`} onClick={() => remove(r)}><X /></button></motion.li>)}</AnimatePresence></ul>
      </div>)}</div>}
  </div>;
}

/* ---------- Horario y días sin citas ---------- */
type Range = { id: number; weekday: number; start_time: string; end_time: string };
type Blocked = { day: string; reason: string | null };
const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const hhmm = (t: string) => t.slice(0, 5);

function ScheduleTab() {
  const toast = useToast();
  const [ranges, setRanges] = useState<Range[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [blockDay, setBlockDay] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    supabase.from("availability").select("*").order("weekday").order("start_time").then(({ data, error }) => {
      if (error) toast("No se ha podido cargar el horario.", true); else setRanges(data as Range[]);
    });
    supabase.from("blocked_days").select("*").order("day").then(({ data, error }) => {
      if (!error) setBlocked(data as Blocked[]);
    });
  }, [toast]);

  const addRange = async (weekday: number, start: string, end: string) => {
    if (!start || !end || end <= start) return toast("La hora de fin tiene que ser posterior a la de inicio.", true);
    const { data, error } = await supabase.from("availability").insert({ weekday, start_time: start, end_time: end }).select().single();
    if (error) return toast("No se ha podido añadir la franja.", true);
    setRanges(list => [...list, data as Range].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)));
    toast("Franja añadida.");
  };
  const removeRange = async (r: Range) => {
    const { error } = await supabase.from("availability").delete().eq("id", r.id);
    if (error) return toast("No se ha podido borrar.", true);
    setRanges(list => list.filter(x => x.id !== r.id));
  };
  const addBlocked = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!blockDay) return toast("Elige un día.", true);
    const row = { day: blockDay, reason: reason.trim() || null };
    const { error } = await supabase.from("blocked_days").upsert(row);
    if (error) return toast("No se ha podido guardar.", true);
    setBlocked(list => [...list.filter(b => b.day !== blockDay), row].sort((a, b) => a.day.localeCompare(b.day)));
    setBlockDay(""); setReason("");
    toast("Día bloqueado.");
  };
  const removeBlocked = async (b: Blocked) => {
    const { error } = await supabase.from("blocked_days").delete().eq("day", b.day);
    if (error) return toast("No se ha podido borrar.", true);
    setBlocked(list => list.filter(x => x.day !== b.day));
  };

  return <div style={{ paddingTop: 30 }}>
    <span className="eyebrow">FRANJAS EN LAS QUE SE PUEDE RESERVAR · HORA DE CANARIAS</span>
    <div className="week-grid" style={{ marginTop: 18 }}>{WEEKDAYS.map((name, i) => {
      const weekday = i + 1;
      const mine = ranges.filter(r => r.weekday === weekday);
      return <div key={name} className={`week-row ${mine.length ? "" : "off"}`}>
        <strong>{name}</strong>
        <div className="range-list">
          {mine.length === 0 && <span className="status-text" style={{ margin: 0 }}>Sin citas</span>}
          {mine.map(r => <span className="range-pill" key={r.id}>{hhmm(r.start_time)} – {hhmm(r.end_time)}<button type="button" className="icon-button" aria-label={`Quitar franja de ${name} ${hhmm(r.start_time)}`} onClick={() => removeRange(r)}><X /></button></span>)}
          <RangeForm onAdd={(s, e) => addRange(weekday, s, e)} label={name} />
        </div>
      </div>;
    })}</div>

    <div className="section-heading" style={{ margin: "70px 0 30px" }}><span className="eyebrow">DÍAS SIN CITAS</span><span className="section-rule" /></div>
    <form className="inline-form" onSubmit={addBlocked} style={{ maxWidth: 860 }}>
      <input type="date" className="lux-input" style={{ flex: "0 0 180px" }} value={blockDay} onChange={e => setBlockDay(e.target.value)} aria-label="Día sin citas" />
      <input className="lux-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo" maxLength={120} />
      <Button type="submit" variant="luxury">Bloquear <ArrowRight /></Button>
    </form>
    {blocked.length === 0 ? <p className="status-text">No hay días bloqueados.</p>
      : <ul className="admin-list" style={{ marginTop: 20, maxWidth: 860 }}><AnimatePresence initial={false}>{blocked.map(b => <motion.li key={b.day} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }}>
        <span><strong style={{ fontWeight: 500 }}>{capitalize(formatDay(b.day))}</strong>{b.reason && <span style={{ color: "var(--muted-foreground)" }}> — {b.reason}</span>}</span>
        <button type="button" className="icon-button" aria-label={`Desbloquear ${b.day}`} onClick={() => removeBlocked(b)}><X /></button>
      </motion.li>)}</AnimatePresence></ul>}
  </div>;
}

function RangeForm({ onAdd, label }: { onAdd: (start: string, end: string) => void; label: string }) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("14:00");
  return <form className="range-form" onSubmit={e => { e.preventDefault(); onAdd(start, end); }}>
    <input type="time" value={start} step={1800} onChange={e => setStart(e.target.value)} aria-label={`Inicio ${label}`} />
    <input type="time" value={end} step={1800} onChange={e => setEnd(e.target.value)} aria-label={`Fin ${label}`} />
    <Button type="submit" variant="outlineLuxury">Añadir</Button>
  </form>;
}
