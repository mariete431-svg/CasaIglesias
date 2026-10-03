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
const BASE = "/";
const SITE = `https://casaiglesias.es${BASE}`;

// index: si Google debe mostrar la página en sus resultados
const pages = {
  "": {
    title: "Casa Iglesias — Diseño y desarrollo web en Tenerife",
    description: "Casa Iglesias, estudio de diseño y desarrollo web de Mario Iglesias en Adeje, Tenerife. Webs cuidadas para negocios. Mira sus proyectos y reserva una reunión.",
    index: true,
  },
  cv: {
    title: "CV — Casa Iglesias",
    description: "Currículum de Mario Iglesias Martínez: experiencia en atención al cliente, cocina y restauración, formación y habilidades. Descárgalo en PDF.",
    index: false,
  },
  "crear-cv": {
    title: "Crea tu currículum gratis — Casa Iglesias",
    description: "Herramienta gratuita para crear tu CV en directo y guardarlo en PDF. Sin registrarte y sin enviar tus datos a ningún sitio.",
    index: true,
  },
  privacidad: {
    title: "Privacidad y aviso legal — Casa Iglesias",
    description: "Qué datos guarda la web de Mario Iglesias, para qué se usan y cómo pedir que se borren.",
    index: true,
  },
  blog: {
    title: "Blog — Casa Iglesias",
    description: "Consejos prácticos de Casa Iglesias para que tu negocio se vea bien en internet y consiga más clientes: webs, reservas online, Google y marca.",
    index: true,
  },
  cuestionario: {
    title: "Cuestionario para empezar tu web — Casa Iglesias",
    description: "Cuéntame tu negocio en diez minutos: qué haces, a quién te diriges y qué necesitas. Con tus respuestas preparo una propuesta a tu medida.",
    index: false,
  },
  baja: { title: "Darse de baja del boletín — Casa Iglesias", description: "Darse de baja del boletín de Casa Iglesias.", index: false },
  admin: { title: "Panel privado — Casa Iglesias", description: "Acceso privado.", index: false },
};

const escape = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Seguridad: la página solo puede cargar cosas de la propia web y de la base de datos (Supabase).
// Va solo en la versión publicada: en desarrollo, Vite necesita scripts propios.
const SUPABASE = "https://uaojfcqpdngoqpjrmttx.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Fotos de opiniones (Supabase) y del Instagram (Behold)
  `img-src 'self' data: blob: ${SUPABASE} https://behold.pictures https://*.behold.pictures https://*.cdninstagram.com https://*.fbcdn.net`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} wss://uaojfcqpdngoqpjrmttx.supabase.co https://feeds.behold.so`,
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
      jobTitle: "Diseño y desarrollo web",
      worksFor: { "@id": `${SITE}#estudio` },
      url: SITE,
      image: `${SITE}og-imagen.jpg`,
      email: "mailto:hola@casaiglesias.es",
      address: { "@type": "PostalAddress", addressLocality: "Adeje", addressRegion: "Santa Cruz de Tenerife", addressCountry: "ES" },
      knowsLanguage: ["es", "en"],
      sameAs: ["https://www.instagram.com/casaiglesias.studio/"],
    },
    { "@type": "WebSite", "@id": `${SITE}#web`, url: SITE, name: "Casa Iglesias", alternateName: "Casa Iglesias · Estudio de diseño y desarrollo web", inLanguage: "es", publisher: { "@id": `${SITE}#estudio` } },
    { "@type": "ProfessionalService", "@id": `${SITE}#estudio`, name: "Casa Iglesias", description: "Estudio de diseño y desarrollo web", url: SITE, logo: `${SITE}apple-touch-icon.png`, image: `${SITE}og-imagen.jpg`, founder: { "@id": `${SITE}#mario` }, sameAs: ["https://www.instagram.com/casaiglesias.studio/"], areaServed: "Tenerife", address: { "@type": "PostalAddress", addressLocality: "Adeje", addressRegion: "Santa Cruz de Tenerife", addressCountry: "ES" } },
  ],
});

// La misma ficha en cada idioma (el idioma y la descripción cambian)
const studioJson = (lang, description) => {
  const g = JSON.parse(personJson);
  const url = lang === "es" ? SITE : `${SITE}${lang}/`;
  for (const node of g["@graph"]) {
    if (node["@type"] === "WebSite") Object.assign(node, { inLanguage: lang, url, description });
    if (node["@type"] === "ProfessionalService") Object.assign(node, {
      description, email: "hola@casaiglesias.es", priceRange: "€€", areaServed: [{ "@type": "Place", name: "Tenerife" }, { "@type": "Place", name: "Islas Canarias" }],
      availableLanguage: ["es", "en", "it", "de", "fr", "he"],
      knowsAbout: ["Diseño web", "Desarrollo web", "Reservas online", "Identidad visual", "SEO local"],
    });
  }
  return JSON.stringify(g);
};
// El creador de CV es una herramienta gratuita: Google puede mostrarla como aplicación web
const cvToolJson = (lang, title, description) => JSON.stringify({
  "@context": "https://schema.org", "@type": "WebApplication", name: title.split(" — ")[0], description,
  url: `${SITE}${lang === "es" ? "" : `${lang}/`}crear-cv/`, inLanguage: lang, applicationCategory: "BusinessApplication", operatingSystem: "Web",
  isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, creator: { "@id": `${SITE}#estudio` },
});

