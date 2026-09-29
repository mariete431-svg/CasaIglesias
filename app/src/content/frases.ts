// Frase del blog: cambia sola cada dos días.
// Cuando se cambia algo de la web, se añade una frase nueva ARRIBA del todo con la fecha del cambio:
// esa frase se enseña durante dos días y después vuelve la rotación normal.

export type Frase = { texto: string; fecha?: string };

export const frases: Frase[] = [
  { texto: "Una web no es un gasto. Es el escaparate que nunca cierra.", fecha: "2026-09-29" },
  { texto: "El buen diseño no grita. Se nota." },
  { texto: "Tus clientes te buscan en el móvil. Que te encuentren a la primera." },
  { texto: "Menos, pero mejor." },
  { texto: "Una marca clara vale más que mil anuncios." },
  { texto: "Si reservar cuesta, el cliente se va. Si es fácil, vuelve." },
  { texto: "La confianza se gana en los detalles." },
  { texto: "Primero se entiende. Después se admira." },
  { texto: "Un negocio pequeño también merece verse grande." },
  { texto: "Cada clic que ahorras es un cliente que ganas." },
];

const DAY = 86_400_000;

/** La frase que toca hoy: la más reciente durante sus dos primeros días; si no, una distinta cada dos días. */
export function fraseDeHoy(hoy = new Date()): string {
  const ultima = frases.find(f => f.fecha);
  if (ultima?.fecha) {
    const desde = (hoy.getTime() - new Date(`${ultima.fecha}T00:00:00`).getTime()) / DAY;
    if (desde >= 0 && desde < 2) return ultima.texto;
  }
  const turno = Math.floor(hoy.getTime() / (2 * DAY));
  return frases[turno % frases.length].texto;
}
