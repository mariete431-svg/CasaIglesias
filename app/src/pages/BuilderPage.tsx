import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Plus, Printer, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { newId, readStored, writeStored } from "@/lib/utils";
import { useT } from "@/i18n";

const PHOTO_KEY = "mi-cv-foto";
const LOGO_KEY = "mi-cv-logo";
const COLOR_KEY = "mi-cv-color";
const COLORS = ["#3d1119", "#1f2a44", "#2f4a3a", "#8a5a2b", "#222222"];
const DRAFT_KEY = "mario-crear-cv";
type Education = { id: string; title: string; center: string; dates: string };
type Job = { id: string; title: string; company: string; dates: string; desc: string };
type Draft = {
  name: string; role: string; email: string; phone: string; location: string; summary: string;
  education: Education[]; jobs: Job[]; skills: string; langs: string;
};
const empty: Draft = { name: "", role: "", email: "", phone: "", location: "", summary: "", education: [], jobs: [], skills: "", langs: "" };

function loadDraft(): Draft {
  const saved = readStored<Partial<Draft>>(DRAFT_KEY, {});
  const draft = { ...empty, ...(saved && typeof saved === "object" ? saved : {}) };
  // Los borradores antiguos no tenían identificador en cada entrada
  return {
    ...draft,
    education: Array.isArray(draft.education) ? draft.education.map(e => ({ ...e, id: e.id ?? newId() })) : [],
    jobs: Array.isArray(draft.jobs) ? draft.jobs.map(j => ({ ...j, id: j.id ?? newId() })) : [],
  };
}
const list = (value: string) => value.split(",").map(s => s.trim()).filter(Boolean);

function Field({ id, label, value, onChange, placeholder, type = "text", textarea = false }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean;
}) {
  return <div className="form-row"><label htmlFor={id}>{label}</label>
    {textarea
      ? <textarea id={id} rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={600} />
      : <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={120} />}
  </div>;
}

