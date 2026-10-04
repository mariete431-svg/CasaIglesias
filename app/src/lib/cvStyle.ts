// Opciones de estilo del creador de CV (se comparten entre la vista previa y el PDF)
export type CvStyle = {
  font: "classic" | "modern" | "serif";
  layout: "classic" | "centered" | "sidebar";
  spacing: "compact" | "normal" | "airy";
  photoShape: "square" | "round";
};
export const DEFAULT_STYLE: CvStyle = { font: "classic", layout: "classic", spacing: "normal", photoShape: "square" };
