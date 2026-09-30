/** Ruta pública de un archivo de /public (la web vive en /CasaIglesias/). */
export const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/** Supabase se descarga aparte, solo cuando hace falta, para que la portada cargue antes. */
export const loadSupabase = () => import("@/lib/supabase");
