import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { EditorialMarquee, Entrance, HeroDepth, introPending, Magnetic, ProfileParallax, ProjectPreview, Reveal, Stamp, Tilt, TypeTitle } from "@/components/EditorialEffects";
import { Contact, CvMagnet, Faq, HeroBackdrop, InstagramFeed, Newsletter, Process } from "@/components/HomeSections";
import { usePageTitle } from "@/components/SiteChrome";
import { Testimonials } from "@/components/Testimonials";
import { asset, loadSupabase } from "@/lib/asset";
import { capitalize, dayKey } from "@/lib/appointments";
import { LOCALES, useLang, useLocalize, useT } from "@/i18n";

// El calendario de reservas solo se descarga al abrir su desplegable
const Booking = lazy(() => import("@/components/Booking").then(m => ({ default: m.Booking })));

export const CV_PDF = asset("cv-mario-iglesias.pdf");

// Tipos para los filtros: así cada cliente encuentra rápido lo que necesita
type Kind = "web" | "reservas" | "marca";
const KIND_FILTERS = [["todo", "all"], ["web", "web"], ["reservas", "bookings"], ["marca", "brand"]] as const;
const projects: { name: string; key: "obra" | "garaje" | "zona" | "casa"; to: string; kinds: Kind[] }[] = [
  { name: "Obra Clara", key: "obra", to: "https://mariete431-svg.github.io/portfolio/obra-clara/", kinds: ["web"] },
  { name: "Garaje Nueve", key: "garaje", to: "https://mariete431-svg.github.io/portfolio/garaje-nueve/", kinds: ["web", "reservas"] },
  { name: "ZONA 4", key: "zona", to: "https://mariete431-svg.github.io/zona4/", kinds: ["web", "reservas"] },
  { name: "Casa Iglesias", key: "casa", to: "#inicio", kinds: ["web", "marca", "reservas"] },
];

function KindFilter({ value, onChange, label }: { value: string; onChange: (v: "todo" | Kind) => void; label: string }) {
  const t = useT().kinds;
  return <div className="filter-row kind-filter" role="group" aria-label={label}>
    {KIND_FILTERS.map(([id, key]) => <button key={id} type="button" className="chip" aria-pressed={value === id} onClick={() => onChange(id)}>{t[key]}</button>)}
  </div>;
}

/* ---------- Servicios y precios de Casa Iglesias ---------- */
// Precios (los textos de cada paquete están en el diccionario de cada idioma, en el mismo orden)
const PACK_PRICES: { kind: Kind; price: number }[] = [{ kind: "web", price: 390 }, { kind: "web", price: 790 }, { kind: "reservas", price: 1290 }];
const BRAND_PRICES = [190, 390, 990];
const EXTRA_PRICES = [90, 190, 60];
// Miles con punto también en 4 cifras (1.290 €), como en el panel y los presupuestos
const euros = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

type Pack = { name: string; price: number; time: string; tag?: string; items: string[] };
function PriceCard({ pack, delay }: { pack: Pack; delay: number }) {
  const t = useT();
  return <Reveal delay={delay}><article className={`price-card ${pack.tag ? "is-featured" : ""}`}>
    {pack.tag && <span className="price-tag">{pack.tag}</span>}
    <span className="eyebrow">{pack.name.toUpperCase()}</span>
    <p className="price-amount">{euros(pack.price)}<small> {t.pricing.tax}</small></p>
    <p className="price-time">{t.pricing.delivery} {pack.time}</p>
    <ul>{pack.items.map(item => <li key={item}>{item}</li>)}</ul>
    <Button variant={pack.tag ? "luxury" : "outlineLuxury"} size="lg" asChild><a href="#reservar" data-cursor={t.cursor.book}>{t.pricing.quote} <ArrowUpRight /></a></Button>
  </article></Reveal>;
}

