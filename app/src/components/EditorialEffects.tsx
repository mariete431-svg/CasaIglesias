import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { createPortal } from "react-dom";
import { readStored, writeStored } from "@/lib/utils";
import { asset } from "@/lib/asset";

export function useMotionPreference() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

const INTRO_KEY = "mi-intro-seen";
const EASE_OUT = [.22, 1, .36, 1] as const;

/** ¿Toca la entrada con la foto? Una vez por visita y nunca con "reducir movimiento". */
export function introPending() {
  if (typeof window === "undefined") return false;
  // Si se llega con un enlace a una sección (#reservar…), se va directo a ella sin la foto
  return !window.location.hash && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !readStored(INTRO_KEY, false, "session");
}

/**
 * Entrada de la portada: la puesta de sol de Tenerife a pantalla completa se enfoca,
 * aparece el nombre y la foto se levanta como una tarjeta en 3D dejando ver la web.
 * Se salta tocando, con la rueda o con cualquier tecla. `onReveal` avisa a la portada
 * para que su titular empiece justo cuando la foto se va.
 */
export function Entrance({ onReveal }: { onReveal?: () => void }) {
  const [phase, setPhase] = useState<"off" | "loading" | "show" | "lift">(() => introPending() ? "loading" : "off");
  const revealed = useRef(false);
  const reveal = () => {
    if (revealed.current) return;
    revealed.current = true;
    writeStored(INTRO_KEY, true, "session");
    onReveal?.();
    setPhase("lift");
  };

  useEffect(() => {
    if (phase === "off") { onReveal?.(); return; }
    if (phase !== "loading") return;
    // Se espera a la foto; si tarda (mala cobertura), se entra directamente sin foto
    const small = window.matchMedia("(max-width: 700px)").matches;
    const img = new Image();
    img.src = asset(small ? "tenerife-movil.webp" : "tenerife.webp");
    const giveUp = window.setTimeout(() => { revealed.current = true; writeStored(INTRO_KEY, true, "session"); onReveal?.(); setPhase("off"); }, 1600);
    img.decode().then(() => { window.clearTimeout(giveUp); if (!revealed.current) setPhase("show"); }).catch(() => undefined);
    return () => window.clearTimeout(giveUp);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "show") return;
    const timer = window.setTimeout(reveal, 2300);
    const skip = () => reveal();
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("keydown", skip);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
      document.documentElement.style.overflow = "";
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "off") return null;
  const lifting = phase === "lift";
  // Va directamente sobre la pantalla (fuera de la página animada) para ocuparla entera
  return createPortal(<motion.div className="intro" aria-hidden="true" onClick={reveal}
    initial={false} animate={{ backgroundColor: lifting ? "rgba(61,17,25,0)" : "rgba(61,17,25,1)" }} transition={{ duration: .7, delay: lifting ? .25 : 0 }}
    style={{ pointerEvents: lifting ? "none" : "auto" }}>
    {phase !== "loading" && <motion.div className="intro-card"
      initial={{ scale: 1, rotateX: 0, y: "0%", borderRadius: 0 }}
      animate={lifting
        ? { scale: [1, .9, .86], rotateX: [0, 8, 16], y: ["0%", "0%", "-118%"], borderRadius: [0, 28, 28] }
        : { scale: 1 }}
      transition={lifting ? { duration: 1.15, times: [0, .38, 1], ease: [.64, 0, .24, 1] } : undefined}
      onAnimationComplete={() => { if (lifting) setPhase("off"); }}
      style={{ transformPerspective: 1400, transformOrigin: "50% 30%" }}>
      <picture>
        <source media="(max-width: 700px)" type="image/webp" srcSet={asset("tenerife-movil.webp")} />
        <source media="(max-width: 700px)" srcSet={asset("tenerife-movil.jpg")} />
        <source type="image/webp" srcSet={asset("tenerife.webp")} />
        <motion.img src={asset("tenerife.jpg")} alt="" initial={{ scale: 1.22, filter: "blur(18px) brightness(.7)" }} animate={{ scale: 1.04, filter: "blur(0px) brightness(1)" }} transition={{ duration: 2.2, ease: [.2, .7, .2, 1] }} />
      </picture>
      <div className="intro-shade" />
      <motion.div className="intro-copy" animate={{ opacity: lifting ? 0 : 1, y: lifting ? -16 : 0 }} transition={{ duration: .45 }}>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .8, ease: EASE_OUT }}>ADEJE, TENERIFE</motion.p>
        <h2>{Array.from("Mario Iglesias").map((character, i) => <span className="hero-letter-mask" key={i}><motion.span initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ delay: .7 + i * .035, duration: .8, ease: [.2, .75, .2, 1] }}>{character === " " ? " " : character}</motion.span></span>)}</h2>
        <motion.span className="intro-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.3, duration: .9, ease: EASE_OUT }} />
      </motion.div>
    </motion.div>}
  </motion.div>, document.body);
}