// Texto real dentro del HTML para buscadores y para quien no tenga JavaScript.
// React lo sustituye por la página completa en cuanto carga.
const links = [["", "Inicio"], ["#precios", "Precios"], ["blog/", "Blog"], ["#reservar", "Reservar una reunión"], ["privacidad/", "Privacidad"]];
const fallback = (title, description, lang = "es") => `<div class="seo-fallback">
      <p>ADEJE, TENERIFE</p>
      <h1>${escape(title.startsWith("Casa Iglesias —") ? title : title.split(" — ")[0])}</h1>
      <p>${escape(description)}</p>
      <nav aria-label="Páginas">${links.map(([href, label], i) => {
        const translated = lang !== "es" ? LANG_PAGES[lang].nav[i] : label;
        const prefix = lang !== "es" && !href.startsWith("blog") ? `${lang}/` : "";
        return `<a href="${BASE}${prefix}${href}">${escape(translated)}</a>`;
      }).join(" · ")}</nav>
      <p><a href="mailto:hola@casaiglesias.es">hola@casaiglesias.es</a></p>
    </div>`;
const template = readFileSync(join(dist, "index.html"), "utf8");

const rssLink = `\n    <link rel="alternate" type="application/rss+xml" title="Blog de Casa Iglesias" href="${SITE}blog/feed.xml" />`;