function Pricing() {
  const t = useT().pricing;
  const packages = PACK_PRICES.map((p, i) => ({ ...p, ...t.packages[i]! }));
  const brandPackages = BRAND_PRICES.map((price, i) => ({ price, ...t.brandPackages[i]! }));
  const [kind, setKind] = useState<"todo" | Kind>("todo");
  const webs = packages.filter(p => kind === "todo" || p.kind === kind);
  const showBrand = kind === "todo" || kind === "marca";
  return <section id="precios" className="pricing-section section-pad"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{t.label}</span><span className="section-rule" /></div>
      <div className="intro-row"><h2>{t.title1}<br /><em>{t.titleEm}</em></h2><p>{t.intro}</p></div>
      <KindFilter value={kind} onChange={setKind} label={t.filter} /></Reveal>
    <AnimatePresence mode="popLayout" initial={false}>
      {webs.length > 0 && <motion.div key={`webs-${kind}`} className="pricing-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>{webs.map((pack, i) => <PriceCard key={pack.name} pack={pack} delay={i * .06} />)}</motion.div>}
      {showBrand && <motion.div key="marca" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
        <Reveal><div className="pricing-subhead" style={kind === "marca" ? { marginTop: 0 } : undefined}><h3>{t.brandTitle} <em>{t.brandTitleEm}</em></h3><p>{t.brandIntro}</p></div></Reveal>
        <div className="pricing-grid">{brandPackages.map((pack, i) => <PriceCard key={pack.name} pack={pack} delay={i * .06} />)}</div>
      </motion.div>}
    </AnimatePresence>
    <Reveal><div className="pricing-more">
      <div><span className="eyebrow">{t.maintenanceLabel}</span><p><strong>{t.maintenancePrice}</strong> {t.maintenance}</p></div>
      <div><span className="eyebrow">{t.extrasLabel}</span><p>{t.extras.map((name, i) => <span key={name}>{name} · <strong>{euros(EXTRA_PRICES[i]!)}</strong></span>)}</p></div>
      <div><span className="eyebrow">{t.launchLabel}</span><p><strong>{t.launchStrong}</strong>{t.launch}</p></div>
    </div></Reveal>
  </div></section>;
}

/* ---------- Lo principal: el desplegable para reservar una reunión ---------- */
type Panel = "reservar" | null;

function StartHere() {
  const t = useT();
  const shortDay = new Intl.DateTimeFormat(LOCALES[useLang()], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const [open, setOpen] = useState<Panel>(null);
  const [days, setDays] = useState<string[] | null>(null);

  // Los próximos huecos se piden al acercarse a esta sección, para no retrasar la portada
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) { setNear(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: "200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
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
  }, [near]);

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
  const nextDays = days === null ? t.start.checking
    : days.length ? `${t.start.next}: ${days.map(d => capitalize(shortDay.format(new Date(`${d}T12:00:00Z`)).replace(".", ""))).join(" · ")}`
      : t.start.seeCalendar;

  return <section ref={sectionRef} id="servicios" className="start-section"><div className="section-wrap">
    <Reveal><div className="section-heading"><span className="eyebrow">{t.start.label}</span><span className="section-rule" /></div></Reveal>
    <h2 className="sr-only">{t.start.srTitle}</h2>
    <div className="start-list">
      <Reveal><div id="reservar" className={`start-item ${open === "reservar" ? "is-open" : ""}`}>
        <button type="button" className="start-toggle" aria-expanded={open === "reservar"} aria-controls="start-reservar" onClick={() => toggle("reservar")} data-cursor={open === "reservar" ? t.cursor.close : t.cursor.open}>
          <span className="start-icon"><CalendarDays strokeWidth={1.2} /></span>
          <span className="start-text"><strong>{t.start.title1} <em>{t.start.titleEm}</em></strong><small>{t.start.meta} · {nextDays}</small></span>
          <span className="start-plus" aria-hidden="true"><Plus /></span>
        </button>
        <motion.div id="start-reservar" className="start-panel" inert={open !== "reservar"} initial={false} animate={{ height: open === "reservar" ? "auto" : 0, opacity: open === "reservar" ? 1 : 0 }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}>
          {open === "reservar" && <div className="start-panel-inner"><Suspense fallback={<p className="status-text">{t.start.opening}</p>}><Booking compact /></Suspense></div>}
        </motion.div>
      </div></Reveal>

    </div>
  </div></section>;
}

function Projects() {
  const t = useT().projects;
  const [kind, setKind] = useState<"todo" | Kind>("todo");
  const local = useLocalize();
  const visible = projects.filter(p => kind === "todo" || p.kinds.includes(kind));
  return <section id="proyectos" className="projects-section section-pad"><div className="section-wrap"><Reveal><div className="section-heading"><span className="eyebrow">{t.label}</span><span className="section-rule" /></div><div className="intro-row"><h2>{t.title1}<br /><em>{t.titleEm}</em></h2><p>{t.intro}</p></div>
    <KindFilter value={kind} onChange={setKind} label={t.filter} /></Reveal>
    <motion.div layout className="project-list"><AnimatePresence initial={false} mode="popLayout">{visible.map((project, i) => {
      const description = t.items[project.key];
      const inner = <><span className="project-number">0{i + 1}</span><strong>{project.name}</strong><span className="project-description">{description}</span></>;
      return <motion.div key={project.name} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}><ProjectPreview name={project.name}>{project.to.startsWith("http")
        ? <a className="project-row" href={project.to} target="_blank" rel="noopener noreferrer" aria-label={`${project.name}: ${description} (${t.newTab})`}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></a>
        : project.to.startsWith("#")
          ? <a className="project-row" href={project.to}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></a>
          : <Link className="project-row" to={local(project.to)}>{inner}<ArrowUpRight className="project-arrow" strokeWidth={1.25} /></Link>}
      </ProjectPreview></motion.div>;
    })}</AnimatePresence></motion.div></div></section>;
}

