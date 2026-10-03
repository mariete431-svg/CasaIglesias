import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CustomCursor, ScrollAtmosphere, useMotionPreference } from "@/components/EditorialEffects";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import Home from "@/pages/Home";
import { LANGS, applyHtmlLang, langFromPath } from "@/i18n";
import { countVisit } from "@/lib/visitas";

// El resto de páginas se descargan solo cuando se visitan
const CvPage = lazy(() => import("@/pages/CvPage"));
const BuilderPage = lazy(() => import("@/pages/BuilderPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const BriefPage = lazy(() => import("@/pages/BriefPage"));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Tras cambiar de página: arriba del todo, o a la sección del enlace (#reservar…). */
function scrollToLocation(hash: string) {
  if (!hash) { window.scrollTo(0, 0); return; }
  let tries = 0;
  const go = () => {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView();
    else if (tries++ < 20) window.setTimeout(go, 50);
  };
  go();
}

export default function App() {
  const location = useLocation();
  const reduced = useMotionPreference();

  // Idioma y dirección del texto (el hebreo va de derecha a izquierda)
  useEffect(() => { applyHtmlLang(langFromPath(location.pathname)); }, [location.pathname]);

  // Contador de visitas propio (sin cookies): solo página, idioma, procedencia y tipo de pantalla
  useEffect(() => { countVisit(location.pathname, langFromPath(location.pathname)); }, [location.pathname]);

  // Primera carga con #seccion en la dirección
  useEffect(() => { if (location.hash) scrollToLocation(location.hash); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <ToastProvider>
    <ScrollAtmosphere />
    <CustomCursor />
    <SiteHeader />
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => scrollToLocation(window.location.hash)}>
      <motion.div
        id="pagina"
        key={location.pathname}
        // Cambio de página con profundidad: la que se va se aleja, la nueva llega de frente
        initial={reduced ? false : { opacity: 0, y: 40, scale: .985, rotateX: 5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: .97, rotateX: -3 }}
        transition={{ type: "spring", bounce: 0, duration: .6, opacity: { duration: .35 } }}
        style={{ transformPerspective: 1600, transformOrigin: "50% 0%" }}
      >
        <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<div style={{ minHeight: "100svh" }} />}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/cv" element={<CvPage />} />
          <Route path="/crear-cv" element={<BuilderPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/privacidad" element={<PrivacyPage />} />
          <Route path="/cuestionario" element={<BriefPage />} />
          <Route path="/baja" element={<UnsubscribePage />} />
          {/* Las mismas páginas en los otros idiomas: /en/, /it/crear-cv… */}
          {LANGS.filter(l => l !== "es").map(l => <Route key={l} path={`/${l}`}>
            <Route index element={<Home />} />
            <Route path="crear-cv" element={<BuilderPage />} />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="cuestionario" element={<BriefPage />} />
            <Route path="baja" element={<UnsubscribePage />} />
            {/* El blog solo existe en español */}
            <Route path="blog/*" element={<Navigate to="/blog" replace />} />
          </Route>)}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
        <SiteFooter />
      </motion.div>
    </AnimatePresence>
  </ToastProvider>;
}
