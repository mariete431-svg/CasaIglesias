import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/EditorialEffects";
import { PageHero, SectionHeading, usePageTitle } from "@/components/SiteChrome";
import { formatPostDate, isoDay, posts } from "@/lib/blog";
import { asset } from "@/lib/asset";

export default function BlogPage() {
  usePageTitle("Blog — Mario Iglesias");
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => [...new Set(posts.flatMap(p => p.tags))].sort((a, b) => a.localeCompare(b, "es")), []);
  const visible = tag ? posts.filter(p => p.tags.includes(tag)) : posts;

  return <main>
    <PageHero
      eyebrow="BLOG — DISEÑO WEB"
      lines={["Mario", "Iglesias."]}
      subtitle={<>Tengo 24 años y hago diseños web. Es mi primera vez en todo esto y estoy aprendiendo. Aquí cuento lo que voy haciendo en esta web.</>}
      actions={<>
        <Button variant="luxury" size="lg" asChild><a href="#articulos">Leer el blog <ArrowUpRight /></a></Button>
        <Button variant="outlineLuxury" size="lg" asChild><a href={asset("blog/feed.xml")}>RSS <Rss /></a></Button>
      </>}
      bottomHref="#articulos"
    />

    <section id="articulos" className="section-pad"><div className="section-wrap">
      <SectionHeading label={`01 / ${posts.length} ARTÍCULOS`} />
      {tags.length > 1 && <Reveal><div className="filter-row blog-tags" role="group" aria-label="Filtrar por tema">
        <button type="button" className="chip" aria-pressed={tag === null} onClick={() => setTag(null)}>Todos</button>
        {tags.map(t => <button key={t} type="button" className="chip" aria-pressed={tag === t} onClick={() => setTag(current => current === t ? null : t)}>{t}</button>)}
      </div></Reveal>}

      <ol className="post-list">
        {visible.map((post, i) => <li key={post.slug}><Reveal delay={Math.min(i, 4) * .04}>
          <Link className="post-row" to={`/blog/${post.slug}`}>
            <span className="post-meta"><time dateTime={isoDay(post.date)}>{formatPostDate(post.date)}</time><span>{post.minutes} min de lectura</span></span>
            <span className="post-main">
              <strong>{post.title}</strong>
              <span className="post-summary">{post.summary}</span>
              {post.tags.length > 0 && <span className="post-tags">{post.tags.map(t => <span key={t}>{t}</span>)}</span>}
            </span>
            <ArrowUpRight className="project-arrow" strokeWidth={1.25} aria-hidden="true" />
          </Link>
        </Reveal></li>)}
      </ol>
    </div></section>
  </main>;
}
