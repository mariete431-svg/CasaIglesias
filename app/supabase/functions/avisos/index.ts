// Avisos por email de la web de Casa Iglesias (todos salen por Resend).
//
// La llama la base de datos:
//   { tipo: "contact_messages" | "briefs" | "subscribers", id }  → aviso a Mario (y bienvenida al suscriptor)
//   { tipo: "recordatorios" }  (cada hora, pg_cron)               → recordatorio 24 h antes de cada reunión
// La llama el panel /admin (con la sesión de Mario):
//   { tipo: "boletin", asunto, texto }                            → boletín a los suscriptores
// Y los suscriptores, desde el enlace del email:
//   GET ?baja=<token>                                              → darse de baja
//
// Es segura aunque sea pública: cada aviso se "reserva" con notified_at / reminded_at,
// así que nunca se manda dos veces, y el boletín exige una sesión de administrador.
//
// Mientras no haya dominio propio, Resend solo deja escribir a Mario: los emails a
// clientes (recordatorio, bienvenida, boletín) se activan solos al poner el secreto
// RESEND_FROM, por ejemplo  "Casa Iglesias <hola@casaiglesias.es>".

import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const WEB = "https://casaiglesias.es/";
const PANEL_URL = `${WEB}admin/`;
const FN_URL = `${URL_SB}/functions/v1/avisos`;
const TZ = "Atlantic/Canary";
const FROM_MARIO = "Mi web <onboarding@resend.dev>";
const FROM_CLIENTS = Deno.env.get("RESEND_FROM") ?? "";

const INK = "#3d1119";
const CREAM = "#fbf6e6";
const BUTTER = "#fbf0b3";
const MUTED = "#7a4b53";

const TYPES: Record<string, string> = {
  primera: "Primera reunión",
  presupuesto: "Presupuesto",
  seguimiento: "Seguimiento",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
const oneLine = (value: unknown) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:${MUTED};vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:${INK}">${value}</td></tr>`;

function layout(pill: string, title: string, body: string, footer = "") {
  return `
  <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${INK};padding:32px 16px">
    <div style="max-width:540px;margin:0 auto;background:${CREAM};border-radius:20px;padding:32px">
      <p style="margin:0 0 8px"><span style="display:inline-block;background:${BUTTER};color:${INK};font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 12px;border-radius:999px">${esc(pill)}</span></p>
      <h1 style="margin:14px 0 18px;color:${INK};font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.2">${esc(title)}</h1>
      ${body}
      ${footer ? `<p style="margin:24px 0 0;color:${MUTED};font-size:13px;line-height:1.5">${footer}</p>` : ""}
    </div>
  </div>`;
}
const button = (href: string, label: string) =>
  `<p style="margin:26px 0 0"><a href="${href}" style="display:inline-block;background:${INK};color:${BUTTER};text-decoration:none;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;
const paragraphs = (text: string) =>
  esc(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;color:${INK};font-size:16px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`).join("");

async function send(payload: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("Resend ha fallado:", res.status, await res.text());
  return res.ok;
}

async function adminEmails() {
  const { data } = await supabase.from("admins").select("email");
  return (data ?? []).map((a) => a.email as string);
}

/** Marca la fila como avisada; si ya lo estaba, devuelve null (otra llamada ganó). */
async function claim(table: string, id: string, columns: string) {
  const { data } = await supabase.from(table).update({ notified_at: new Date().toISOString() })
    .eq("id", id).is("notified_at", null).select(columns).maybeSingle();
  return data as Record<string, unknown> | null;
}
const release = (table: string, id: string) => supabase.from(table).update({ notified_at: null }).eq("id", id);

/* ---------- Mensaje del formulario de contacto ---------- */
async function contactMessage(id: string) {
  const m = await claim("contact_messages", id, "id, name, email, kind, message");
  if (!m) return json({ ok: true, skipped: true });
  const ok = await send({
    from: FROM_MARIO, to: await adminEmails(), reply_to: m.email,
    subject: oneLine(`✉️ Mensaje de ${m.name}${m.kind ? ` · ${m.kind}` : ""}`),
    html: layout("Nuevo mensaje", String(m.name), `
      <table style="border-collapse:collapse;font-size:15px">
        ${row("Email", `<a href="mailto:${esc(m.email)}" style="color:${INK}">${esc(m.email)}</a>`)}
        ${m.kind ? row("Busca", esc(m.kind)) : ""}
      </table>
      <div style="margin-top:18px">${paragraphs(String(m.message))}</div>
      ${button(PANEL_URL, "Abrir mi panel")}`, `Si respondes a este email, le escribirás directamente a ${esc(m.name)}.`),
    text: `Mensaje de ${m.name} (${m.email})\n${m.kind ? `Busca: ${m.kind}\n` : ""}\n${m.message}`,
  });
  if (!ok) { await release("contact_messages", id); return json({ error: "email_failed" }, 502); }
  return json({ ok: true });
}

