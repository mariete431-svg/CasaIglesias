import { publicClient } from "./supabase";

/** Cuenta una visita a una página (sin cookies ni datos personales): la página, el idioma,
 *  la web de la que viene (solo el dominio) y si es móvil, tablet u ordenador. */
let last = "";
export function countVisit(rawPath: string, lang: string) {
  try {
    // "/crear-cv/" y "/crear-cv" son la misma página; "/index.html" es la portada
    const path = rawPath.replace(/\/index\.html$/, "/").replace(/(.)\/+$/, "$1");
    if (path === last || path.startsWith("/admin") || /^(localhost|127\.)/.test(location.hostname)) return;
    if (navigator.webdriver || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1") return;
    // Recargas y redirecciones: la misma página dentro de 30 segundos cuenta una sola vez
    try {
      const prev = JSON.parse(sessionStorage.getItem("cv:last") || "null");
      if (prev && prev.p === path && Date.now() - prev.t < 30000) { last = path; return; }
      sessionStorage.setItem("cv:last", JSON.stringify({ p: path, t: Date.now() }));
    } catch { /* sin sessionStorage: se cuenta igual */ }
    last = path;
    let ref: string | null = null;
    try { const h = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; ref = h && h !== location.hostname.replace(/^www\./, "") ? h.slice(0, 100) : null; } catch { ref = null; }
    const w = Math.min(screen.width, innerWidth);
    const device = w < 700 ? "movil" : w < 1100 && "ontouchstart" in window ? "tablet" : "ordenador";
    void publicClient.from("page_views").insert({ path: path.slice(0, 200), lang: lang.slice(0, 5), ref, device }).then(() => undefined, () => undefined);
  } catch { /* contar visitas nunca debe romper la web */ }
}
