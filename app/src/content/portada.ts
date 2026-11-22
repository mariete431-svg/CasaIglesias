// Datos fijos de la portada (proyectos y precios). Los usa la web y también scripts/publicar.mjs,
// que escribe el mismo texto dentro del HTML para que lo lean todos los buscadores.
// Los textos de cada paquete y proyecto están en el diccionario de cada idioma, en el mismo orden.

export type Kind = "web" | "reservas" | "marca";

export const PROJECTS: { name: string; key: "brizna" | "obra" | "garaje" | "zona" | "casa"; to: string; kinds: Kind[] }[] = [
  { name: "Brizna", key: "brizna", to: "https://brizna.shop/", kinds: ["web", "marca"] },
  { name: "Obra Clara", key: "obra", to: "https://mariete431-svg.github.io/portfolio/obra-clara/", kinds: ["web"] },
  { name: "Garaje Nueve", key: "garaje", to: "https://mariete431-svg.github.io/portfolio/garaje-nueve/", kinds: ["web", "reservas"] },
  { name: "ZONA 4", key: "zona", to: "https://mariete431-svg.github.io/zona4/", kinds: ["web", "reservas"] },
  { name: "Casa Iglesias", key: "casa", to: "#inicio", kinds: ["web", "marca", "reservas"] },
];

export const PACK_PRICES: { kind: Kind; price: number }[] = [{ kind: "web", price: 390 }, { kind: "web", price: 790 }, { kind: "reservas", price: 1290 }];
export const BRAND_PRICES = [190, 390, 990];
export const EXTRA_PRICES = [90, 190, 60];

// Miles con punto también en 4 cifras (1.290 €), como en el panel y los presupuestos
export const euros = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
