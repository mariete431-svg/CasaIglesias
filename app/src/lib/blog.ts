// Bitácora: cada artículo es un archivo .md en src/content/blog/ con este encabezado:
//
// ---
// titulo: Título del artículo
// fecha: 2026-09-27 10:00   (la hora es opcional; sirve para ordenar varios del mismo día)
// resumen: Una o dos frases que aparecen en la lista y en Google.
// etiquetas: Diseño, Supabase
// ---
//
// El nombre del archivo (sin la fecha del principio) es su dirección: 2026-09-27-mi-web.md → /blog/mi-web

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  body: string;
  minutes: number;
};

const files = import.meta.glob("../content/blog/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** Separa el encabezado (entre las dos líneas ---) del texto del artículo. */
export function parsePost(fileName: string, raw: string): Post {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = (match?.[2] ?? raw).trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug: fileName.replace(/^.*\//, "").replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
    title: meta["titulo"] ?? "Sin título",
    date: meta["fecha"] ?? "",
    summary: meta["resumen"] ?? "",
    tags: (meta["etiquetas"] ?? "").split(",").map(t => t.trim()).filter(Boolean),
    body,
    minutes: Math.max(1, Math.round(words / 200)),
  };
}

/** Todos los artículos, del más nuevo al más antiguo. */
export const posts: Post[] = Object.entries(files)
  .map(([file, raw]) => parsePost(file, raw))
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

const longDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const formatPostDate = (date: string) => date ? longDate.format(new Date(`${date.slice(0, 10)}T12:00:00Z`)) : "";
/** Fecha en formato de máquina (para la etiqueta <time>). */
export const isoDay = (date: string) => date.slice(0, 10);
