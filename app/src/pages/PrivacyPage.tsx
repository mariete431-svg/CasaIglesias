import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { useLocalize, useT } from "@/i18n";

const EMAIL = "hola@casaiglesias.es";

export default function PrivacyPage() {
  const tr = useT();
  const t = tr.privacy;
  const local = useLocalize();
  usePageTitle(tr.meta.privacy);

  // {email} y {aepd} dentro de los textos se convierten en enlaces
  const rich = (text: string): ReactNode => text.split(/(\{email\}|\{aepd\})/).map((part, i) =>
    part === "{email}" ? <a key={i} href={`mailto:${EMAIL}`}>{EMAIL}</a>
      : part === "{aepd}" ? <a key={i} href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">{t.aepd}<span className="sr-only">{t.newTab}</span></a>
        : <Fragment key={i}>{part}</Fragment>);

  return <main>
    <PageHero eyebrow={t.eyebrow} lines={t.lines} subtitle={t.subtitle} bottomHref="#privacidad" />

    <section id="privacidad" className="section-pad"><div className="section-wrap">
      <SectionHeading label={t.label1} />
      <Reveal><div className="legal">
        {t.translationNote && <p><em>{t.translationNote}</em></p>}
        {t.sections.map(section => <Fragment key={section.h}>
          <h2>{section.h}</h2>
          {section.p?.map(p => <p key={p}>{rich(p)}</p>)}
          {section.list && <ul>{section.list.map(([b, text]) => <li key={b}><strong>{b}</strong> {text}</li>)}</ul>}
          {section.after?.map(p => <p key={p}>{rich(p)}</p>)}
        </Fragment>)}
      </div></Reveal>
    </div></section>

    <section className="section-pad"><div className="section-wrap">
      <SectionHeading label={t.label2} />
      <Reveal><div className="legal">
        {t.legal.map(p => <p key={p}>{rich(p)}</p>)}
        <p><Link to={local("/")}>{t.home}</Link></p>
      </div></Reveal>
    </div></section>
  </main>;
}
