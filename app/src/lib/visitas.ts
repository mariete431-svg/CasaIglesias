import { publicClient } from "./supabase";

/** Cuenta una visita a una página (sin cookies ni datos personales): la página, el idioma,
 *  la web de la que viene (solo el dominio) y si es móvil, tablet u ordenador. */
let last = "";
export function countVisit(path: string, lang: string) {
  try {
    if (path === last || path.startsWith("/admin") || /^(localhost|127\.)/.test(location.hostname)) return;
    if (navigator.webdriver || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || navigator.doNotTrack === "1") return;
    last = path;
    let ref: string | null = null;
    try { const h = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; ref = h && h !== location.hostname.replace(/^www\./, "") ? h.slice(0, 100) : null; } catch { ref = null; }
    const w = Math.min(screen.width, innerWidth);
    const device = w < 700 ? "movil" : w < 1100 && "ontouchstart" in window ? "tablet" : "ordenador";
    void publicClient.from("page_views").insert({ path: path.slice(0, 200), lang: lang.slice(0, 5), ref, device }).then(() => undefined, () => undefined);
  } catch { /* contar visitas nunca debe romper la web */ }
}