export function ScrollAtmosphere() {
  const reduced = useMotionPreference();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const current = window.scrollY;
        setScrolled(current > 24);
        if (Math.abs(current - last) > 8) setVisible(current < 110 || current < last);
        last = current;
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    if (reduced || !window.matchMedia("(min-width: 901px) and (pointer: fine)").matches) return;
    // El desplazamiento suave solo se descarga en ordenador, así el móvil carga menos
    let frame = 0;
    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: { offset: -78 } });
      const raf = (time: number) => { lenis?.raf(time); frame = requestAnimationFrame(raf); };
      frame = requestAnimationFrame(raf);
    }).catch(() => { /* sin desplazamiento suave */ });
    return () => { cancelled = true; cancelAnimationFrame(frame); lenis?.destroy(); };
  }, [reduced]);
  useEffect(() => {
    document.documentElement.dataset["scrolled"] = scrolled ? "true" : "false";
    document.documentElement.dataset["headerVisible"] = visible ? "true" : "false";
  }, [scrolled, visible]);
  return <motion.div className="reading-progress" style={{ scaleX }} aria-hidden="true" />;
}

export function CustomCursor() {
  const reduced = useMotionPreference();
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 550, damping: 40 });
  const springY = useSpring(y, { stiffness: 550, damping: 40 });
  const [label, setLabel] = useState("");
  const [inside, setInside] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine) and (min-width: 901px)").matches) return;
    const move = (event: PointerEvent) => {
      x.set(event.clientX); y.set(event.clientY); setInside(true);
      const target = (event.target as Element).closest("a, button");
      setLabel(target?.getAttribute("data-cursor") ?? (target?.matches(".project-row") ? "Ver" : target?.matches("a[href$='#reservar']") ? "Reservar" : target ? "Abrir" : ""));
    };
    const leave = () => setInside(false);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, [reduced, x, y]);
  if (!mounted || reduced) return null;
  return <motion.div className={`editorial-cursor ${label ? "is-active" : ""}`} style={{ x: springX, y: springY, opacity: inside ? 1 : 0 }} aria-hidden="true">{label && <span>{label}</span>}</motion.div>;
}

export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useMotionPreference();
  const x = useSpring(0, { stiffness: 240, damping: 22 });
  const y = useSpring(0, { stiffness: 240, damping: 22 });
  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced || !window.matchMedia("(pointer: fine) and (min-width: 901px)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * .12);
    y.set((event.clientY - rect.top - rect.height / 2) * .12);
  };
  return <motion.div className={className} style={{ x, y }} onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}>{children}</motion.div>;
}

export function EditorialMarquee({ phrase = "Atención al cliente ✦ Organización ✦ Desarrollo web ✦ Discreción ✦ Detalle ✦ " }: { phrase?: string }) {
  const reduced = useMotionPreference();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const [speed, setSpeed] = useState(0);
  // Al hacer scroll rápido el texto se inclina ligeramente y vuelve a su sitio al parar
  const skewX = useSpring(useTransform(velocity, [-2500, 0, 2500], [7, 0, -7], { clamp: true }), { stiffness: 200, damping: 30 });
  useEffect(() => velocity.on("change", value => setSpeed(Math.min(Math.abs(value) / 1300, .6))), [velocity]);
  return <div className="marquee-band" aria-label={phrase}><motion.div style={reduced ? {} : { skewX }}><motion.div className="marquee-track" aria-hidden="true" animate={reduced ? false : { x: ["0%", "-50%"] }} transition={{ duration: 38 / (1 + speed), ease: "linear", repeat: Infinity }}>{Array.from({ length: 4 }, (_, i) => <span key={i}>{phrase.split("✦").map((word, j, all) => <span key={j}>{word}{j < all.length - 1 && <b className="marquee-star">✦</b>}</span>)}</span>)}</motion.div></motion.div></div>;
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduced = useMotionPreference();
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) { setValue(to); return; }
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      const start = performance.now();
      const tick = (time: number) => {
        const t = Math.min((time - start) / 1150, 1);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      observer.disconnect();
    }, { threshold: .5 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [to, reduced]);
  return <span ref={ref}>{value}{suffix}</span>;
}

export function ProfileParallax({ children, direction = 1 }: { children: ReactNode; direction?: number }) {
  const reduced = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [direction * 12, direction * -12]);
  return <div ref={ref}><motion.div style={reduced ? {} : { y }}>{children}</motion.div></div>;
}

/** Titular que se revela letra a letra. Cada línea es un texto; las líneas pares van en cursiva y con sangría.
 *  `play` en falso lo deja esperando (la portada lo usa mientras está la foto de entrada). */