/* ---------- Cuestionario de cliente ---------- */
const BRIEF_LABELS: Record<string, string> = {
  sector: "Sector", hace: "Qué hace el negocio", clientes: "Sus clientes", objetivo: "Qué quiere conseguir",
  servicio: "Qué necesita", paginas: "Páginas o secciones", marca: "¿Tiene logo y colores?", estilo: "Estilo que le gusta",
  ejemplos: "Webs que le gustan", textos: "¿Tiene textos y fotos?", plazo: "Para cuándo", presupuesto: "Presupuesto",
  web: "Web o redes actuales", telefono: "Teléfono", otros: "Algo más",
};
async function brief(id: string) {
  const b = await claim("briefs", id, "id, name, email, business, answers");
  if (!b) return json({ ok: true, skipped: true });
  const answers = (b.answers ?? {}) as Record<string, unknown>;
  const lines = Object.entries(answers).filter(([, v]) => String(v ?? "").trim())
    .map(([k, v]) => [BRIEF_LABELS[k] ?? k, String(v)] as const);
  const ok = await send({
    from: FROM_MARIO, to: await adminEmails(), reply_to: b.email,
    subject: oneLine(`📝 Cuestionario: ${b.business} (${b.name})`),
    html: layout("Cuestionario recibido", String(b.business), `
      <table style="border-collapse:collapse;font-size:15px">
        ${row("Nombre", esc(b.name))}
        ${row("Email", `<a href="mailto:${esc(b.email)}" style="color:${INK}">${esc(b.email)}</a>`)}
        ${lines.map(([k, v]) => row(k, esc(v).replace(/\n/g, "<br>"))).join("")}
      </table>
      ${button(PANEL_URL, "Abrir mi panel")}`, "Tienes todas las respuestas también en tu panel, en la pestaña Mensajes."),
    text: [`Cuestionario de ${b.name} (${b.email}) · ${b.business}`, "", ...lines.map(([k, v]) => `${k}: ${v}`)].join("\n"),
  });
  if (!ok) { await release("briefs", id); return json({ error: "email_failed" }, 502); }
  return json({ ok: true });
}