export default function Home() {
  const t = useT();
  usePageTitle(t.meta.home);
  // Mientras está la foto de entrada, el titular espera para escribirse cuando la foto se va
  const [heroReady, setHeroReady] = useState(() => !introPending());
  const show = heroReady ? { opacity: 1, y: 0 } : undefined;
  return <>
    <Entrance onReveal={() => setHeroReady(true)} />
    <main id="inicio">
      <section className="hero section-wrap" aria-labelledby="hero-title">
        <HeroBackdrop />
        <HeroDepth className="hero-content"><Reveal immediate><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> {t.hero.eyebrow} <span className="status-pill"><i aria-hidden="true" />{t.hero.available}</span></p></Reveal>
          <TypeTitle lines={["Casa", "Iglesias."]} play={heroReady} delay={.45} />
          <motion.p className="hero-subtitle" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .75, duration: .8 }}>{t.hero.subtitle1}<br className="desktop-break" /> {t.hero.subtitle2}</motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={show} transition={{ delay: .9, duration: .8 }}><Magnetic><Button variant="luxury" size="lg" asChild><a href="#reservar" data-cursor={t.cursor.book}>{t.hero.book} <ArrowUpRight /></a></Button></Magnetic><Magnetic><Button variant="outlineLuxury" size="lg" asChild><a href="#precios" data-cursor={t.cursor.see}>{t.hero.prices} <ArrowUpRight /></a></Button></Magnetic></motion.div>
        </HeroDepth>
        <div className="hero-stamp"><Stamp show={heroReady} /></div>
        <div className="hero-bottom"><span>{t.hero.bottomLeft}</span><a href="#servicios">{t.chrome.scrollHint.toUpperCase()} <ArrowDown size={15} strokeWidth={1.5} /></a></div>
      </section>

      <StartHere />

      <Pricing />

      <Process />

      <section id="estudio" className="profile-section section-pad"><div className="section-wrap">
        <Reveal><div className="section-heading"><span className="eyebrow">{t.studio.label}</span><span className="section-rule" /></div></Reveal>
        <div className="profile-grid"><div className="profile-quote"><ProfileParallax direction={-1}><Reveal><h2>{t.studio.title1}<br /><em>{t.studio.titleEm}</em></h2><blockquote>{t.studio.quote}</blockquote></Reveal></ProfileParallax></div>
          <div className="profile-details"><Reveal><p>{t.studio.p1}</p><p>{t.studio.p2}</p></Reveal>
            <ProfileParallax><Reveal><Tilt max={8}><div className="portrait"><motion.img src={asset("foto.jpg")} alt={t.studio.portraitAlt} loading="lazy" initial={{ scale: 1.14 }} whileInView={{ scale: 1.03 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: [.2, .7, .2, 1] }} /></div></Tilt></Reveal></ProfileParallax>
          </div></div>
        <Reveal><div className="facts">{t.studio.facts.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div></Reveal>
      </div></section>

      <EditorialMarquee />

      <Projects />


      <CvMagnet />

      <Testimonials label={t.reviews.label} />

      <Faq />

      <InstagramFeed />

      <Newsletter />

      <Contact />
    </main>
  </>;
}
