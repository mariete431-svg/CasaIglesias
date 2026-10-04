// Crea el PDF del currículum directamente en el navegador (sin enviar nada a ningún sitio).
// Se descarga aparte, solo al pulsar el botón, porque la librería pesa.
import { jsPDF } from "jspdf";
import type { CvStyle } from "./cvStyle";

export type CvData = {
  name: string; role: string; email: string; phone: string; location: string; summary: string;
  education: { title: string; center: string; dates: string }[];
  jobs: { title: string; company: string; dates: string; desc: string }[];
  skills: string; langs: string;
};

export type { CvStyle };

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [61, 17, 25];
};
const list = (value: string) => value.split(",").map(s => s.trim()).filter(Boolean);

export type CvLabels = { profile: string; experience: string; education: string; skills: string; langs: string; name: string; job: string; degree: string; file: string };

// Recorta la foto al tamaño que se va a ver (y en círculo si se pide) para que no salga estirada
async function cropPhoto(src: string, aspect: number, round: boolean): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  let cw = img.naturalWidth, ch = cw / aspect;
  if (ch > img.naturalHeight) { ch = img.naturalHeight; cw = ch * aspect; }
  const sx = (img.naturalWidth - cw) / 2, sy = (img.naturalHeight - ch) * .25;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(Math.min(round ? 360 : 600, cw));
  canvas.height = Math.round(canvas.width / aspect);
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  if (round) { ctx.beginPath(); ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2); ctx.clip(); }
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
  return round ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", .9);
}

const FONTS = {
  classic: { title: "times", body: "helvetica", titleStyle: "normal", name: 30, item: 14 },
  modern: { title: "helvetica", body: "helvetica", titleStyle: "bold", name: 24, item: 11.5 },
  serif: { title: "times", body: "times", titleStyle: "normal", name: 30, item: 14 },
} as const;
const GAP = { compact: .7, normal: 1, airy: 1.3 } as const;
const LINE = { compact: .41, normal: .45, airy: .5 } as const;

