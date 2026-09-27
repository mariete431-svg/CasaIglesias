import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CalendarDays, FileText, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp, EditorialMarquee, Entrance, HeroDepth, HeroTitle, introPending, Magnetic, ProfileParallax, ProjectPreview, Reveal, Stamp, Tilt } from "@/components/EditorialEffects";
import { usePageTitle } from "@/components/SiteChrome";
import { Testimonials } from "@/components/Testimonials";
import { asset, loadSupabase } from "@/lib/asset";
import { capitalize, dayKey } from "@/lib/appointments";

// El calendario de reservas solo se descarga al abrir su desplegable
const Booking = lazy(() => import("@/components/Booking").then(m => ({ default: m.Booking })));

export const CV_PDF = asset("cv%202025.pdf");

const experience = [
  { year: "2025", role: "Inside LVMH Certificate", place: "Curso online", detail: "Operations & Supply Chain, Retail & Client Experience." },
  { year: "Mar 2024 — Dic 2025", role: "Ayudante de cocina", place: "Restaurante Marietta · Gourmetland, Adeje", detail: "Preparación, orden y ritmo de servicio; trabajo bajo presión y en equipo sin perder el detalle." },
  { year: "Mar 2023 — Oct 2023", role: "Atención al cliente", place: "Perfumerías Primor · Goya, Madrid", detail: "Cobros, pedidos y resolución de incidencias con clientes." },
  { year: "Mar 2022 — Ene 2023", role: "Operario de restaurante", place: "Burger King · Collado Villalba", detail: "Servicio rápido, trabajo en equipo y atención al público." },
  { year: "2019", role: "Ayudante de limpieza", place: "Sersinor · Collado Villalba", detail: "Constancia y responsabilidad." },
  { year: "2018 — 2021", role: "Auxiliar en fiestas infantiles", place: "Primer trabajo", detail: "Trato con familias y organización." },
  { year: "2015 — 2019", role: "Graduado en ESO", place: "IES María Guerrero · Collado Villalba", detail: "Educación secundaria obligatoria." },
];
const projects = [
  { name: "Web personal", description: "Diseñada y programada por mí.", to: "#inicio" },
  { name: "Lista de tareas", description: "Organización sencilla para el día a día.", to: "/tareas" },
  { name: "Panel personal", description: "Un espacio para tenerlo todo en orden.", to: "/panel" },
  { name: "Creador de CV", description: "Una herramienta para presentar tu experiencia.", to: "/crear-cv" },
  { name: "Edición de vídeo", description: "En proceso.", to: "" },
];

/* ---------- Lo principal: dos desplegables (reservar reunión y crear CV) ---------- */
const shortDay = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
type Panel = "reservar" | "cv" | null;

