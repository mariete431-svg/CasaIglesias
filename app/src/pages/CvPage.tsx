import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic, ProfileParallax, Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { asset } from "@/lib/asset";
import { CV_PDF } from "@/pages/Home";

const experience = [
  { date: "Marzo 2024 — Dic. 2025", role: "Ayudante de cocina", text: "Restaurante Marietta, Gourmetland. Adeje, Tenerife." },
  { date: "Marzo 2023 — Oct. 2023", role: "Atención al cliente", text: "Gestión de cobros, pedidos y resolución de problemas. Perfumerías Primor, Goya, Madrid." },
  { date: "Marzo 2022 — Ene. 2023", role: "Operario de restaurante", text: "Burger King, Collado Villalba, Madrid." },
  { date: "Marzo 2018 — 2021", role: "Auxiliar en fiestas de cumpleaños", text: "Trato con familias, organización y animación." },
  { date: "Abril 2019", role: "Ayudante en limpieza de portales y urbanizaciones", text: "Sersinor, Collado Villalba." },
];
const skills = ["HTML", "CSS", "JavaScript", "Git y GitHub", "Inglés — nivel medio", "Atención al cliente"];

export default function CvPage() {
  usePageTitle("CV — Casa Iglesias");
  return <main>
    <PageHero
      eyebrow="CV · 2026 — MARIO IGLESIAS MARTÍNEZ"
      lines={["Currículum", "vitae."]}
      subtitle={<>Mario Iglesias Martínez. Atención al cliente y trabajo administrativo.<br className="desktop-break" /> Aprendiendo programación web.</>}
      actions={<>
        <Magnetic><Button variant="luxury" size="lg" asChild><a href={CV_PDF} target="_blank" rel="noopener noreferrer" data-cursor="Bajar">Descargar CV (PDF) <ArrowUpRight /></a></Button></Magnetic>
        <Magnetic><Button variant="outlineLuxury" size="lg" asChild><a href="mailto:hola@casaiglesias.es" data-cursor="Escribir">Escribirme <ArrowUpRight /></a></Button></Magnetic>
        <Magnetic><Button variant="outlineLuxury" size="lg" onClick={() => window.print()} data-cursor="Imprimir">Imprimir <Printer /></Button></Magnetic>
      </>}
      bottomHref="#sobre-mi"
    />

    <section id="sobre-mi" className="profile-section section-pad"><div className="section-wrap">
      <SectionHeading label="01 / SOBRE MÍ" />
      <div className="cv-photo-row">
        <ProfileParallax><Reveal><div className="portrait"><motion.img src={asset("foto.jpg")} alt="Retrato de Mario Iglesias Martínez" loading="lazy" initial={{ scale: 1.14 }} whileInView={{ scale: 1.03 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: [.2, .7, .2, 1] }} /></div></Reveal></ProfileParallax>
        <Reveal>
          <p className="cv-lead">Soy un chico trabajador, con ganas de aprender. Muy responsable y con facilidad para trabajar en grupo y <em>comunicarme.</em></p>
          <p className="cv-text">Profesional orientado a la atención al cliente y al trabajo administrativo básico, con experiencia en trato directo con clientes, gestión de incidencias y trabajo bajo presión.</p>
          <p className="cv-text">Buen manejo de herramientas digitales y alta capacidad de aprendizaje.</p>
        </Reveal>
      </div>
    </div></section>

    <section className="section-pad"><div className="section-wrap">
      <SectionHeading label="02 / EXPERIENCIA" />
      <Reveal><div className="intro-row"><h2>Donde he<br /><em>aprendido.</em></h2><p>Cada puesto me ha enseñado a cuidar a las personas y los detalles.</p></div></Reveal>
      <div className="career-list">
        <motion.span className="career-timeline" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: .1 }} transition={{ duration: 1.8, ease: [.2, .7, .2, 1] }} />
        {experience.map((item, i) => <Reveal key={item.role} delay={i * .04}><div className="cv-entry">
          <span className="cv-entry-date">{item.date}</span>
          <div><h3>{item.role}</h3><p>{item.text}</p></div>
        </div></Reveal>)}
      </div>

      <Reveal><div className="cv-block">
        <span className="eyebrow">03 / FORMACIÓN</span>
        <div className="cv-entry"><span className="cv-entry-date">Sep. 2015 — Jul. 2019</span><div><h3>Graduado en Educación Secundaria Obligatoria (ESO)</h3><p>IES María Guerrero, Collado Villalba.</p></div></div>
      </div></Reveal>

      <Reveal><div className="cv-block">
        <span className="eyebrow">04 / CURSOS</span>
        <div className="cv-entry"><span className="cv-entry-date">2025</span><div><h3>Inside LVMH <em>Certificate</em></h3><p>Operations & Supply Chain, Retail & Client Experience — curso online.</p></div></div>
      </div></Reveal>
    </div></section>

    <section className="skills-section section-pad"><div className="section-wrap">
      <SectionHeading label="05 / HABILIDADES" />
      <Reveal><h2 style={{ margin: "0 0 60px" }}>Lo que <em>sé hacer.</em></h2></Reveal>
      <ul className="cv-skills">{skills.map((skill, i) => <Reveal key={skill} delay={i * .05}><li><span>0{i + 1}</span>{skill}</li></Reveal>)}</ul>
      <Reveal><div className="facts">
        <div><span>DISPONIBILIDAD GEOGRÁFICA</span><strong>España</strong></div>
        <div><span>DISPONIBILIDAD HORARIA</span><strong>Total</strong></div>
        <div><span>UBICACIÓN</span><strong>Adeje, Santa Cruz de Tenerife</strong></div>
      </div></Reveal>
    </div></section>

    <section className="contact-section section-pad no-print"><div className="section-wrap"><Reveal>
      <SectionHeading label="06 / CONTACTO" />
      <h2 style={{ fontSize: "clamp(72px, 16vw, 230px)" }}>¿Hablamos<span>?</span></h2>
      <a className="contact-email" href="mailto:hola@casaiglesias.es">hola@casaiglesias.es <ArrowUpRight strokeWidth={1.2} /></a>
      <div className="contact-links"><Link to="/#reservar">Reservar una reunión <ArrowUpRight size={16} /></Link><a href={CV_PDF} target="_blank" rel="noopener noreferrer">Descargar PDF <ArrowUpRight size={16} /></a></div>
    </Reveal></div></section>
  </main>;
}