export default function BuilderPage() {
  const tr = useT();
  const t = tr.builder;
  usePageTitle(tr.meta.builder);
  const [cv, setCv] = useState<Draft>(loadDraft);
  const [photo, setPhoto] = useState<string | null>(() => readStored<string | null>(PHOTO_KEY, null));

  useEffect(() => { writeStored(DRAFT_KEY, cv); }, [cv]);
  // La foto también se guarda (ya reducida) para que no se pierda al recargar
  useEffect(() => { writeStored(PHOTO_KEY, photo); }, [photo]);
  // Tu marca: logo (PNG con transparencia) y color de los títulos y la línea
  const [logo, setLogo] = useState<string | null>(() => readStored<string | null>(LOGO_KEY, null));
  const [color, setColor] = useState<string>(() => readStored<string>(COLOR_KEY, COLORS[0]));
  useEffect(() => { writeStored(LOGO_KEY, logo); }, [logo]);
  useEffect(() => { writeStored(COLOR_KEY, color); }, [color]);
  const [making, setMaking] = useState(false);

  const pickLogo = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Los SVG a veces no traen tamaño: se les da uno razonable
      const w0 = img.width || 600, h0 = img.height || 300;
      const scale = Math.min(1, 600 / Math.max(w0, h0));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w0 * scale);
      canvas.height = Math.round(h0 * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setLogo(canvas.toDataURL("image/png"));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert(t.logoError); };
    img.src = url;
  };

  const downloadPdf = async () => {
    // Las letras del PDF no tienen caracteres hebreos: en ese caso se usa la ventana de imprimir del navegador
    if (/[\u0590-\u05FF]/.test(JSON.stringify(cv) + t.pProfile)) { printPreview(); return; }
    setMaking(true);
    try {
      const { downloadCvPdf } = await import("@/lib/cvPdf");
      downloadCvPdf(cv, { photo, logo, color, labels: { profile: t.pProfile, experience: t.pExperience, education: t.pEducation, skills: t.pSkills, langs: t.pLangs, name: t.phName, job: t.pJob, degree: t.pDegree, file: t.fileName } });
    } catch {
      alert(t.pdfError);
    } finally { setMaking(false); }
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setCv(prev => ({ ...prev, [key]: value }));
  const setEdu = (i: number, key: Exclude<keyof Education, "id">, value: string) => set("education", cv.education.map((e, j) => j === i ? { ...e, [key]: value } : e));
  const setJob = (i: number, key: Exclude<keyof Job, "id">, value: string) => set("jobs", cv.jobs.map((e, j) => j === i ? { ...e, [key]: value } : e));

  // La foto se reduce a 600 px como mucho: se ve nítida en el CV y ocupa poco al guardarla
  const pickPhoto = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", .85));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert(t.photoError); };
    img.src = url;
  };

  // En el iPhone la ventana de imprimir no espera: la hoja se deja preparada
  // hasta que el navegador avisa de que ha terminado ("afterprint")
  const printPreview = () => {
    const root = document.documentElement;
    const done = () => { root.classList.remove("printing-cv"); window.removeEventListener("afterprint", done); };
    root.classList.add("printing-cv");
    window.addEventListener("afterprint", done);
    window.print();
  };

  const reset = () => {
    if (!confirm(t.resetConfirm)) return;
    setCv(empty); setPhoto(null); setLogo(null); setColor(COLORS[0]);
  };

  const contact = [cv.email, cv.phone, cv.location].filter(Boolean);

  return <main>
    <PageHero
      eyebrow={t.eyebrow}
      lines={t.lines}
      subtitle={t.subtitle}
      bottomHref="#editor"
    />

    <section id="editor" className="section-pad"><div className="section-wrap">
      <SectionHeading label={t.label} />
      <div className="builder">
        <div className="builder-form">
          <Reveal><div className="builder-group" style={{ borderTop: 0, paddingTop: 0 }}>
            <h3>{t.personal} <em>{t.personalEm}</em></h3>
            <div className="photo-picker">
              <div className="thumb">{photo ? <img src={photo} alt={t.yourPhoto} /> : t.noPhoto}</div>
              <Button variant="outlineLuxury" asChild><label htmlFor="cv-photo">{t.uploadPhoto}</label></Button>
              <input id="cv-photo" type="file" accept="image/*" className="sr-only" onChange={e => pickPhoto(e.target.files?.[0])} />
              {photo && <Button variant="text" onClick={() => setPhoto(null)}>{t.remove}</Button>}
            </div>
            <Field id="cv-name" label={t.fullName} value={cv.name} onChange={v => set("name", v)} placeholder={t.fullNamePh} />
            <Field id="cv-role" label={t.role} value={cv.role} onChange={v => set("role", v)} placeholder={t.rolePh} />
            <div className="builder-two">
              <Field id="cv-email" type="email" label={t.email} value={cv.email} onChange={v => set("email", v)} placeholder={t.emailPh} />
              <Field id="cv-phone" type="tel" label={t.phone} value={cv.phone} onChange={v => set("phone", v)} placeholder={t.phonePh} />
            </div>
            <Field id="cv-location" label={t.location} value={cv.location} onChange={v => set("location", v)} placeholder={t.locationPh} />
          </div></Reveal>

          <Reveal><div className="builder-group">
            <h3>{t.brand} <em>{t.brandEm}</em> <span className="optional">{t.optional}</span></h3>
            <p className="form-note">{t.brandNote}</p>
            <div className="photo-picker">
              <div className="thumb logo-thumb">{logo ? <img src={logo} alt={t.yourLogo} /> : t.noLogo}</div>
              <Button variant="outlineLuxury" asChild><label htmlFor="cv-logo">{t.uploadLogo}</label></Button>
              <input id="cv-logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={e => pickLogo(e.target.files?.[0])} />
              {logo && <Button variant="text" onClick={() => setLogo(null)}>{t.remove}</Button>}
            </div>
            <div className="color-picker" role="group" aria-label={t.colorGroup}>
              {COLORS.map(c => <button key={c} type="button" className="color-dot" style={{ background: c }} aria-label={t.color(c)} aria-pressed={color === c} onClick={() => setColor(c)} />)}
              <label className="color-custom">{t.otherColor}<input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
            </div>
          </div></Reveal>

          <Reveal><div className="builder-group">
            <h3>{t.profile}</h3>
            <Field id="cv-summary" textarea label={t.summary} value={cv.summary} onChange={v => set("summary", v)} placeholder={t.summaryPh} />
          </div></Reveal>

          <Reveal><div className="builder-group">
            <h3>{t.education}</h3>
            <AnimatePresence initial={false}>{cv.education.map((e, i) => <motion.div key={e.id} className="builder-entry" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <button type="button" className="icon-button" aria-label={t.removeEdu} onClick={() => set("education", cv.education.filter((_, j) => j !== i))}><X /></button>
              <Field id={`edu-t-${i}`} label={t.degree} value={e.title} onChange={v => setEdu(i, "title", v)} placeholder={t.degreePh} />
              <div className="builder-two">
                <Field id={`edu-c-${i}`} label={t.center} value={e.center} onChange={v => setEdu(i, "center", v)} placeholder={t.centerPh} />
                <Field id={`edu-d-${i}`} label={t.dates} value={e.dates} onChange={v => setEdu(i, "dates", v)} placeholder={t.eduDatesPh} />
              </div>
            </motion.div>)}</AnimatePresence>
            <Button variant="outlineLuxury" onClick={() => set("education", [...cv.education, { id: newId(), title: "", center: "", dates: "" }])}><Plus /> {t.addEdu}</Button>
          </div></Reveal>

          <Reveal><div className="builder-group">
            <h3>{t.experience}</h3>
            <AnimatePresence initial={false}>{cv.jobs.map((e, i) => <motion.div key={e.id} className="builder-entry" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <button type="button" className="icon-button" aria-label={t.removeJob} onClick={() => set("jobs", cv.jobs.filter((_, j) => j !== i))}><X /></button>
              <Field id={`job-t-${i}`} label={t.job} value={e.title} onChange={v => setJob(i, "title", v)} placeholder={t.jobPh} />
              <div className="builder-two">
                <Field id={`job-c-${i}`} label={t.company} value={e.company} onChange={v => setJob(i, "company", v)} placeholder={t.companyPh} />
                <Field id={`job-d-${i}`} label={t.dates} value={e.dates} onChange={v => setJob(i, "dates", v)} placeholder={t.jobDatesPh} />
              </div>
              <Field id={`job-x-${i}`} label={t.desc} value={e.desc} onChange={v => setJob(i, "desc", v)} placeholder={t.descPh} />
            </motion.div>)}</AnimatePresence>
            <Button variant="outlineLuxury" onClick={() => set("jobs", [...cv.jobs, { id: newId(), title: "", company: "", dates: "", desc: "" }])}><Plus /> {t.addJob}</Button>
          </div></Reveal>

          <Reveal><div className="builder-group">
            <h3>{t.skills} <em>{t.skillsEm}</em></h3>
            <Field id="cv-skills" label={t.skillsLabel} value={cv.skills} onChange={v => set("skills", v)} placeholder={t.skillsPh} />
            <Field id="cv-langs" label={t.langsLabel} value={cv.langs} onChange={v => set("langs", v)} placeholder={t.langsPh} />
          </div></Reveal>

          <div className="builder-group hero-actions" style={{ marginTop: 0 }}>
            <Button variant="luxury" size="lg" onClick={downloadPdf} disabled={making} data-cursor="PDF"><Download /> {making ? t.making : t.download}</Button>
            <Button variant="outlineLuxury" size="lg" onClick={printPreview}><Printer /> {t.print}</Button>
            <Button variant="text" size="lg" onClick={reset}><RotateCcw /> {t.reset}</Button>
            <p className="form-note" style={{ flexBasis: "100%" }}>{t.downloadNote}</p>
          </div>
        </div>

        <div className="builder-preview-wrap">
          <span className="eyebrow" style={{ display: "block", marginBottom: 16 }}>{t.preview}</span>
          <motion.article className="cv-paper" style={{ "--cv-accent": color } as React.CSSProperties} aria-label={t.previewLabel} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .9, ease: [.22, 1, .36, 1] }}>
            <header className="cv-paper-head">
              <div>
                {logo && <img className="cv-paper-logo" src={logo} alt="" />}
                <h2>{cv.name || <span className="placeholder">{t.phName}</span>}</h2>
                <p>{cv.role || <span className="placeholder">{t.phRole}</span>}</p>
                {!!contact.length && <div className="cv-paper-contact">{contact.map(c => <span key={c}>{c}</span>)}</div>}
              </div>
              {photo && <img src={photo} alt="" />}
            </header>
            <div className="cv-paper-section"><h4>{t.pProfile}</h4><p>{cv.summary || <span className="placeholder">{t.pSummary}</span>}</p></div>
            <div className="cv-paper-section"><h4>{t.pExperience}</h4>{cv.jobs.length
              ? cv.jobs.map(j => <div className="cv-paper-item" key={j.id}><strong>{j.title || t.pJob}</strong><span>{[j.company, j.dates].filter(Boolean).join(" · ")}</span>{j.desc && <p>{j.desc}</p>}</div>)
              : <p className="placeholder">{t.pNoJobs}</p>}</div>
            <div className="cv-paper-section"><h4>{t.pEducation}</h4>{cv.education.length
              ? cv.education.map(e => <div className="cv-paper-item" key={e.id}><strong>{e.title || t.pDegree}</strong><span>{[e.center, e.dates].filter(Boolean).join(" · ")}</span></div>)
              : <p className="placeholder">{t.pNoEdu}</p>}</div>
            {!!list(cv.skills).length && <div className="cv-paper-section"><h4>{t.pSkills}</h4><div className="cv-paper-chips">{list(cv.skills).map(s => <span key={s}>{s}</span>)}</div></div>}
            {!!list(cv.langs).length && <div className="cv-paper-section"><h4>{t.pLangs}</h4><div className="cv-paper-chips">{list(cv.langs).map(s => <span key={s}>{s}</span>)}</div></div>}
          </motion.article>
        </div>
      </div>
    </div></section>
  </main>;
}