/* ---------- Nuevo suscriptor del boletín ---------- */
const unsubscribeUrl = (token: unknown) => `${FN_URL}?baja=${token}`;
async function subscriber(id: string) {
  const s = await claim("subscribers", id, "id, email, token");
  if (!s) return json({ ok: true, skipped: true });
  await send({
    from: FROM_MARIO, to: await adminEmails(),
    subject: oneLine(`💌 Nuevo suscriptor del boletín: ${s.email}`),
    html: layout("Boletín", "Alguien se ha apuntado", `<p style="color:${INK};font-size:16px">${esc(s.email)}</p>${button(PANEL_URL, "Ver suscriptores")}`),
    text: `Nuevo suscriptor del boletín: ${s.email}`,
  });
  if (FROM_CLIENTS) {
    const ok = await send({
      from: FROM_CLIENTS, to: [s.email], reply_to: (await adminEmails())[0],
      subject: "Bienvenido al boletín de Casa Iglesias",
      html: layout("Bienvenida", "Gracias por apuntarte", paragraphs(
        "Una vez al mes te mandaré un consejo práctico para cuidar la web y la imagen de tu negocio: cosas sencillas que puedes hacer tú en diez minutos.\n\nNada de publicidad ni de correos cada semana. Si algún día no te sirve, te das de baja con un clic.\n\nUn saludo,\nMario · Casa Iglesias",
      ) + button(WEB, "Visitar la web"), `<a href="${unsubscribeUrl(s.token)}" style="color:${MUTED}">Darme de baja</a>`),
      text: `Gracias por apuntarte al boletín de Casa Iglesias. Una vez al mes, un consejo práctico.\n\nDarte de baja: ${unsubscribeUrl(s.token)}`,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl(s.token)}>` },
    });
    if (ok) await supabase.from("subscribers").update({ welcomed_at: new Date().toISOString() }).eq("id", id);
  }
  return json({ ok: true });
}

/* ---------- Recordatorios 24 h antes ---------- */
async function reminders() {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600_000);
  const { data: due } = await supabase.from("bookings").select("id")
    .in("status", ["pendiente", "confirmada"]).is("reminded_at", null)
    .gt("starts_at", now.toISOString()).lte("starts_at", until.toISOString());
  const admins = await adminEmails();
  let sent = 0;
  for (const { id } of due ?? []) {
    const { data: b } = await supabase.from("bookings").update({ reminded_at: new Date().toISOString() })
      .eq("id", id).is("reminded_at", null)
      .select("id, name, email, phone, topic, starts_at, meeting_type").maybeSingle();
    if (!b) continue;
    const when = new Date(b.starts_at);
    const day = fmtDay(when), time = fmtTime(when), type = TYPES[b.meeting_type] ?? "Reunión";
    // Para Mario: quién viene mañana y de qué
    const ok = await send({
      from: FROM_MARIO, to: admins, reply_to: b.email,
      subject: oneLine(`⏰ Mañana: ${type.toLowerCase()} con ${b.name} · ${time}`),
      html: layout("Recordatorio", `${type} con ${b.name}`, `
        <p style="margin:0 0 18px;color:${INK};font-size:18px"><strong>${esc(day)} · ${esc(time)}</strong> <span style="color:${MUTED}">(hora de Canarias)</span></p>
        <table style="border-collapse:collapse;font-size:15px">
          ${row("Email", `<a href="mailto:${esc(b.email)}" style="color:${INK}">${esc(b.email)}</a>`)}
          ${b.phone ? row("Teléfono", `<a href="tel:${esc(b.phone)}" style="color:${INK}">${esc(b.phone)}</a>`) : ""}
          ${b.topic ? row("Tema", esc(b.topic).replace(/\n/g, "<br>")) : ""}
        </table>${button(PANEL_URL, "Abrir mi panel")}`,
        FROM_CLIENTS ? `A ${esc(b.name)} también le ha llegado su recordatorio.` : "Cuando tengas dominio propio, este recordatorio también le llegará al cliente."),
      text: `Mañana: ${type} con ${b.name}\n${day} · ${time}\n${b.email}${b.phone ? ` · ${b.phone}` : ""}`,
    });
    // Para el cliente (solo con dominio propio)
    if (FROM_CLIENTS) {
      await send({
        from: FROM_CLIENTS, to: [b.email], reply_to: admins[0],
        subject: oneLine(`Recordatorio: nuestra reunión es mañana a las ${time}`),
        html: layout("Recordatorio", `Hasta mañana, ${String(b.name).split(" ")[0]}`, paragraphs(
          `Te recuerdo nuestra reunión (${type.toLowerCase()}): ${day} a las ${time}, hora de Canarias. Dura unos 30 minutos.\n\nSi no puedes venir o quieres cambiar la hora, responde a este email y lo organizamos.\n\nMario · Casa Iglesias`,
        )),
        text: `Recordatorio: ${type}, ${day} a las ${time} (hora de Canarias). Si necesitas cambiarla, responde a este email.`,
      });
    }
    if (ok) sent++;
    else await supabase.from("bookings").update({ reminded_at: null }).eq("id", b.id);
  }
  return json({ ok: true, sent });
}

/* ---------- Boletín mensual (solo Mario, con su sesión) ---------- */
async function newsletter(req: Request, asunto: unknown, texto: unknown) {
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: isAdmin } = await userClient.rpc("is_admin");
  if (isAdmin !== true) return json({ error: "forbidden" }, 403);
  if (typeof asunto !== "string" || typeof texto !== "string" || !asunto.trim() || !texto.trim() || asunto.length > 150 || texto.length > 6000) {
    return json({ error: "bad_request" }, 400);
  }
  if (!FROM_CLIENTS) return json({ error: "sin_dominio" }, 409);
  const { data: subs } = await supabase.from("subscribers").select("email, token").eq("unsubscribed", false);
  const replyTo = (await adminEmails())[0];
  const emails = (subs ?? []).map((s) => ({
    from: FROM_CLIENTS, to: [s.email], reply_to: replyTo, subject: oneLine(asunto),
    html: layout("Consejo del mes", asunto, paragraphs(texto) + button(WEB, "Visitar Casa Iglesias"),
      `Recibes este boletín porque te apuntaste en la web de Casa Iglesias. <a href="${unsubscribeUrl(s.token)}" style="color:${MUTED}">Darme de baja</a>`),
    text: `${texto}\n\nDarte de baja: ${unsubscribeUrl(s.token)}`,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl(s.token)}>` },
  }));
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify(emails.slice(i, i + 100)),
    });
    if (res.ok) sent += emails.slice(i, i + 100).length;
    else console.error("Resend batch ha fallado:", res.status, await res.text());
  }
  return json({ ok: true, sent, total: emails.length });
}

/* ---------- Baja del boletín ---------- */
async function unsubscribe(token: string) {
  const page = (title: string, text: string) => new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      layout("Boletín", title, paragraphs(text) + button(WEB, "Volver a la web")),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page("Enlace no válido", "Este enlace de baja no es correcto.");
  await supabase.from("subscribers").update({ unsubscribed: true }).eq("token", token);
  return page("Te has dado de baja", "Ya no recibirás más el boletín de Casa Iglesias. Gracias por haber estado ahí.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("baja");
    return token ? unsubscribe(token) : json({ error: "not_found" }, 404);
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!Deno.env.get("RESEND_API_KEY")) return json({ error: "not_configured" }, 503);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const { tipo, id } = body;
  if (tipo === "recordatorios") return reminders();
  if (tipo === "boletin") return newsletter(req, body.asunto, body.texto);
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "bad_request" }, 400);
  if (tipo === "contact_messages") return contactMessage(id);
  if (tipo === "briefs") return brief(id);
  if (tipo === "subscribers") return subscriber(id);
  return json({ error: "bad_request" }, 400);
});
