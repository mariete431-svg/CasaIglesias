import { useMemo, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { marked } from "marked";
import { Reveal, useMotionPreference } from "@/components/EditorialEffects";
import { usePageTitle } from "@/components/SiteChrome";
import { formatPostDate, isoDay, posts } from "@/lib/blog";
import NotFound from "@/pages/NotFound";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Convierte el texto del artículo en HTML. Los enlaces internos (/cv, /blog/…) llevan la base de la web. */
function toHtml(body: string) {
  const html = marked.parse(body, { async: false, gfm: true }) as string;
  return html.replace(/href="\/(?!\/)/g, `href="${BASE}/`);
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const index = posts.findIndex(p => p.slug === slug);
  const post = posts[index];
  const html = useMemo(() => post ? toHtml(post.body) : "", [post]);
  const navigate = useNavigate();
  const reduced = useMotionPreference();
  usePageTitle(post ? `${post.title} — Casa Iglesias` : "Artículo no encontrado — Casa Iglesias");
  if (!post) return <NotFound />;

  const newer = posts[index - 1];
  const older = posts[index + 1];

  // Los enlaces internos del artículo cambian de página sin recargar la web
  const onArticleClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (!link || !href || !href.startsWith(`${BASE}/`) || link.target || event.metaKey || event.ctrlKey) return;
    // Los archivos (sitemap.xml, feed.xml, PDF…) se abren tal cual
    if (/\.[a-z0-9]+(?:[?#].*)?$/i.test(href)) return;
    event.preventDefault();
    navigate(href.slice(BASE.length));
  };

  return <main>
    <article className="post">
      <header className="post-header section-wrap">
        <motion.p className="eyebrow hero-eyebrow" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
          <Link to="/blog" className="post-back"><ArrowLeft size={14} strokeWidth={1.5} /> BLOG</Link>
          <span className="eyebrow-line" /> <time dateTime={isoDay(post.date)}>{formatPostDate(post.date).toUpperCase()}</time> · {post.minutes} MIN
        </motion.p>
        <motion.h1 initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .9, ease: [.22, 1, .36, 1] }}>{post.title}</motion.h1>
        <motion.p className="post-lead" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3, duration: .8 }}>{post.summary}</motion.p>
        {post.tags.length > 0 && <motion.p className="post-tags" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45, duration: .6 }}>{post.tags.map(t => <span key={t}>{t}</span>)}</motion.p>}
      </header>

      <div className="section-wrap">
        <div className="post-body" onClick={onArticleClick} dangerouslySetInnerHTML={{ __html: html }} />

        <Reveal><footer className="post-footer">
          <p className="post-signature">Mario Iglesias · Escrito con ayuda de IA (Claude). ¿Dudas o sugerencias? <a href="mailto:hola@casaiglesias.es">Escríbeme</a>.</p>
          <nav className="post-nav" aria-label="Más artículos">
            {older ? <Link to={`/blog/${older.slug}`} className="post-nav-link"><small><ArrowLeft size={13} /> ANTERIOR</small><span>{older.title}</span></Link> : <span />}
            {newer ? <Link to={`/blog/${newer.slug}`} className="post-nav-link post-nav-next"><small>SIGUIENTE <ArrowRight size={13} /></small><span>{newer.title}</span></Link> : <Link to="/blog" className="post-nav-link post-nav-next"><small>BLOG <ArrowUpRight size={13} /></small><span>Todos los artículos</span></Link>}
          </nav>
        </footer></Reveal>
      </div>
    </article>
  </main>;
}