function StartHere() {
  const [open, setOpen] = useState<Panel>(null);
  const [days, setDays] = useState<string[] | null>(null);

  useEffect(() => {
    const now = new Date();
    const to = dayKey(new Date(now.getTime() + 45 * 86_400_000));
    let active = true;
    loadSupabase()
      .then(({ bookingClient }) => bookingClient.rpc("get_available_days", { p_from: dayKey(now), p_to: to }))
      .then(({ data, error }) => { if (active) setDays(!error && Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => { if (active) setDays([]); });
    return () => { active = false; };
  }, []);

  // Cualquier enlace a #reservar (cabecera, botones, otras páginas) abre el calendario
  useEffect(() => {
    const openIfBooking = () => { if (window.location.hash === "#reservar") setOpen("reservar"); };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href$='#reservar']");
      if (!link) return;
      setOpen("reservar");
      // Bajar siempre hasta el calendario, aunque la dirección ya terminara en #reservar
      window.setTimeout(() => document.getElementById("reservar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };
    openIfBooking();
    window.addEventListener("hashchange", openIfBooking);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("hashchange", openIfBooking); document.removeEventListener("click", onClick); };
  }, []);

  const toggle = (panel: Exclude<Panel, null>) => setOpen(current => current === panel ? null : panel);
  const nextDays = days === null ? "Consultando disponibilidad…"
    : days.length ? `Próximos huecos: ${days.map(d => capitalize(shortDay.format(new Date(`${d}T12:00:00Z`)).replace(".", ""))).join(" · ")}`
      : "Consulta el calendario";

  return <section id="servicios" className="start-section"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">01 / EMPIEZA AQUÍ</span><span className="section-rule" /></div></Reveal>
    <div className="start-list">
      <Reveal><div id="reservar" className={`start-item ${open === "reservar" ? "is-open" : ""}`}>
        <button type="button" className="start-toggle" aria-expanded={open === "reservar"} aria-controls="start-reservar" onClick={() => toggle("reservar")} data-cursor={open === "reservar" ? "Cerrar" : "Abrir"}>
          <span className="start-icon"><CalendarDays strokeWidth={1.2} /></span>
          <span className="start-text"><strong>Reservar una <em>reunión</em></strong><small>30 minutos · teléfono o videollamada · {nextDays}</small></span>
          <span className="start-plus" aria-hidden="true"><Plus /></span>
        </button>
        <motion.div id="start-reservar" className="start-panel" initial={false} animate={{ height: open === "reservar" ? "auto" : 0, opacity: open === "reservar" ? 1 : 0 }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}>
          {open === "reservar" && <div className="start-panel-inner"><Suspense fallback={<p className="status-text">Abriendo el calendario…</p>}><Booking compact /></Suspense></div>}
        </motion.div>
      </div></Reveal>

      <Reveal delay={.06}><div className={`start-item ${open === "cv" ? "is-open" : ""}`}>
        <button type="button" className="start-toggle" aria-expanded={open === "cv"} aria-controls="start-cv" onClick={() => toggle("cv")} data-cursor={open === "cv" ? "Cerrar" : "Abrir"}>
          <span className="start-icon"><FileText strokeWidth={1.2} /></span>
          <span className="start-text"><strong>Crea tu <em>currículum</em></strong><small>Herramienta gratuita · en directo · guárdalo en PDF</small></span>
          <span className="start-plus" aria-hidden="true"><Plus /></span>
        </button>
        <motion.div id="start-cv" className="start-panel" initial={false} animate={{ height: open === "cv" ? "auto" : 0, opacity: open === "cv" ? 1 : 0 }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}>
          <div className="start-panel-inner start-cv">
            <div className="feature-paper" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <div>
              <p>Rellena tus datos y míralo tomar forma en directo. Cuando esté listo, guárdalo en PDF. Sin registrarte y sin enviar nada a ningún sitio.</p>
              <div className="hero-actions">
                <Button variant="luxury" size="lg" asChild><Link to="/crear-cv" data-cursor="Crear">Empezar mi CV <ArrowUpRight /></Link></Button>
                <Button variant="outlineLuxury" size="lg" asChild><Link to="/cv">Ver el CV de Mario <ArrowUpRight /></Link></Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div></Reveal>
    </div>
  </div></section>;
}

export default function Home() {
  usePageTitle("Mario Iglesias — Atención al cliente y desarrollo web");
  const [openExperience, setOpenExperience] = useState<number | null>(null);
  // Mientras está la foto de entrada, el titular espera para escribirse cuando la foto se va
  const [heroReady, setHeroReady] = useState(() => !introPending());
  const show = heroReady ? { opacity: 1, y: 0 } : undefined;
  return <>
    <Entrance onReveal={() => setHeroReady(true)} />
    <main id="inicio">
      <section className="hero section-wrap" aria-labelledby="hero-title">
        <HeroDepth className="hero-content"><Reveal immediate><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> ADEJE, TENERIFE — 2026 <span className="status-pill"><i aria-hidden="true" />Disponible</span></p></Reveal>
          <HeroTitle play={heroReady} delay={.35} />
          <motion.p className="hero-subtitle" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .75, duration: .8 }}>Atención al cliente, organización y desarrollo web.<br className="desktop-break" /> Detalle, discreción y trabajo bien hecho.</motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .9, duration: .8 }}><Magnetic><Button variant="luxury" size="lg" asChild><a href="#reservar" data-cursor="Reservar">Reservar una reunión <ArrowUpRight /></a></Button></Magnetic><Magnetic><Button variant="outlineLuxury" size="lg" asChild><Link to="/crear-cv" data-cursor="Crear">Crear mi CV gratis <ArrowUpRight /></Link></Button></Magnetic></motion.div>
        </HeroDepth>
        <div className="hero-stamp"><Stamp show={heroReady} /></div>
        <div className="hero-bottom"><span>MARIO IGLESIAS · 2026</span><a href="#servicios" aria-label="Bajar a los servicios">DESLIZA PARA DESCUBRIR <ArrowDown size={15} strokeWidth={1.5} /></a></div>
      </section>

      <StartHere />


      <section id="perfil" className="profile-section section-pad"><div className="section-wrap">
        <Reveal><div className="section-heading"><span className="eyebrow">02 / PERFIL</span><span className="section-rule" /></div></Reveal>
        <div className="profile-grid"><div className="profile-quote"><ProfileParallax direction={-1}><Reveal><h2>El valor de<br /><em>hacerlo bien.</em></h2><blockquote>“Un profesional trabajador, con ganas de aprender y facilidad para trabajar en equipo.”</blockquote></Reveal></ProfileParallax></div>
          <div className="profile-details"><Reveal><p>He trabajado en cocina, perfumería y restauración. De cada experiencia he aprendido algo fundamental: las cosas bien hechas se notan en los detalles.</p><p>Hoy llevo esa misma atención, curiosidad y compromiso al mundo de la web. Me interesa crear, aprender y aportar valor donde pueda marcar la diferencia.</p></Reveal>
            <ProfileParallax><Reveal><Tilt max={8}><div className="portrait"><motion.img src={asset("foto.jpg")} alt="Retrato de Mario Iglesias Martínez" loading="lazy" initial={{ scale: 1.14 }} whileInView={{ scale: 1.03 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: [.2, .7, .2, 1] }} /></div></Tilt></Reveal></ProfileParallax>
          </div></div>
        <Reveal><div className="facts"><div><span>BASE</span><strong>Adeje, Tenerife</strong></div><div><span>DISPONIBILIDAD</span><strong>Total, España</strong></div><div><span>IDIOMAS</span><strong>Español nativo, Inglés medio</strong></div></div></Reveal>
        <Reveal><div className="metrics" aria-label="Resumen de experiencia"><div><strong><CountUp to={7} /></strong><span>ETAPAS DE FORMACIÓN Y TRABAJO</span></div><div><strong><CountUp to={3} /></strong><span>ÁMBITOS DE EXPERIENCIA</span></div><div><strong><CountUp to={2} /></strong><span>IDIOMAS</span></div></div></Reveal>
      </div></section>

      <section id="trayectoria" className="career-section section-pad"><div className="section-wrap">
        <Reveal><div className="section-heading"><span className="eyebrow">03 / TRAYECTORIA</span><span className="section-rule" /></div><div className="intro-row"><h2>Un camino de<br /><em>aprendizaje.</em></h2><p>Cada etapa deja una forma distinta de mirar el trabajo. Todas suman.</p></div></Reveal>
        <div className="career-list"><motion.span className="career-timeline" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: .1 }} transition={{ duration: 1.8, ease: [.2, .7, .2, 1] }} />{experience.map((entry, i) => <Reveal key={entry.role + entry.year}><motion.div className={`career-item ${openExperience === i ? "is-open" : ""}`} initial={{ opacity: .48 }} whileInView={{ opacity: 1 }} viewport={{ amount: .55 }} transition={{ duration: .45 }}><Button variant="text" className="career-toggle" aria-expanded={openExperience === i} onClick={() => setOpenExperience(openExperience === i ? null : i)}><span className="career-year">{entry.year}</span><span className="career-main"><strong>{entry.role}</strong><small>{entry.place}</small></span><span className="career-icon">{openExperience === i ? <Minus /> : <Plus />}</span></Button><motion.div initial={false} animate={{ height: openExperience === i ? "auto" : 0, opacity: openExperience === i ? 1 : 0 }} transition={{ duration: .48, ease: [.22, 1, .36, 1] }} className="career-detail"><p>{entry.detail}</p></motion.div></motion.div></Reveal>)}</div>
        <Reveal><div className="hero-actions"><Button variant="outlineLuxury" size="lg" asChild><Link to="/cv">CV completo <ArrowUpRight /></Link></Button><Button variant="outlineLuxury" size="lg" asChild><a href={CV_PDF} target="_blank" rel="noopener noreferrer">Descargar CV (PDF) <ArrowUpRight /></a></Button></div></Reveal>
      </div></section>

      <EditorialMarquee />

      <section className="skills-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">04 / COMPETENCIAS</span><span className="section-rule" /></div><h2>Lo que puedo <em>aportar.</em></h2></Reveal><div className="skills-grid">{[
        ["01", "Atención al cliente", "Trato cercano, resolución de incidencias, cobros y pedidos."],
        ["02", "Organización", "Trabajo bajo presión, orden y trabajo en equipo."],
        ["03", "Web", "HTML, CSS, JavaScript, Git y GitHub — en aprendizaje continuo."],
      ].map(([number, title, description]) => <Reveal key={title}><Tilt max={4}><article className="skill"><span className="eyebrow">{number}</span><h3>{title}</h3><p>{description}</p></article></Tilt></Reveal>)}</div></div></section>

      <section id="proyectos" className="projects-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">05 / PROYECTOS</span><span className="section-rule" /></div><div className="intro-row"><h2>Ideas hechas<br /><em>realidad.</em></h2><p>Una selección de trabajos y proyectos personales.</p></div></Reveal><div className="project-list">{projects.map((project, i) => {
        const inner = <><span className="project-number">0{i + 1}</span><strong>{project.name}</strong><span className="project-description">{project.description}</span></>;
        return <Reveal key={project.name}><ProjectPreview name={project.name}>{!project.to
          ? <div className="project-row project-inactive">{inner}<span className="project-dash">—</span></div>
          : project.to.startsWith("#")
            ? <a className="project-row" href={project.to}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></a>
            : <Link className="project-row" to={project.to}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></Link>}
        </ProjectPreview></Reveal>;
      })}</div></div></section>


      <Testimonials label="06 / OPINIONES" />

      <section id="contacto" className="contact-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">07 / CONTACTO</span><span className="section-rule" /></div><p className="contact-lead">PARA TODO LO DEMÁS</p><h2>Hablemos<span>.</span></h2><a className="contact-email" href="mailto:mariete431@icloud.com">mariete431@icloud.com <ArrowUpRight strokeWidth={1.2} /></a><div className="contact-links"><a href="https://www.instagram.com/Whsmario/" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={16} /></a><a href="#reservar">Reservar una reunión <ArrowUpRight size={16} /></a></div></Reveal></div></section>
    </main>
  </>;
}
