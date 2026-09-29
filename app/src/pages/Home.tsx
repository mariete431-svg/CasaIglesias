import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorialMarquee, Entrance, HeroDepth, HeroTitle, introPending, Magnetic, ProfileParallax, ProjectPreview, Reveal, Stamp, Tilt } from "@/components/EditorialEffects";
import { usePageTitle } from "@/components/SiteChrome";
import { Testimonials } from "@/components/Testimonials";
import { asset, loadSupabase } from "@/lib/asset";
import { capitalize, dayKey } from "@/lib/appointments";

// El calendario de reservas solo se descarga al abrir su desplegable
const Booking = lazy(() => import("@/components/Booking").then(m => ({ default: m.Booking })));

export const CV_PDF = asset("cv-mario-iglesias.pdf");

const projects = [
  { name: "ZONA 4", description: "Web para un gimnasio (proyecto de práctica).", to: "https://mariete431-svg.github.io/zona4/" },
  { name: "Casa Iglesias", description: "La marca y la web de mi propio estudio.", to: "#inicio" },
];

/* ---------- Servicios y precios de Casa Iglesias ---------- */
const packages = [
  { name: "Esencial", price: 390, time: "1–2 semanas", items: ["Web de una página, adaptada al móvil", "Botón de WhatsApp y formulario de contacto", "Preparada para salir bien en Google", "Ficha de Google Business configurada"] },
  { name: "Negocio", price: 790, time: "3 semanas", items: ["Hasta 5 páginas: inicio, servicios, sobre nosotros, galería o blog y contacto", "Ayuda con los textos", "Preparada para salir bien en Google", "2 rondas de cambios"] },
  { name: "Reservas", price: 1290, time: "4 semanas", tag: "Mi especialidad", items: ["Todo lo del paquete Negocio", "Reservas de citas online con calendario", "Aviso por email en cada reserva", "2 rondas de cambios"] },
];
const brandPackages = [
  { name: "Marca Básica", price: 190, time: "1–2 semanas", items: ["Logo principal + versión icono", "Colores y letras de la marca", "Archivos listos para usar (PNG y SVG)", "Guía de marca de 1 página", "2 rondas de cambios"] },
  { name: "Marca Completa", price: 390, time: "2–3 semanas", items: ["Todo lo de Marca Básica", "4 versiones del logo", "Guía de marca completa", "Tarjeta de visita lista para imprimir", "Foto de perfil y 3 plantillas para redes"] },
  { name: "Pack Marca + Web", price: 990, time: "4–5 semanas", tag: "Ahorra 190 €", items: ["Marca Completa + Web Negocio", "Primero la marca y después la web con esa marca", "Por separado costaría 1.180 €", "2 rondas de cambios en cada parte"] },
];
const extras = [["Página adicional", 90], ["Versión en inglés", 190], ["Ficha de Google Business", 60]] as const;
// Miles con punto también en 4 cifras (1.290 €), como en el panel y los presupuestos
const euros = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

type Pack = { name: string; price: number; time: string; tag?: string; items: string[] };
function PriceCard({ pack, delay }: { pack: Pack; delay: number }) {
  return <Reveal delay={delay}><article className={`price-card ${pack.tag ? "is-featured" : ""}`}>
    {pack.tag && <span className="price-tag">{pack.tag}</span>}
    <span className="eyebrow">{pack.name.toUpperCase()}</span>
    <p className="price-amount">{euros(pack.price)}<small> + IGIC</small></p>
    <p className="price-time">Entrega en {pack.time}</p>
    <ul>{pack.items.map(item => <li key={item}>{item}</li>)}</ul>
    <Button variant={pack.tag ? "luxury" : "outlineLuxury"} size="lg" asChild><a href="#reservar" data-cursor="Reservar">Pedir presupuesto <ArrowUpRight /></a></Button>
  </article></Reveal>;
}

