// Crea el PDF del currículum directamente en el navegador (sin enviar nada a ningún sitio).
// Se descarga aparte, solo al pulsar el botón, porque la librería pesa.
import { jsPDF } from "jspdf";

export type CvData = {
  name: string; role: string; email: string; phone: string; location: string; summary: string;
  education: { title: string; center: string; dates: string }[];
  jobs: { title: string; company: string; dates: string; desc: string }[];
  skills: string; langs: string;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [61, 17, 25];
};
const list = (value: string) => value.split(",").map(s => s.trim()).filter(Boolean);

export type CvLabels = { profile: string; experience: string; education: string; skills: string; langs: string; name: string; job: string; degree: string; file: string };
export function downloadCvPdf(cv: CvData, opts: { photo: string | null; logo: string | null; color: string; labels: CvLabels }) {
  const L = opts.labels;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18, BOTTOM = 280;
  const accent = hexToRgb(opts.color);
  const ink: [number, number, number] = [40, 28, 30];
  const muted: [number, number, number] = [120, 100, 104];
  let y = M;

  const ensure = (space: number) => { if (y + space > BOTTOM) { doc.addPage(); y = M; } };

  // Logo (arriba a la izquierda) y foto (arriba a la derecha)
  const photoW = 28, photoH = 35;
  if (opts.photo) doc.addImage(opts.photo, "JPEG", W - M - photoW, y, photoW, photoH);
  const textRight = opts.photo ? W - M - photoW - 6 : W - M;
  if (opts.logo) {
    const props = doc.getImageProperties(opts.logo);
    const h = 13, w = Math.min(45, (props.width / props.height) * h);
    doc.addImage(opts.logo, "PNG", M, y, w, (props.height / props.width) * w);
    y += Math.min(h, (props.height / props.width) * w) + 7;
  }

  doc.setFont("times", "normal").setFontSize(30).setTextColor(...ink);
  const nameLines = doc.splitTextToSize(cv.name || L.name, textRight - M);
  doc.text(nameLines, M, y + 8);
  y += 8 + (nameLines.length - 1) * 11 + 6;
  if (cv.role) { doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...muted); doc.text(cv.role, M, y); y += 6; }
  const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join("   ·   ");
  if (contact) { doc.setFontSize(9).setTextColor(...ink); doc.text(doc.splitTextToSize(contact, textRight - M), M, y); y += 5; }
  y = Math.max(y, opts.photo ? M + photoH + 4 : y) + 3;
  doc.setDrawColor(...accent).setLineWidth(.6).line(M, y, W - M, y);
  y += 10;

  const heading = (title: string) => {
    ensure(16);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...accent);
    doc.text(title, M, y, { charSpace: 1.2 });
    y += 6;
  };
  const paragraph = (text: string, size = 9.5, color = ink) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...color);
    for (const line of doc.splitTextToSize(text, W - 2 * M)) { ensure(5); doc.text(line, M, y); y += size * .45; }
  };

  if (cv.summary) { heading(L.profile); paragraph(cv.summary); y += 5; }

  if (cv.jobs.length) {
    heading(L.experience);
    for (const job of cv.jobs) {
      ensure(14);
      doc.setFont("times", "normal").setFontSize(14).setTextColor(...ink); doc.text(job.title || L.job, M, y); y += 5;
      const meta = [job.company, job.dates].filter(Boolean).join(" · ");
      if (meta) paragraph(meta, 8.5, muted);
      if (job.desc) { y += .5; paragraph(job.desc); }
      y += 4;
    }
    y += 1;
  }

  if (cv.education.length) {
    heading(L.education);
    for (const e of cv.education) {
      ensure(12);
      doc.setFont("times", "normal").setFontSize(14).setTextColor(...ink); doc.text(e.title || L.degree, M, y); y += 5;
      const meta = [e.center, e.dates].filter(Boolean).join(" · ");
      if (meta) paragraph(meta, 8.5, muted);
      y += 4;
    }
    y += 1;
  }

  if (list(cv.skills).length) { heading(L.skills); paragraph(list(cv.skills).join("   ·   ")); y += 5; }
  if (list(cv.langs).length) { heading(L.langs); paragraph(list(cv.langs).join("   ·   ")); }

  const file = (cv.name.trim() || "mi").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${L.file}-${file || "mi"}.pdf`);
}
