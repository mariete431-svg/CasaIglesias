// Guarda una foto del día de la cuenta de Instagram (seguidores, me gusta, mejores publicaciones)
// a partir del feed de Behold. Lo llama pg_cron cada 6 horas; el panel de Mario lo lee.
import { createClient } from "jsr:@supabase/supabase-js@2";

const FEED = "https://feeds.behold.so/seeFyk5efICRESP1Mi3n";

type Post = { permalink?: string; likeCount?: number; commentsCount?: number; timestamp?: string; caption?: string; prunedCaption?: string; mediaUrl?: string; sizes?: { small?: { mediaUrl?: string } } };

Deno.serve(async () => {
  try {
    const res = await fetch(FEED);
    if (!res.ok) return Response.json({ ok: false, status: res.status }, { status: 502 });
    const d = await res.json();
    const posts: Post[] = Array.isArray(d.posts) ? d.posts : [];
    const top = [...posts].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)).slice(0, 3).map(p => ({
      url: p.permalink, likes: p.likeCount ?? 0, comments: p.commentsCount ?? 0, at: p.timestamp,
      caption: (p.prunedCaption || p.caption || "").slice(0, 120), img: p.sizes?.small?.mediaUrl || p.mediaUrl,
    }));
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Atlantic/Canary" });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("instagram_daily").upsert({
      day, followers: d.followersCount ?? null, follows: d.followsCount ?? null, posts: posts.length,
      likes: posts.reduce((s, p) => s + (p.likeCount ?? 0), 0), comments: posts.reduce((s, p) => s + (p.commentsCount ?? 0), 0),
      last_post: posts[0]?.timestamp ?? null, top, updated_at: new Date().toISOString(),
    });
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, day });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