function Pricing() {
  return <section id="precios" className="pricing-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">02 / SERVICIOS Y PRECIOS</span><span className="section-rule" /></div>
      <div className="intro-row"><h2>Webs y marca para<br /><em>negocios.</em></h2><p>Precios cerrados y sin sorpresas. Pagas la mitad al empezar y la otra mitad cuando tu web está lista.</p></div></Reveal>
    <div className="pricing-grid">{packages.map((pack, i) => <PriceCard key={pack.name} pack={pack} delay={i * .06} />)}</div>
    <Reveal><div className="pricing-subhead"><h3>Identidad <em>visual.</em></h3><p>Para negocios que empiezan o que todavía no tienen marca: logo, colores y todo lo necesario para verse profesionales desde el primer día.</p></div></Reveal>
    <div className="pricing-grid">{brandPackages.map((pack, i) => <PriceCard key={pack.name} pack={pack} delay={i * .06} />)}</div>
    <Reveal><div className="pricing-more">
      <div><span className="eyebrow">MANTENIMIENTO</span><p><strong>29 € al mes.</strong> Alojamiento de la web, copias de seguridad y hasta 30 minutos de cambios al mes.</p></div>
      <div><span className="eyebrow">EXTRAS</span><p>{extras.map(([name, price]) => <span key={name}>{name} · <strong>{euros(price)}</strong></span>)}</p></div>
      <div><span className="eyebrow">LANZAMIENTO</span><p><strong>-30 % a mis 3 primeros clientes</strong>, a cambio de una opinión y permiso para enseñar su trabajo.</p></div>
    </div></Reveal>
  </div></section>;
}

/* ---------- Lo principal: el desplegable para reservar una reunión ---------- */
const shortDay = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
type Panel = "reservar" | null;