// ---------- Idiomas ----------
// El español vive en la raíz; los demás idiomas en /en/, /it/, /de/, /fr/ y /he/ (mismas páginas).
// Los textos de la web están en src/i18n; aquí solo el título y la descripción para Google.
const LOCALIZED = ["", "crear-cv", "cuestionario", "privacidad", "baja"];
const OG_LOCALE = { es: "es_ES", en: "en_GB", it: "it_IT", de: "de_DE", fr: "fr_FR", he: "he_IL" };
const LANG_PAGES = {
  en: {
    baja: { title: "Unsubscribe from the newsletter — Casa Iglesias", description: "Unsubscribe from the newsletter." },
    "": { title: "Casa Iglesias — Web design studio in Tenerife", description: "Mario Iglesias's web design studio in Adeje, Tenerife: carefully crafted websites, online booking and branding for businesses. Book a free call." },
    "crear-cv": { title: "Create your CV for free — Casa Iglesias", description: "Free tool to create your CV live, with your logo and colour, and download it as a PDF. No sign-up and your data never leaves your browser." },
    privacidad: { title: "Privacy and legal notice — Casa Iglesias", description: "What data the Casa Iglesias website stores, what it is used for and how to ask for it to be deleted." },
    cuestionario: { title: "Questionnaire to start your website — Casa Iglesias", description: "Tell me about your business in ten minutes and I'll prepare a tailor-made proposal." },
    nav: ["Home", "Pricing", "Blog (in Spanish)", "Book a call", "Privacy"],
  },
  it: {
    baja: { title: "Annulla l'iscrizione alla newsletter — Casa Iglesias", description: "Annulla l'iscrizione alla newsletter." },
    "": { title: "Casa Iglesias — Web design a Tenerife", description: "Lo studio di web design di Mario Iglesias ad Adeje, Tenerife: siti curati, prenotazioni online e brand per attività. Prenota una call gratuita." },
    "crear-cv": { title: "Crea il tuo CV gratis — Casa Iglesias", description: "Strumento gratuito per creare il tuo CV in diretta, con logo e colore, e scaricarlo in PDF. Senza registrazione: i tuoi dati restano nel tuo browser." },
    privacidad: { title: "Privacy e note legali — Casa Iglesias", description: "Quali dati conserva il sito di Casa Iglesias, a cosa servono e come chiederne la cancellazione." },
    cuestionario: { title: "Questionario per iniziare il tuo sito — Casa Iglesias", description: "Raccontami la tua attività in dieci minuti e preparo una proposta su misura." },
    nav: ["Home", "Prezzi", "Blog (in spagnolo)", "Prenota una call", "Privacy"],
  },
  de: {
    baja: { title: "Vom Newsletter abmelden — Casa Iglesias", description: "Vom Newsletter abmelden." },
    "": { title: "Casa Iglesias — Webdesign auf Teneriffa", description: "Das Webdesign-Studio von Mario Iglesias in Adeje, Teneriffa: sorgfältige Websites, Online-Buchungen und Branding für Unternehmen." },
    "crear-cv": { title: "Erstelle deinen Lebenslauf kostenlos — Casa Iglesias", description: "Kostenloses Tool, um deinen Lebenslauf live mit Logo und Farbe zu erstellen und als PDF herunterzuladen. Ohne Anmeldung, deine Daten bleiben im Browser." },
    privacidad: { title: "Datenschutz und Impressum — Casa Iglesias", description: "Welche Daten die Website von Casa Iglesias speichert, wofür sie genutzt werden und wie du ihre Löschung verlangst." },
    cuestionario: { title: "Fragebogen für deine neue Website — Casa Iglesias", description: "Erzähl mir in zehn Minuten von deinem Unternehmen und ich bereite ein maßgeschneidertes Angebot vor." },
    nav: ["Startseite", "Preise", "Blog (auf Spanisch)", "Gespräch buchen", "Datenschutz"],
  },
  fr: {
    baja: { title: "Se désinscrire de la newsletter — Casa Iglesias", description: "Se désinscrire de la newsletter." },
    "": { title: "Casa Iglesias — Création de sites web à Tenerife", description: "Le studio de création web de Mario Iglesias à Adeje, Tenerife : sites soignés, réservation en ligne et identité visuelle pour les entreprises." },
    "crear-cv": { title: "Créez votre CV gratuitement — Casa Iglesias", description: "Outil gratuit pour créer votre CV en direct, avec votre logo et votre couleur, et le télécharger en PDF. Sans inscription ni envoi de données." },
    privacidad: { title: "Confidentialité et mentions légales — Casa Iglesias", description: "Quelles données le site de Casa Iglesias conserve, à quoi elles servent et comment demander leur suppression." },
    cuestionario: { title: "Questionnaire pour lancer votre site — Casa Iglesias", description: "Parlez-moi de votre entreprise en dix minutes et je prépare une proposition sur mesure." },
    nav: ["Accueil", "Tarifs", "Blog (en espagnol)", "Réserver un appel", "Confidentialité"],
  },
  he: {
    baja: { title: "ביטול הרשמה לניוזלטר — Casa Iglesias", description: "ביטול הרשמה לניוזלטר." },
    "": { title: "Casa Iglesias — סטודיו לעיצוב ופיתוח אתרים בטנריפה", description: "Casa Iglesias הוא הסטודיו לעיצוב ופיתוח אתרים של מריו איגלסיאס באדחה, טנריפה. אתרים מוקפדים, הזמנות אונליין ומיתוג לעסקים. קבעו שיחה חינם." },
    "crear-cv": { title: "יצירת קורות חיים בחינם — Casa Iglesias", description: "כלי חינמי ליצירת קורות חיים בזמן אמת, עם לוגו וצבע, והורדה כ-PDF. בלי הרשמה, והמידע נשאר בדפדפן שלכם." },
    privacidad: { title: "פרטיות ומידע משפטי — Casa Iglesias", description: "איזה מידע האתר של Casa Iglesias שומר, למה הוא משמש ואיך מבקשים למחוק אותו." },
    cuestionario: { title: "שאלון להתחלת האתר שלכם — Casa Iglesias", description: "ספרו לי על העסק בעשר דקות ואכין הצעה מותאמת אישית." },
    nav: ["דף הבית", "מחירים", "בלוג (בספרדית)", "קביעת שיחה", "פרטיות"],
  },
};
const LANGS = ["es", ...Object.keys(LANG_PAGES)];
const pageUrl = (lang, route) => `${SITE}${lang === "es" ? "" : `${lang}/`}${route ? `${route}/` : ""}`;
const hreflang = (route) => !LOCALIZED.includes(route) ? "" : LANGS.map(l => `
    <link rel="alternate" hreflang="${l}" href="${pageUrl(l, route)}" />`).join("")
  + `
    <link rel="alternate" hreflang="x-default" href="${pageUrl("es", route)}" />`;

// La foto del inicio se pide nada más empezar (es lo más grande que se ve al abrir la web)
const heroPreload = `
    <link rel="preload" as="image" href="${BASE}estudio-movil.webp" type="image/webp" media="(max-width: 700px)" fetchpriority="high" />
    <link rel="preload" as="image" href="${BASE}estudio.webp" type="image/webp" media="(min-width: 701px)" fetchpriority="high" />`;