export async function downloadCvPdf(cv: CvData, opts: { photo: string | null; logo: string | null; color: string; style: CvStyle; labels: CvLabels }) {
  const L = opts.labels, S = opts.style;
  const F = FONTS[S.font], gap = GAP[S.spacing], lineK = LINE[S.spacing];
  const round = S.photoShape === "round";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 18, BOTTOM = 280, SB = 66;
  const accent = hexToRgb(opts.color);
  const ink: [number, number, number] = [40, 28, 30];
  const muted: [number, number, number] = [120, 100, 104];
  const white: [number, number, number] = [255, 255, 255];
  const softWhite: [number, number, number] = [236, 226, 228];
  const sidebar = S.layout === "sidebar", centered = S.layout === "centered";
  let y = M;
  let x0 = sidebar ? SB + 12 : M;
  let cw = W - x0 - M;
  let noBreak = false;

  const paintSide = () => { if (sidebar) doc.setFillColor(...accent).rect(0, 0, SB, H, "F"); };
  paintSide();
  const ensure = (space: number) => { if (!noBreak && y + space > BOTTOM) { doc.addPage(); paintSide(); y = M; } };
  const title = (size: number, color = ink) => doc.setFont(F.title, F.titleStyle).setFontSize(size).setTextColor(...color);
  const body = (size: number, color = ink, style: "normal" | "bold" = "normal") => doc.setFont(F.body, style).setFontSize(size).setTextColor(...color);
  const align = centered ? "center" as const : "left" as const;
  const cx = centered ? W / 2 : x0;

  const heading = (text: string, color = accent) => {
    ensure(16);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...color);
    doc.text(text, x0, y, { charSpace: 1.2 });
    y += 6;
  };
  const paragraph = (text: string, size = 9.5, color = ink) => {
    body(size, color);
    for (const line of doc.splitTextToSize(text, cw)) { ensure(5); doc.text(line, x0, y); y += size * lineK; }
  };

  // Foto: se recorta al tamaño y forma elegidos
  const photoW = sidebar ? 40 : centered ? 32 : 28;
  const photoH = round ? photoW : photoW * 1.25;
  const photo = opts.photo ? await cropPhoto(opts.photo, photoW / photoH, round) : null;
  const addPhoto = (px: number, py: number) => { if (photo) doc.addImage(photo, round ? "PNG" : "JPEG", px, py, photoW, photoH); };
  const addLogo = (maxW: number, left: boolean) => {
    if (!opts.logo) return;
    const props = doc.getImageProperties(opts.logo);
    const h = 13, w = Math.min(maxW, (props.width / props.height) * h), lh = (props.height / props.width) * w;
    doc.addImage(opts.logo, "PNG", left ? x0 : (W - w) / 2, y, w, lh);
    y += Math.min(h, lh) + 7;
  };

  const sections = () => {
    if (cv.summary) { heading(L.profile); paragraph(cv.summary); y += 5 * gap; }
    if (cv.jobs.length) {
      heading(L.experience);
      for (const job of cv.jobs) {
        ensure(14);
        title(F.item); doc.text(job.title || L.job, x0, y); y += 5;
        const meta = [job.company, job.dates].filter(Boolean).join(" · ");
        if (meta) paragraph(meta, 8.5, muted);
        if (job.desc) { y += .5; paragraph(job.desc); }
        y += 4 * gap;
      }
      y += 1 * gap;
    }
    if (cv.education.length) {
      heading(L.education);
      for (const e of cv.education) {
        ensure(12);
        title(F.item); doc.text(e.title || L.degree, x0, y); y += 5;
        const meta = [e.center, e.dates].filter(Boolean).join(" · ");
        if (meta) paragraph(meta, 8.5, muted);
        y += 4 * gap;
      }
      y += 1 * gap;
    }
  };

  if (sidebar) {
    // Columna de color: foto, contacto, habilidades e idiomas
    noBreak = true;
    x0 = 10; cw = SB - 20; y = M;
    if (photo) { addPhoto((SB - photoW) / 2, y); y += photoH + 10; }
    const side = (head: string, lines: string[]) => {
      if (!lines.length) return;
      heading(head, white);
      for (const line of lines) { body(9, softWhite); for (const l of doc.splitTextToSize(line, cw)) { doc.text(l, x0, y); y += 4.4; } y += .8; }
      y += 5 * gap;
    };
    const contactLines = [cv.email, cv.phone, cv.location].filter(Boolean);
    for (const line of contactLines) { body(8.5, white); for (const l of doc.splitTextToSize(line, cw)) { doc.text(l, x0, y); y += 4.2; } y += .8; }
    if (contactLines.length) y += 5 * gap;
    side(L.skills, list(cv.skills));
    side(L.langs, list(cv.langs));
    noBreak = false;
    // Columna principal
    x0 = SB + 12; cw = W - x0 - M; y = M;
    addLogo(45, true);
    title(26); const nameLines = doc.splitTextToSize(cv.name || L.name, cw);
    doc.text(nameLines, x0, y + 7);
    y += 7 + (nameLines.length - 1) * 10 + 6;
    if (cv.role) { body(11, muted); doc.text(cv.role, x0, y); y += 6; }
    doc.setDrawColor(...accent).setLineWidth(.6).line(x0, y, W - M, y);
    y += 10;
    sections();
  } else {
    if (centered) {
      addLogo(45, false);
      if (photo) { addPhoto((W - photoW) / 2, y); y += photoH + 6; }
      title(F.name); const nameLines = doc.splitTextToSize(cv.name || L.name, W - 2 * M);
      doc.text(nameLines, cx, y + 8, { align });
      y += 8 + (nameLines.length - 1) * 11 + 6;
      if (cv.role) { body(11, muted); doc.text(cv.role, cx, y, { align }); y += 6; }
      const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join("   ·   ");
      if (contact) { body(9); doc.text(doc.splitTextToSize(contact, W - 2 * M), cx, y, { align }); y += 5; }
      y += 3;
    } else {
      const textRight = photo ? W - M - photoW - 6 : W - M;
      if (photo) addPhoto(W - M - photoW, y);
      addLogo(45, true);
      title(F.name); const nameLines = doc.splitTextToSize(cv.name || L.name, textRight - M);
      doc.text(nameLines, M, y + 8);
      y += 8 + (nameLines.length - 1) * 11 + 6;
      if (cv.role) { body(11, muted); doc.text(cv.role, M, y); y += 6; }
      const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join("   ·   ");
      if (contact) { body(9); doc.text(doc.splitTextToSize(contact, textRight - M), M, y); y += 5; }
      y = Math.max(y, photo ? M + photoH + 4 : y) + 3;
    }
    doc.setDrawColor(...accent).setLineWidth(.6).line(M, y, W - M, y);
    y += 10;
    sections();
    if (list(cv.skills).length) { heading(L.skills); paragraph(list(cv.skills).join("   ·   ")); y += 5 * gap; }
    if (list(cv.langs).length) { heading(L.langs); paragraph(list(cv.langs).join("   ·   ")); }
  }

  const file = (cv.name.trim() || "mi").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${L.file}-${file || "mi"}.pdf`);
}