function StartHere() {
  const [open, setOpen] = useState<Panel>(null);
  const [days, setDays] = useState<string[] | null>(null);

  // Los próximos huecos se piden cuando la página ya ha cargado, para no retrasar la portada
  useEffect(() => {
    let active = true;
    const load = () => {
      const now = new Date();
      const to = dayKey(new Date(now.getTime() + 45 * 86_400_000));
      loadSupabase()
        .then(({ bookingClient }) => bookingClient.rpc("get_available_days", { p_from: dayKey(now), p_to: to }))
        .then(({ data, error }) => { if (active) setDays(!error && Array.isArray(data) ? data.slice(0, 3) : []); })
        .catch(() => { if (active) setDays([]); });
    };
    // Safari antiguo no tiene requestIdleCallback: allí se espera un momento fijo
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(load, { timeout: 3000 }) : window.setTimeout(load, 1500);
    return () => {
      active = false;
      if (hasIdle) window.cancelIdleCallback(idle); else window.clearTimeout(idle);
    };
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
    <h2 className="sr-only">Empieza aquí: reserva una reunión</h2>
    <div className="start-list">
      <Reveal><div id="reservar" className={`start-item ${open === "reservar" ? "is-open" : ""}`}>
        <button type="button" className="start-toggle" aria-expanded={open === "reservar"} aria-controls="start-reservar" onClick={() => toggle("reservar")} data-cursor={open === "reservar" ? "Cerrar" : "Abrir"}>
          <span className="start-icon"><CalendarDays strokeWidth={1.2} /></span>
          <span className="start-text"><strong>Reservar una <em>reunión</em></strong><small>30 minutos · teléfono o videollamada · {nextDays}</small></span>
          <span className="start-plus" aria-hidden="true"><Plus /></span>
        </button>
        <motion.div id="start-reservar" className="start-panel" inert={open !== "reservar"} initial={false} animate={{ height: open === "reservar" ? "auto" : 0, opacity: open === "reservar" ? 1 : 0 }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}>
          {open === "reservar" && <div className="start-panel-inner"><Suspense fallback={<p className="status-text">Abriendo el calendario…</p>}><Booking compact /></Suspense></div>}
        </motion.div>
      </div></Reveal>

    </div>
  </div></section>;
}

export default function Home() {
  usePageTitle("Casa Iglesias — Estudio de diseño y desarrollo web");
  // Mientras está la foto de entrada, el titular espera para escribirse cuando la foto se va
  const [heroReady, setHeroReady] = useState(() => !introPending());
  const show = heroReady ? { opacity: 1, y: 0 } : undefined;
  return <>
    <Entrance onReveal={() => setHeroReady(true)} />
    <main id="inicio">
      <section className="hero section-wrap" aria-labelledby="hero-title">
        <HeroDepth className="hero-content"><Reveal immediate><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> ESTUDIO DE DISEÑO Y DESARROLLO WEB · TENERIFE <span className="status-pill"><i aria-hidden="true" />Disponible</span></p></Reveal>
          <HeroTitle lines={["Casa", "Iglesias."]} play={heroReady} delay={.35} />
          <motion.p className="hero-subtitle" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .75, duration: .8 }}>Webs e identidad visual para negocios, por Mario Iglesias.<br className="desktop-break" /> Detalle, discreción y trabajo bien hecho.</motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .9, duration: .8 }}><Magnetic><Button variant="luxury" size="lg" asChild><a href="#reservar" data-cursor="Reservar">Reservar una reunión <ArrowUpRight /></a></Button></Magnetic><Magnetic><Button variant="outlineLuxury" size="lg" asChild><a href="#precios" data-cursor="Ver">Ver precios <ArrowUpRight /></a></Button></Magnetic></motion.div>
        </HeroDepth>
        <div className="hero-stamp"><Stamp show={heroReady} /></div>
        <div className="hero-bottom"><span>CASA IGLESIAS · POR MARIO IGLESIAS</span><a href="#servicios" aria-label="Bajar a los servicios">DESLIZA PARA DESCUBRIR <ArrowDown size={15} strokeWidth={1.5} /></a></div>
      </section>

      <StartHere />

      <Pricing />


      <section id="estudio" className="profile-section section-pad"><div className="section-wrap">
        <Reveal><div className="section-heading"><span className="eyebrow">03 / EL ESTUDIO</span><span className="section-rule" /></div></Reveal>
        <div className="profile-grid"><div className="profile-quote"><ProfileParallax direction={-1}><Reveal><h2>Quién hay<br /><em>detrás.</em></h2><blockquote>“Webs claras, cuidadas y hechas para que tu negocio reciba más clientes.”</blockquote></Reveal></ProfileParallax></div>
          <div className="profile-details"><Reveal><p>Soy Mario Iglesias y Casa Iglesias es mi estudio. Diseño y hago webs para negocios, sobre todo del sur de Tenerife.</p><p>Trabajo con pocos clientes a la vez para cuidar cada detalle. Hablas siempre conmigo, de principio a fin, y te explico cada paso sin tecnicismos.</p></Reveal>
            <ProfileParallax><Reveal><Tilt max={8}><div className="portrait"><motion.img src={asset("foto.jpg")} alt="Retrato de Mario Iglesias, de Casa Iglesias" loading="lazy" initial={{ scale: 1.14 }} whileInView={{ scale: 1.03 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: [.2, .7, .2, 1] }} /></div></Tilt></Reveal></ProfileParallax>
          </div></div>
        <Reveal><div className="facts"><div><span>BASE</span><strong>Adeje, Tenerife</strong></div><div><span>TRABAJO</span><strong>Tenerife y online en toda España</strong></div><div><span>IDIOMAS</span><strong>Español nativo, inglés medio</strong></div></div></Reveal>
      </div></section>

      <EditorialMarquee />

      <section id="proyectos" className="projects-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">04 / PROYECTOS</span><span className="section-rule" /></div><div className="intro-row"><h2>Ideas hechas<br /><em>realidad.</em></h2><p>Trabajos hechos de principio a fin: diseño, marca y web.</p></div></Reveal><div className="project-list">{projects.map((project, i) => {
        const inner = <><span className="project-number">0{i + 1}</span><strong>{project.name}</strong><span className="project-description">{project.description}</span></>;
        return <Reveal key={project.name}><ProjectPreview name={project.name}>{!project.to
          ? <div className="project-row project-inactive">{inner}<span className="project-dash">—</span></div>
          : project.to.startsWith("http")
            ? <a className="project-row" href={project.to} target="_blank" rel="noopener noreferrer" aria-label={`${project.name}: ${project.description} (se abre en otra pestaña)`}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></a>
          : project.to.startsWith("#")
            ? <a className="project-row" href={project.to}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></a>
            : <Link className="project-row" to={project.to}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></Link>}
        </ProjectPreview></Reveal>;
      })}</div></div></section>


      <Testimonials label="05 / OPINIONES" />

      <section id="contacto" className="contact-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">06 / CONTACTO</span><span className="section-rule" /></div><p className="contact-lead">PARA TODO LO DEMÁS</p><h2>Hablemos<span>.</span></h2><a className="contact-email" href="mailto:mariete431@icloud.com">mariete431@icloud.com <ArrowUpRight strokeWidth={1.2} /></a><div className="contact-links"><a href="https://www.instagram.com/casaiglesias.studio/" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={16} /></a><a href="#reservar">Reservar una reunión <ArrowUpRight size={16} /></a></div></Reveal></div></section>
    </main>
  </>;
}
