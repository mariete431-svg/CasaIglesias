// Copia la web construida (dist/) a la raíz del repositorio, que es lo que publica GitHub Pages.
// Cada página tiene su carpeta con una copia de index.html (con su propio título y descripción)
// para que su dirección funcione directamente y Google la entienda.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(app, "dist");
const root = join(app, "..");
const BASE = "/MarioIglesias/";
const SITE = `https://mariete431-svg.github.io${BASE}`;

// index: si Google debe mostrar la página en sus resultados
const pages = {
  "": {
    title: "Mario Iglesias — Atención al cliente y desarrollo web",
    description: "Mario Iglesias Martínez en Adeje, Tenerife. Atención al cliente, organización y desarrollo web. Conoce su trayectoria, proyectos y reserva una reunión.",
    index: true,
  },
  cv: {
    title: "CV — Mario Iglesias",
    description: "Currículum de Mario Iglesias Martínez: experiencia en atención al cliente, cocina y restauración, formación y habilidades. Descárgalo en PDF.",
    index: true,
  },
  "crear-cv": {
    title: "Crea tu currículum gratis — Mario Iglesias",
    description: "Herramienta gratuita para crear tu CV en directo y guardarlo en PDF. Sin registrarte y sin enviar tus datos a ningún sitio.",
    index: true,
  },
  privacidad: {
    title: "Privacidad y aviso legal — Mario Iglesias",
    description: "Qué datos guarda la web de Mario Iglesias, para qué se usan y cómo pedir que se borren.",
    index: true,
  },
  tareas: { title: "Lista de tareas — Mario Iglesias", description: "Una lista de tareas sencilla que se guarda en tu navegador.", index: false },
  panel: { title: "Mi panel — Mario Iglesias", description: "Panel personal de Mario Iglesias.", index: false },
  admin: { title: "Panel privado — Mario Iglesias", description: "Acceso privado.", index: false },
};

const escape = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Seguridad: la página solo puede cargar cosas de la propia web y de la base de datos (Supabase).
// Va solo en la versión publicada: en desarrollo, Vite necesita scripts propios.
const SUPABASE = "https://uaojfcqpdngoqpjrmttx.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} wss://uaojfcqpdngoqpjrmttx.supabase.co`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
const securityMeta = `
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`;

// Ficha para Google: quién es Mario (datos estructurados de schema.org)
const personJson = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE}#mario`,
      name: "Mario Iglesias Martínez",
      alternateName: "Mario Iglesias",
      jobTitle: "Atención al cliente y desarrollo web",
      url: SITE,
      image: `${SITE}og-imagen.jpg`,
      email: "mailto:mariete431@icloud.com",
      address: { "@type": "PostalAddress", addressLocality: "Adeje", addressRegion: "Santa Cruz de Tenerife", addressCountry: "ES" },
      knowsLanguage: ["es", "en"],
      sameAs: ["https://www.instagram.com/Whsmario/"],
    },
    { "@type": "WebSite", "@id": `${SITE}#web`, url: SITE, name: "Mario Iglesias", inLanguage: "es", publisher: { "@id": `${SITE}#mario` } },
  ],
});

// Texto real dentro del HTML para buscadores y para quien no tenga JavaScript.
// React lo sustituye por la página completa en cuanto carga.
const links = [["", "Inicio"], ["cv/", "Currículum"], ["crear-cv/", "Crear tu CV gratis"], ["#reservar", "Reservar una reunión"], ["privacidad/", "Privacidad"]];
const fallback = (title, description) => `<div class="seo-fallback">
      <p>ADEJE, TENERIFE</p>
      <h1>${escape(title.split(" — ")[0])}</h1>
      <p>${escape(description)}</p>
      <nav aria-label="Páginas">${links.map(([href, label]) => `<a href="${BASE}${href}">${label}</a>`).join(" · ")}</nav>
      <p><a href="mailto:mariete431@icloud.com">mariete431@icloud.com</a></p>
    </div>`;
const template = readFileSync(join(dist, "index.html"), "utf8");

function pageHtml(route, { title, description, index }) {
  const url = `${SITE}${route ? `${route}/` : ""}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace("</head>", `${securityMeta}${route === "" ? `\n    <script type="application/ld+json">${personJson}</script>` : ""}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${fallback(title, description)}</div>`);
  if (!index) html = html.replace("<head>", '<head>\n    <meta name="robots" content="noindex, nofollow" />');
  return html;
}

for (const [route, meta] of Object.entries(pages)) {
  const folder = route ? join(dist, route) : dist;
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "index.html"), pageHtml(route, meta));
}

// Página de error: nunca debe aparecer en Google
writeFileSync(join(dist, "404.html"), pageHtml("", { ...pages[""], title: "Página no encontrada — Mario Iglesias", index: false }));

// Mapa del sitio para Google Search Console
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.entries(pages).filter(([, meta]) => meta.index).map(([route]) => `  <url><loc>${SITE}${route ? `${route}/` : ""}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);

// Direcciones antiguas (.html) → páginas nuevas. admin.html conserva el enlace de recuperación de contraseña.
const redirects = { "cv.html": "cv/", "tareas.html": "tareas/", "dashboard.html": "panel/", "crear-cv.html": "crear-cv/", "admin.html": "admin/" };
for (const [file, target] of Object.entries(redirects)) {
  writeFileSync(join(dist, file), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Mario Iglesias</title>
<link rel="canonical" href="${SITE}${target}">
<script>location.replace("${BASE}${target}" + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${BASE}${target}"></head><body><a href="${BASE}${target}">Continuar</a></body></html>\n`);
}

// Se conservan las piezas de la versión publicada justo antes: quien tenga la web abierta
// al publicar puede seguir navegando. Las de versiones más antiguas se borran.
const assets = join(root, "assets");
if (existsSync(assets)) {
  const keep = new Set();
  const previous = existsSync(join(root, "index.html")) ? readFileSync(join(root, "index.html"), "utf8") : "";
  const pending = [...previous.matchAll(/assets\/([\w.-]+\.(?:js|css))/g)].map(m => m[1]);
  while (pending.length) {
    const file = pending.pop();
    if (keep.has(file) || !existsSync(join(assets, file))) continue;
    keep.add(file);
    if (file.endsWith(".js")) pending.push(...[...readFileSync(join(assets, file), "utf8").matchAll(/([\w-]+-[\w-]{8}\.(?:js|css))/g)].map(m => m[1]));
  }
  for (const file of readdirSync(assets)) if (!keep.has(file)) rmSync(join(assets, file), { force: true });
}
cpSync(dist, root, { recursive: true });
console.log("Web copiada a la raíz del repositorio.");