// content: HTML propio para el bloque de buscadores (los artículos llevan su texto completo)
function pageHtml(route, { title, description, index, jsonLd, content, ogType }, lang = "es") {
  const url = pageUrl(lang, route);
  const ld = route === "" ? studioJson(lang, description) : route === "crear-cv" ? cvToolJson(lang, title, description) : jsonLd;
  let html = template
    .replace('<meta property="og:type" content="website" />', `<meta property="og:type" content="${ogType ?? "website"}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/\s*<meta property="og:locale" content="[^"]*" \/>/, "")
    .replace("</head>", `${securityMeta}${rssLink}${route === "" ? heroPreload : ""}${hreflang(route)}\n    <meta property="og:locale" content="${OG_LOCALE[lang]}" />${ld ? `\n    <script type="application/ld+json">${ld}</script>` : ""}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${content ?? fallback(title, description, lang)}</div>`);
  if (lang !== "es") html = html.replace(/<html lang="es"[^>]*>/, `<html lang="${lang}"${lang === "he" ? ' dir="rtl"' : ""}>`);
  if (!index) html = html.replace("<head>", '<head>\n    <meta name="robots" content="noindex, nofollow" />');
  return html;
}

for (const [route, meta] of Object.entries(pages)) {
  const folder = route ? join(dist, route) : dist;
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "index.html"), pageHtml(route, meta));
}
// Las mismas páginas en los otros idiomas
for (const lang of Object.keys(LANG_PAGES)) {
  for (const route of LOCALIZED) {
    const folder = join(dist, lang, route);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "index.html"), pageHtml(route, { ...pages[route], ...LANG_PAGES[lang][route] }, lang));
  }
}

// Página de error: nunca debe aparecer en Google
writeFileSync(join(dist, "404.html"), pageHtml("", { ...pages[""], title: "Página no encontrada — Casa Iglesias", index: false }));

// ---------- Blog ----------
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
    isPartOf: { "@type": "Blog", name: "Blog de Casa Iglesias", url: `${SITE}blog/` },
  });
  // Migas de pan (Inicio › Blog › artículo) para que Google las enseñe en los resultados
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}blog/` },
    { "@type": "ListItem", position: 3, name: post.title, item: `${SITE}${route}/` },
  ] };
  const content = `<article class="seo-fallback is-article">
      <p><a href="${BASE}blog/">BLOG</a> · ${day(post.date)}</p>
      <h1>${escape(post.title)}</h1>
      <p>${escape(post.summary)}</p>
      ${post.html}
      <p>Mario Iglesias · Escrito con ayuda de IA (Claude).</p>
    </article>`;
  writeFileSync(join(folder, "index.html"), pageHtml(route, { title: post.title.length > 44 ? post.title : `${post.title} — Casa Iglesias`, description: post.summary, index: true, jsonLd: `[${jsonLd},${JSON.stringify(crumbs)}]`, content, ogType: "article" }));
}

// Portada del blog: lista de artículos también dentro del HTML
{
  const blogJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de Casa Iglesias",
    url: `${SITE}blog/`,
    inLanguage: "es",
    author,
    blogPost: posts.map(p => ({ "@type": "BlogPosting", headline: p.title, datePublished: day(p.date), url: `${SITE}blog/${p.slug}/` })),
  });
  const content = `<div class="seo-fallback">
      <p>BLOG — CASA IGLESIAS</p>
      <h1>Ideas para tu negocio</h1>
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
  <title>Blog de Casa Iglesias</title>
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
${Object.keys(LANG_PAGES).flatMap(lang => LOCALIZED.filter(route => pages[route]?.index).map(route => `  <url><loc>${pageUrl(lang, route)}</loc><lastmod>${today}</lastmod></url>`)).join("\n")}
${posts.map(p => `  <url><loc>${SITE}blog/${p.slug}/</loc><lastmod>${day(p.date)}</lastmod></url>`).join("\n")}
</urlset>
`);

// Direcciones antiguas (.html) → páginas nuevas. admin.html conserva el enlace de recuperación de contraseña.
// La lista de tareas y el panel personal pasaron al panel privado de Mario: sus direcciones llevan a la portada
const redirects = { "cv.html": "cv/", "tareas.html": "", "dashboard.html": "", "tareas/index.html": "", "panel/index.html": "", "crear-cv.html": "crear-cv/", "admin.html": "admin/" };
for (const [file, target] of Object.entries(redirects)) {
  mkdirSync(dirname(join(dist, file)), { recursive: true });
  writeFileSync(join(dist, file), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Casa Iglesias</title>
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
// Artículos del blog que ya no existen: se borran para que no queden publicados
const rootBlog = join(root, "blog");
if (existsSync(rootBlog)) {
  for (const entry of readdirSync(rootBlog, { withFileTypes: true })) {
    if (entry.isDirectory() && !existsSync(join(dist, "blog", entry.name))) rmSync(join(rootBlog, entry.name), { recursive: true, force: true });
  }
}
cpSync(dist, root, { recursive: true });
console.log("Web copiada a la raíz del repositorio.");
