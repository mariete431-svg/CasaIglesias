import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroDepth, HeroTitle, Magnetic, Reveal } from "@/components/EditorialEffects";
import { LANGS, LANG_NAMES, type Lang, loadLang, localize, stripLang, useLang, useLocalize, useT } from "@/i18n";

function useNavigation() {
  const t = useT().chrome.nav;
  return [
    { label: t.prices, to: "/#precios" },
    { label: t.studio, to: "/#estudio" },
    { label: t.projects, to: "/#proyectos" },
    { label: t.blog, to: "/blog" },
    { label: t.reviews, to: "/#opiniones" },
    { label: t.contact, to: "/#contacto" },
  ];
}

/** Selector de idioma: cambia a la misma página en el otro idioma. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const t = useT();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const go = async (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    await loadLang(next).catch(() => undefined);
    const base = stripLang(pathname);
    const target = localize(base, next);
    // Las páginas que solo están en español (blog…) llevan a la portada del idioma elegido
    navigate((target === base && next !== "es" ? localize("/", next) : target) + hash);
  };
  if (compact) return <div className="lang-row" role="group" aria-label={t.chrome.language}>
    {LANGS.map(l => <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => go(l)}>{LANG_NAMES[l]}</button>)}
  </div>;
  return <div className="lang-switch" ref={box}>
    <button type="button" className="lang-button" aria-haspopup="true" aria-expanded={open} aria-label={`${t.chrome.language}: ${LANG_NAMES[lang]}`} onClick={() => setOpen(v => !v)}><Globe size={15} strokeWidth={1.5} /> {lang.toUpperCase()}</button>
    {open && <ul className="lang-menu" role="menu">{LANGS.map(l => <li key={l} role="none"><button type="button" role="menuitemradio" aria-checked={l === lang} lang={l} onClick={() => go(l)}><span>{l.toUpperCase()}</span>{LANG_NAMES[l]}</button></li>)}</ul>}
  </div>;
}

/** Sello de Casa Iglesias: dos aros y las iniciales CI. */
export function BrandSeal({ size = 34 }: { size?: number }) {
  return <svg className="brand-seal" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="40" cy="40" r="31.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <text x="40" y="49.5" textAnchor="middle" fontFamily="'Bodoni Moda', Didot, Georgia, serif" fontWeight="500" fontSize="27" fill="currentColor">CI</text>
  </svg>;
}

/** Logo horizontal de la cabecera: sello + nombre del estudio. */
export function BrandLogo() {
  return <span className="brand-logo" aria-label={useT().chrome.brandLabel}><BrandSeal /><span className="brand-name" aria-hidden="true">Casa Iglesias</span></span>;
}

/** En la portada los enlaces de sección son anclas normales; en el resto, llevan a la portada. */
function useHref(to: string) {
  const { pathname } = useLocation();
  const local = useLocalize();
  return stripLang(pathname) === "/" && to.startsWith("/#") ? to.slice(1) : local(to);
}

function NavItem({ to, className, onClick, children }: { to: string; className?: string; onClick?: () => void; children: ReactNode }) {
  const href = useHref(to);
  if (href.startsWith("#")) return <a href={href} className={className} onClick={onClick}>{children}</a>;
  if (to.includes("#")) return <Link to={href} className={className} onClick={onClick}>{children}</Link>;
  return <NavLink to={href} className={({ isActive }) => `${className ?? ""} ${isActive ? "active" : ""}`} onClick={onClick}>{children}</NavLink>;
}