export function HeroTitle({ lines = ["Mario", "Iglesias."], id = "hero-title", delay = .25, play = true }: { lines?: string[]; id?: string; delay?: number; play?: boolean }) {
  const reduced = useMotionPreference();
  return <h1 id={id} aria-label={lines.join(" ")}>
    {lines.map((line, lineIndex) => <span className="hero-title-line" key={line} aria-hidden="true"><span className={lineIndex ? "hero-line-indent" : ""}>{Array.from(line).map((character, index) => <span className="hero-letter-mask" key={`${lineIndex}-${index}`}><motion.span className={lineIndex ? "hero-italic" : ""} initial={reduced ? false : { y: "110%" }} animate={play ? { y: "0%" } : undefined} transition={{ delay: delay + lineIndex * .16 + index * .035, duration: .75, ease: [.2, .75, .2, 1] }}>{character === " " ? "\u00a0" : character}</motion.span></span>)}</span></span>)}
  </h1>;
}

/** Portada en 3D: al bajar, el bloque se inclina hacia atrás y se aleja, como una hoja que se tumba. */
export function HeroDepth({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 18]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, .9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const opacity = useTransform(scrollYProgress, [0, .85], [1, 0]);
  return <motion.div ref={ref} className={className} style={reduced ? {} : { rotateX, scale, y, opacity, transformPerspective: 1300, transformOrigin: "50% 100%" }}>{children}</motion.div>;
}

export function ProjectPreview({ name, children }: { name: string; children: ReactNode }) {
  const reduced = useMotionPreference();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [hovered, setHovered] = useState(false);
  return <div className="project-preview-wrap" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onMouseMove={event => { x.set(event.clientX + 18); y.set(event.clientY - 45); }}>
    {children}
    {!reduced && createPortal(<AnimatePresence>{hovered && <motion.div className="project-float" style={{ x, y }} initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .94 }} transition={{ duration: .2 }} aria-hidden="true"><span>PROYECTO / MI</span><strong>{name}</strong><span>EXPLORAR ↗</span></motion.div>}</AnimatePresence>, document.body)}
  </div>;
}

/** Aparición al entrar en pantalla: el bloque llega un poco inclinado hacia atrás y se pone de pie (3D suave).
 *  La perspectiva la pone el contenedor (CSS), así al terminar el bloque queda totalmente plano. */
export function Reveal({ children, className = "", immediate = false, delay = 0 }: { children: ReactNode; className?: string; immediate?: boolean; delay?: number }) {
  const reduced = useMotionPreference();
  return <div className={`reveal-mask ${className}`}>
    <motion.div className="reveal-inner"
      initial={immediate ? false : reduced ? { opacity: 0 } : { opacity: 0, y: 46, rotateX: 16, scale: .975 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, amount: .05, margin: "0px 0px -6% 0px" }}
      transition={reduced ? { duration: .4 } : { type: "spring", bounce: 0, duration: 1.1, delay, opacity: { duration: .7, delay } }}>{children}</motion.div>
  </div>;
}

/** Inclinación 3D muy suave que sigue al ratón (solo ordenador). Vuelve a su sitio con un muelle. */
export function Tilt({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduced = useMotionPreference();
  const rotateX = useSpring(0, { stiffness: 180, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 22 });
  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced || !window.matchMedia("(pointer: fine) and (min-width: 901px)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    rotateY.set(((event.clientX - rect.left) / rect.width - .5) * max * 2);
    rotateX.set(-((event.clientY - rect.top) / rect.height - .5) * max * 2);
  };
  return <motion.div className={className} style={{ rotateX, rotateY, transformPerspective: 900 }} onMouseMove={onMove} onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}>{children}</motion.div>;
}

/** Sello redondo con texto que gira despacio alrededor de una flecha. Es un enlace (por defecto, a reservar). */
export function Stamp({ text = "RESERVA TU REUNIÓN ✦ 30 MINUTOS ✦ ", href = "#reservar", show = true }: { text?: string; href?: string; show?: boolean }) {
  const reduced = useMotionPreference();
  return <motion.a href={href} className="stamp" aria-label="Reservar una reunión" data-cursor="Reservar"
    initial={{ opacity: 0, scale: .6, rotate: -40 }} animate={show ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
    transition={{ type: "spring", bounce: .25, duration: 1.1, delay: 1.1 }} whileTap={{ scale: .94 }}>
    <svg viewBox="0 0 200 200" aria-hidden="true" className={reduced ? "" : "stamp-spin"}>
      <defs><path id="stamp-circle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" /></defs>
      <text><textPath href="#stamp-circle" textLength="462">{text}</textPath></text>
    </svg>
    <span className="stamp-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></span>
  </motion.a>;
}
