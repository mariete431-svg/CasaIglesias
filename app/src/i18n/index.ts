// Idiomas de la web. El español vive en la raíz (/); los demás, en /en/, /it/, /de/, /fr/ y /he/.
// Los textos están en un archivo por idioma (es.ts es el original). Los idiomas que no son
// el español se descargan aparte, solo cuando alguien los visita.
import { useLocation } from "react-router-dom";
import { es, type Dict } from "./es";

export const LANGS = ["es", "en", "it", "de", "fr", "he"] as const;
export type Lang = typeof LANGS[number];
export const LANG_NAMES: Record<Lang, string> = { es: "Español", en: "English", it: "Italiano", de: "Deutsch", fr: "Français", he: "עברית" };
export const LOCALES: Record<Lang, string> = { es: "es-ES", en: "en-GB", it: "it-IT", de: "de-DE", fr: "fr-FR", he: "he-IL" };
export const RTL: Lang[] = ["he"];
/** Páginas que existen en todos los idiomas (el blog, el CV y el panel siguen solo en español). */
export const LOCALIZED = ["", "crear-cv", "cuestionario", "privacidad", "baja"];

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/** "/en/crear-cv" → "en" · "/crear-cv" → "es" */
export function langFromPath(pathname: string): Lang {
  const first = pathname.split("/")[1] ?? "";
  return isLang(first) && first !== "es" ? first : "es";
}
/** "/en/crear-cv" → "/crear-cv" */
export function stripLang(pathname: string) {
  const lang = langFromPath(pathname);
  if (lang === "es") return pathname || "/";
  return pathname.slice(lang.length + 1) || "/";
}
/** ("/crear-cv", "en") → "/en/crear-cv" · ("/#precios", "en") → "/en/#precios" */
export function localize(path: string, lang: Lang) {
  if (lang === "es" || !path.startsWith("/")) return path;
  const base = path.split(/[?#]/)[0] ?? "/";
  if (base !== "/" && !LOCALIZED.includes(base.replace(/^\/|\/$/g, ""))) return path;
  return `/${lang}${path === "/" ? "/" : path}`;
}

const loaded: Partial<Record<Lang, Dict>> = { es };
const loaders: Record<Exclude<Lang, "es">, () => Promise<Dict>> = {
  en: () => import("./en").then(m => m.en),
  it: () => import("./it").then(m => m.it),
  de: () => import("./de").then(m => m.de),
  fr: () => import("./fr").then(m => m.fr),
  he: () => import("./he").then(m => m.he),
};
/** Descarga los textos de un idioma (antes de pintar la página o de cambiar de idioma). */
export async function loadLang(lang: Lang) {
  if (!loaded[lang] && lang !== "es") loaded[lang] = await loaders[lang]();
  return loaded[lang]!;
}

export function useLang(): Lang {
  return langFromPath(useLocation().pathname);
}
/** Textos del idioma de la página actual. */
export function useT(): Dict {
  return loaded[useLang()] ?? es;
}
/** Enlaces dentro del mismo idioma. */
export function useLocalize() {
  const lang = useLang();
  return (path: string) => localize(path, lang);
}

/** Pone el idioma y la dirección del texto en <html> (el hebreo va de derecha a izquierda). */
export function applyHtmlLang(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
}

export type { Dict };