export function SiteHeader() {
  const t = useT().chrome;
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    // Con el menú abierto, la página de detrás no se puede usar con el teclado
    const page = document.getElementById("pagina");
    if (menuOpen) page?.setAttribute("inert", "");
    if (!menuOpen) return () => { document.body.style.overflow = ""; };
    window.setTimeout(() => menu.current?.querySelector<HTMLElement>("a")?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; page?.removeAttribute("inert"); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // "Saltar al contenido": lleva el foco directamente a la página, sin pasar por el menú
  const skip = (event: MouseEvent) => {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>("#pagina main") ?? document.getElementById("pagina");
    if (!main) return;
    main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  };

  return <>
    <a className="skip-link" href="#pagina" onClick={skip}>{t.skip}</a>
    <header className="site-header"><div className="header-inner">
      <NavItem to="/#inicio" className="brand"><BrandLogo /></NavItem>
      <nav className="desktop-nav" aria-label={t.mainNav}>{navigation.map(item => <NavItem key={item.label} to={item.to} className="nav-link">{item.label}</NavItem>)}</nav>
      <div className="header-actions">
        <LanguageSwitcher />
        <NavItem to="/#reservar" className="header-book">{t.book}<span className="hide-mobile">&nbsp;{t.bookMeeting}</span> <ArrowUpRight size={15} strokeWidth={1.5} /></NavItem>
      </div>
      <Button ref={trigger} variant="text" size="icon" className="menu-trigger" aria-controls="menu-movil" aria-label={menuOpen ? t.closeMenu : t.openMenu} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</Button>
    </div></header>
    {menuOpen && <motion.nav ref={menu} id="menu-movil" className="mobile-menu" aria-label={t.mobileNav} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, ease: [.22, 1, .36, 1] }}>
      <motion.div className="mobile-menu-main" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05, duration: .45 }}>
        <NavItem to="/#reservar" className="mobile-cta mobile-cta-dark" onClick={() => setMenuOpen(false)}><small>{t.menuBookSmall}</small>{t.menuBook}<ArrowUpRight /></NavItem>
        <NavItem to="/crear-cv" className="mobile-cta" onClick={() => setMenuOpen(false)}><small>{t.menuCvSmall}</small>{t.menuCv}<ArrowUpRight /></NavItem>
      </motion.div>
      {navigation.map((item, i) => <motion.div key={item.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 + i * .05, duration: .45 }}><NavItem to={item.to} onClick={() => setMenuOpen(false)}><span>0{i + 1}</span>{item.label}<ArrowUpRight /></NavItem></motion.div>)}
      <LanguageSwitcher compact />
      <p>Adeje, Tenerife — 2026</p>
    </motion.nav>}
  </>;
}

export function SiteFooter() {
  const t = useT().chrome;
  const local = useLocalize();
  return <footer className="footer"><div className="section-wrap">
    <span className="footer-brand"><BrandSeal size={26} />{t.footer}</span>
    <nav aria-label={t.legalNav}>
      <Link to="/blog">{t.nav.blog}</Link>
      <Link to={local("/privacidad")}>{t.privacy}</Link>
    </nav>
  </div></footer>;
}

/** Portada de las páginas interiores, con el mismo lenguaje que la portada principal. */
export function PageHero({ eyebrow, lines, subtitle, actions, bottom, bottomHref }: {
  eyebrow: string; lines: string[]; subtitle?: ReactNode; actions?: ReactNode; bottom?: string; bottomHref?: string;
}) {
  const t = useT();
  const hint = bottom ?? t.chrome.scrollHint;
  return <section className="page-hero section-wrap" aria-labelledby="page-title">
    <HeroDepth className="hero-content">
      <Reveal immediate><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> {eyebrow}</p></Reveal>
      <HeroTitle lines={lines} id="page-title" delay={.15} />
      {subtitle && <motion.p className="hero-subtitle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .75, duration: .7 }}>{subtitle}</motion.p>}
      {actions && <motion.div className="hero-actions no-print" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9, duration: .7 }}>{actions}</motion.div>}
    </HeroDepth>
    <div className="hero-bottom"><span>{eyebrow.split("—")[0].trim()}</span>{bottomHref ? <a href={bottomHref}>{hint.toUpperCase()} <ArrowDown size={15} strokeWidth={1.5} /></a> : <span>{hint.toUpperCase()}</span>}</div>
  </section>;
}

/** Encabezado de sección: "01 / PERFIL" con una línea fina. */
export function SectionHeading({ label }: { label: string }) {
  return <Reveal><div className="section-heading"><span className="eyebrow">{label}</span><span className="section-rule" /></div></Reveal>;
}

export { Magnetic };

/** Cambia el título de la pestaña del navegador. */
export function usePageTitle(title: string) {
  useEffect(() => { document.title = title; }, [title]);
}
