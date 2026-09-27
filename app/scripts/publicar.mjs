// Copia la web construida (dist/) a la raíz del repositorio, que es lo que publica GitHub Pages.
// Cada página tiene su carpeta con una copia de index.html (con su propio título y descripción)
// para que su dirección funcione directamente y Google la entienda.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

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
  blog: {
    title: "Bitácora — Mario Iglesias",
    description: "Cómo construyo mi web paso a paso: diseño, seguridad, accesibilidad y Google. Qué quería, qué decidí y qué aprendí en cada cambio.",
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
const links = [["", "Inicio"], ["cv/", "Currículum"], ["crear-cv/", "Crear tu CV gratis"], ["blog/", "Bitácora"], ["#reservar", "Reservar una reunión"], ["privacidad/", "Privacidad"]];
const fallback = (title, description) => `<div class="seo-fallback">
      <p>ADEJE, TENERIFE</p>
      <h1>${escape(title.split(" — ")[0])}</h1>
      <p>${escape(description)}</p>
      <nav aria-label="Páginas">${links.map(([href, label]) => `<a href="${BASE}${href}">${label}</a>`).join(" · ")}</nav>
      <p><a href="mailto:mariete431@icloud.com">mariete431@icloud.com</a></p>
    </div>`;
const template = readFileSync(join(dist, "index.html"), "utf8");

const rssLink = `\n    <link rel="alternate" type="application/rss+xml" title="Bitácora de Mario Iglesias" href="${SITE}blog/feed.xml" />`;

// content: HTML propio para el bloque de buscadores (los artículos llevan su texto completo)
function pageHtml(route, { title, description, index, jsonLd, content, ogType }) {
  const url = `${SITE}${route ? `${route}/` : ""}`;
  const ld = route === "" ? personJson : jsonLd;
  let html = template
    .replace('<meta property="og:type" content="website" />', `<meta property="og:type" content="${ogType ?? "website"}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace("</head>", `${securityMeta}${rssLink}${ld ? `\n    <script type="application/ld+json">${ld}</script>` : ""}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${content ?? fallback(title, description)}</div>`);
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

// ---------- Bitácora (blog) ----------
// Los artículos son archivos .md en src/content/blog (ver src/lib/blog.ts para el formato)
const postsDir = join(app, "src", "content", "blog");
const parsePost = (file) => {
  const raw = readFileSync(join(postsDir, file), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta = {};
  for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = (match?.[2] ?? raw).trim();
  return {
    slug: file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
    title: meta.titulo ?? "Sin título",
    date: meta.fecha ?? new Date().toISOString().slice(0, 10),
    summary: meta.resumen ?? "",
    tags: (meta.etiquetas ?? "").split(",").map(t => t.trim()).filter(Boolean),
    html: marked.parse(body, { gfm: true }).replace(/href="\/(?!\/)/g, `href="${BASE}`),
  };
};
const posts = existsSync(postsDir)
  ? readdirSync(postsDir).filter(f => f.endsWith(".md")).map(parsePost).sort((a, b) => b.date.localeCompare(a.date))
  : [];
const day = (date) => date.slice(0, 10);
const author = { "@type": "Person", "@id": `${SITE}#mario`, name: "Mario Iglesias Martínez", url: SITE };

for (const post of posts) {
  const route = `blog/${post.slug}`;
  const folder = join(dist, route);
  mkdirSync(folder, { recursive: true });
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: day(post.date),
    dateModified: day(post.date),
    inLanguage: "es",
    keywords: post.tags.join(", "),
    url: `${SITE}${route}/`,
    mainEntityOfPage: `${SITE}${route}/`,
    image: `${SITE}og-imagen.jpg`,
    author,
    publisher: author,
    isPartOf: { "@type": "Blog", name: "Bitácora de Mario Iglesias", url: `${SITE}blog/` },
  });
  const content = `<article class="seo-fallback is-article">
      <p><a href="${BASE}blog/">BITÁCORA</a> · ${day(post.date)}</p>
      <h1>${escape(post.title)}</h1>
      <p>${escape(post.summary)}</p>
      ${post.html}
      <p>Escrito por Mario Iglesias con ayuda de Claude.</p>
    </article>`;
  writeFileSync(join(folder, "index.html"), pageHtml(route, { title: `${post.title} — Mario Iglesias`, description: post.summary, index: true, jsonLd, content, ogType: "article" }));
}

// Portada del blog: lista de artículos también dentro del HTML
{
  const blogJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Bitácora de Mario Iglesias",
    url: `${SITE}blog/`,
    inLanguage: "es",
    author,
    blogPost: posts.map(p => ({ "@type": "BlogPosting", headline: p.title, datePublished: day(p.date), url: `${SITE}blog/${p.slug}/` })),
  });
  const content = `<div class="seo-fallback">
      <p>BITÁCORA — CÓMO CONSTRUYO MI WEB, PASO A PASO</p>
      <h1>Bitácora de obra</h1>
      <p>${escape(pages.blog.description)}</p>
      <ul>${posts.map(p => `<li><a href="${BASE}blog/${p.slug}/">${escape(p.title)}</a> (${day(p.date)})</li>`).join("")}</ul>
    </div>`;
  writeFileSync(join(dist, "blog", "index.html"), pageHtml("blog", { ...pages.blog, jsonLd: blogJson, content }));
}

// Canal RSS para quien quiera seguir la bitácora
const rssDate = (date) => new Date(`${day(date)}T${date.slice(11, 16) || "12:00"}:00Z`).toUTCString();
const cdata = (text) => `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
mkdirSync(join(dist, "blog"), { recursive: true });
writeFileSync(join(dist, "blog", "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Bitácora de Mario Iglesias</title>
  <link>${SITE}blog/</link>
  <atom:link href="${SITE}blog/feed.xml" rel="self" type="application/rss+xml" />
  <description>${escape(pages.blog.description)}</description>
  <language>es</language>
${posts.map(p => `  <item>
    <title>${escape(p.title)}</title>
    <link>${SITE}blog/${p.slug}/</link>
    <guid isPermaLink="true">${SITE}blog/${p.slug}/</guid>
    <pubDate>${rssDate(p.date)}</pubDate>
    <description>${escape(p.summary)}</description>
    <content:encoded>${cdata(p.html)}</content:encoded>
  </item>`).join("\n")}
</channel>
</rss>
`);

// Mapa del sitio para Google Search Console
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.entries(pages).filter(([, meta]) => meta.index).map(([route]) => `  <url><loc>${SITE}${route ? `${route}/` : ""}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
${posts.map(p => `  <url><loc>${SITE}blog/${p.slug}/</loc><lastmod>${day(p.date)}</lastmod></url>`).join("\n")}
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
