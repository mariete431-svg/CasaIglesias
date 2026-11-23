
/** Cuenta una visita a una página para las estadísticas propias de la web (sin publicidad ni terceros).
 *  Guarda la página, el idioma de la versión vista y el del navegador, la web de la que viene (solo el dominio),
 *  el tipo de aparato, el navegador, el sistema, el tamaño de pantalla, la zona horaria y un número al azar
 *  guardado en este navegador para saber si la misma persona vuelve. Sin nombre, sin correo y sin IP. */

const K_ID = "cv:id";   // número al azar de este navegador
const K_YO = "cv:yo";   // "1" en los aparatos de Mario: sus visitas se apuntan aparte

const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

/** Marca este aparato como «de Mario» (lo hace solo al entrar en el panel de la web). */
export function markOwnDevice(on = true) { if (on) ls.set(K_YO, "1"); else ls.del(K_YO); }

function visitorId(): string | null {
  let id = ls.get(K_ID);
  if (id && /^[a-z0-9]{8,24}$/.test(id)) return id;
  try {
    const a = new Uint8Array(10);
    crypto.getRandomValues(a);
    id = Array.from(a, n => (n % 36).toString(36)).join("");
  } catch { id = Math.random().toString(36).slice(2, 12).padEnd(10, "0"); }
  ls.set(K_ID, id);
  return ls.get(K_ID) === id ? id : null; // si el navegador no deja guardar, no se inventa uno por página
}

function browserName(ua: string): string {
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "TikTok";
  if (/EdgA?\/|EdgiOS/i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Otro";
}

function osName(ua: string): string {
  if (/iPhone|iPod/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Otro";
}

/** Enlaces de «este aparato es mío»: casaiglesias.es/?soy=yo (y ?soy=no para deshacerlo). */
function ownFromLink() {
  try {
    const q = new URLSearchParams(location.search), v = q.get("soy");
    if (v !== "yo" && v !== "no") return;
    markOwnDevice(v === "yo");
    q.delete("soy");
    const rest = q.toString();
    history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    const n = document.createElement("div");
    n.setAttribute("role", "status");
    n.textContent = v === "yo" ? "Hecho: las visitas desde este aparato se apuntan como tuyas." : "Hecho: este aparato vuelve a contar como una visita normal.";
    n.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:min(92vw,420px);padding:12px 18px;border-radius:12px;background:#2a0d13;color:#f6efe4;font:500 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35)";
    document.body.appendChild(n);
    window.setTimeout(() => n.remove(), 6000);
  } catch { /* nunca debe romper la web */ }
}

let last = "";
let first = true;
export function countVisit(rawPath: string, lang: string) {
  try {
    if (first) { first = false; ownFromLink(); }
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
    const ua = navigator.userAgent || "";
    let tz: string | null = null;
    try { tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").slice(0, 40) || null; } catch { tz = null; }
    let src: string | null = null;
    try { const q = new URLSearchParams(location.search); src = (q.get("utm_source") || q.get("origen") || "").replace(/[^\w .-]/g, "").slice(0, 60) || null; } catch { src = null; }
    const clean = (s: string) => s.replace(/[^A-Za-z0-9-]/g, "");
    const base = { path: path.slice(0, 200), lang: lang.slice(0, 5), ref, device };
    const more = {
      ...base,
      vid: visitorId(),
      nav_lang: clean(navigator.language || "").slice(0, 12) || null,
      langs: (navigator.languages || []).slice(0, 5).map(clean).filter(Boolean).join(",").slice(0, 60) || null,
      tz,
      browser: browserName(ua),
      os: osName(ua),
      screen: `${screen.width}x${screen.height}`.slice(0, 11),
      src,
      own: ls.get(K_YO) === "1",
    };
    // La conexión con la base de datos se descarga cuando el navegador está libre, para no frenar la portada.
    // Si la versión detallada falla, se cuenta al menos la visita sencilla de siempre
    const send = () => void import("./supabase").then(({ publicClient }) => publicClient.from("page_views").insert(more).then(
      r => { if (r.error) void publicClient.from("page_views").insert(base).then(() => undefined, () => undefined); },
      () => undefined,
    ), () => undefined);
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(send, { timeout: 4000 });
    else window.setTimeout(send, 2500);
  } catch { /* contar visitas nunca debe romper la web */ }
}
