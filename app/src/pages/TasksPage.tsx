import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { newId, onTabListKeyDown, readStored, writeStored } from "@/lib/utils";

// Misma clave y formato que la lista antigua, para no perder las tareas guardadas
const STORAGE_KEY = "mario-tareas";
type Task = { id: string; text: string; completed: boolean };
type Filter = "all" | "pending" | "done";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" }, { id: "pending", label: "Pendientes" }, { id: "done", label: "Hechas" },
];

function loadTasks(): Task[] {
  const saved = readStored<Task[]>(STORAGE_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

export default function TasksPage() {
  usePageTitle("Lista de tareas — Casa Iglesias");
  const reduced = useMotionPreference();
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => { writeStored(STORAGE_KEY, tasks); }, [tasks]);

  const pending = tasks.filter(t => !t.completed).length;
  const visible = useMemo(() => tasks.filter(t => filter === "all" || (filter === "done" ? t.completed : !t.completed)), [tasks, filter]);

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim().slice(0, 200);
    if (!value) return;
    setTasks(list => [...list, { id: newId(), text: value, completed: false }]);
    setText("");
  };

  return <main>
    <PageHero
      eyebrow="PROYECTO 02 — JAVASCRIPT"
      lines={["Mi lista", "de tareas."]}
      subtitle="Añade tareas, márcalas como hechas y bórralas cuando ya no las necesites. Todo se guarda en este navegador."
      bottomHref="#lista"
    />

    <section id="lista" className="section-pad"><div className="section-wrap">
      <SectionHeading label="01 / HOY" />
      <Reveal><div className="lux-panel lux-panel-pad tasks-panel">
        <form className="inline-form" onSubmit={add}>
          <label htmlFor="task-input" className="sr-only">Nueva tarea</label>
          <input id="task-input" className="lux-input" value={text} onChange={e => setText(e.target.value)} placeholder="Escribe una tarea nueva…" autoComplete="off" maxLength={200} />
          <Button type="submit" variant="luxury" disabled={!text.trim()} data-cursor="Añadir">Añadir <ArrowRight /></Button>
        </form>

        <div className="tasks-head">
          <p className="tasks-count" aria-live="polite"><strong>{pending}</strong>{pending === 1 ? "pendiente" : "pendientes"} de {tasks.length}</p>
          <LayoutGroup id="task-filters"><div className="tab-bar" role="tablist" aria-label="Filtrar tareas" style={{ borderBottom: 0 }} onKeyDown={onTabListKeyDown}>
            {filters.map(f => <button key={f.id} id={`filtro-${f.id}`} role="tab" aria-selected={filter === f.id} aria-controls="lista-tareas" tabIndex={filter === f.id ? 0 : -1} onClick={() => setFilter(f.id)}>{f.label}{filter === f.id && <motion.span layoutId="task-filter" className="tab-indicator" transition={{ type: "spring", stiffness: 400, damping: 36 }} />}</button>)}
          </div></LayoutGroup>
        </div>

        <div id="lista-tareas" role="tabpanel" aria-labelledby={`filtro-${filter}`}>
        {visible.length === 0
          ? <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><strong>{tasks.length ? "Nada por aquí." : "Todo en orden."}</strong><p>{tasks.length ? "No hay tareas en este filtro." : "Todavía no hay tareas. Empieza por la primera."}</p></motion.div>
          : <ul className="task-list">
            <AnimatePresence initial={false}>{visible.map(task => <motion.li key={task.id} layout={!reduced} className={`task-item ${task.completed ? "done" : ""}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, transition: { duration: .3 } }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
              <input type="checkbox" className="lux-check" checked={task.completed} aria-label={`Marcar "${task.text}" como ${task.completed ? "pendiente" : "hecha"}`} onChange={() => setTasks(list => list.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))} />
              <span className="task-text">{task.text}<motion.span className="task-strike" initial={false} animate={{ scaleX: task.completed ? 1 : 0 }} transition={{ duration: .45, ease: [.22, 1, .36, 1] }} /></span>
              <button type="button" className="icon-button" aria-label={`Borrar "${task.text}"`} onClick={() => setTasks(list => list.filter(t => t.id !== task.id))}><X /></button>
            </motion.li>)}</AnimatePresence>
          </ul>}
        </div>

        {tasks.some(t => t.completed) && <div className="tasks-foot"><Button variant="text" onClick={() => setTasks(list => list.filter(t => !t.completed))}>Borrar hechas <X /></Button></div>}
      </div></Reveal>
    </div></section>
  </main>;
}
