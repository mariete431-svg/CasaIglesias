// Avisos por email de la web de Casa Iglesias (todos salen por Resend).
//
// La llama la base de datos:
//   { tipo: "contact_messages" | "briefs" | "subscribers", id }  → aviso a Mario (y bienvenida al suscriptor)
//   { tipo: "recordatorios" }  (cada hora, pg_cron)               → recordatorio 24 h antes de cada reunión
// La llama el panel /admin (con la sesión de Mario):
//   { tipo: "boletin", asunto, texto }                            → boletín a los suscriptores
// Y los suscriptores, desde el enlace del email:
//   POST ?baja=<token>                                             → darse de baja (desde casaiglesias.es/baja/)
//
// Es segura aunque sea pública: cada aviso se "reserva" con notified_at / reminded_at,
// así que nunca se manda dos veces, y el boletín exige una sesión de administrador.
//
// Los emails a clientes (recordatorio, bienvenida, boletín) salen desde hola@casaiglesias.es.
// Las respuestas van al email de Mario (reply_to). El secreto RESEND_FROM permite cambiar el remitente.

import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const WEB = "https://casaiglesias.es/";
const PANEL_URL = `${WEB}admin/`;
const FN_URL = `${URL_SB}/functions/v1/avisos`;
const TZ = "Atlantic/Canary";
// Dominio casaiglesias.es verificado en Resend (3 oct 2026): los emails ya pueden llegar a los clientes
const FROM_MARIO = "Web Casa Iglesias <avisos@casaiglesias.es>";
const FROM_CLIENTS = Deno.env.get("RESEND_FROM") ?? "Casa Iglesias <hola@casaiglesias.es>";

const INK = "#3d1119";
const CREAM = "#fbf6e6";
const BUTTER = "#fbf0b3";
const MUTED = "#7a4b53";

const TYPES: Record<string, string> = {
  primera: "Primera reunión",
  presupuesto: "Presupuesto",
  seguimiento: "Seguimiento",
};

/* ---------- Textos para el cliente en su idioma (el de la web desde la que reservó o se apuntó) ---------- */
type L = "es" | "en" | "it" | "de" | "fr" | "he";
const LOCALE: Record<L, string> = { es: "es-ES", en: "en-GB", it: "it-IT", de: "de-DE", fr: "fr-FR", he: "he-IL" };
const LANG_NAME: Record<L, string> = { es: "español", en: "inglés", it: "italiano", de: "alemán", fr: "francés", he: "hebreo" };
const asLang = (v: unknown): L => (["es", "en", "it", "de", "fr", "he"] as const).includes(v as L) ? v as L : "es";
const CT: Record<L, {
  types: Record<string, string>; reminderPill: string; reminderSubject: (t: string) => string; reminderTitle: (n: string) => string;
  reminderBody: (type: string, day: string, time: string) => string; reminderText: (type: string, day: string, time: string) => string;
  welcomePill: string; welcomeSubject: string; welcomeTitle: string; welcomeBody: string; visit: string; unsubscribe: string; welcomeText: (u: string) => string;
  newsletterNote: string;
}> = {
  es: {
    types: TYPES, reminderPill: "Recordatorio",
    reminderSubject: (t) => `Recordatorio: nuestra reunión es mañana a las ${t}`,
    reminderTitle: (n) => `Hasta mañana, ${n}`,
    reminderBody: (type, day, time) => `Te recuerdo nuestra reunión (${type.toLowerCase()}): ${day} a las ${time}, hora de Canarias. Dura unos 30 minutos.\n\nSi no puedes venir o quieres cambiar la hora, responde a este email y lo organizamos.\n\nMario · Casa Iglesias`,
    reminderText: (type, day, time) => `Recordatorio: ${type}, ${day} a las ${time} (hora de Canarias). Si necesitas cambiarla, responde a este email.`,
    welcomePill: "Bienvenida", welcomeSubject: "Bienvenido al boletín de Casa Iglesias", welcomeTitle: "Gracias por apuntarte",
    welcomeBody: "Una vez al mes te mandaré un consejo práctico para cuidar la web y la imagen de tu negocio: cosas sencillas que puedes hacer tú en diez minutos.\n\nNada de publicidad ni de correos cada semana. Si algún día no te sirve, te das de baja con un clic.\n\nUn saludo,\nMario · Casa Iglesias",
    visit: "Visitar la web", unsubscribe: "Darme de baja",
    welcomeText: (u) => `Gracias por apuntarte al boletín de Casa Iglesias. Una vez al mes, un consejo práctico.\n\nDarte de baja: ${u}`,
    newsletterNote: "",
  },
  en: {
    types: { primera: "First meeting", presupuesto: "Quote", seguimiento: "Follow-up" }, reminderPill: "Reminder",
    reminderSubject: (t) => `Reminder: our meeting is tomorrow at ${t}`,
    reminderTitle: (n) => `See you tomorrow, ${n}`,
    reminderBody: (type, day, time) => `Just a reminder of our meeting (${type.toLowerCase()}): ${day} at ${time}, Canary Islands time. It lasts about 30 minutes.\n\nIf you can't make it or want to change the time, reply to this email and we'll sort it out.\n\nMario · Casa Iglesias`,
    reminderText: (type, day, time) => `Reminder: ${type}, ${day} at ${time} (Canary Islands time). If you need to change it, reply to this email.`,
    welcomePill: "Welcome", welcomeSubject: "Welcome to the Casa Iglesias newsletter", welcomeTitle: "Thanks for signing up",
    welcomeBody: "Once a month I'll send you one practical tip to look after your business's website and image: simple things you can do yourself in ten minutes.\n\nNo advertising and no weekly emails. If it's ever not useful, you can unsubscribe in one click.\n\nBest,\nMario · Casa Iglesias",
    visit: "Visit the website", unsubscribe: "Unsubscribe",
    welcomeText: (u) => `Thanks for signing up to the Casa Iglesias newsletter. One practical tip a month.\n\nUnsubscribe: ${u}`,
    newsletterNote: "Note: the monthly newsletter is written in Spanish.",
  },
  it: {
    types: { primera: "Primo incontro", presupuesto: "Preventivo", seguimiento: "Aggiornamento" }, reminderPill: "Promemoria",
    reminderSubject: (t) => `Promemoria: il nostro incontro è domani alle ${t}`,
    reminderTitle: (n) => `A domani, ${n}`,
    reminderBody: (type, day, time) => `Ti ricordo il nostro incontro (${type.toLowerCase()}): ${day} alle ${time}, ora delle Canarie. Dura circa 30 minuti.\n\nSe non puoi esserci o vuoi cambiare orario, rispondi a questa email e ci organizziamo.\n\nMario · Casa Iglesias`,
    reminderText: (type, day, time) => `Promemoria: ${type}, ${day} alle ${time} (ora delle Canarie). Se devi cambiarlo, rispondi a questa email.`,
    welcomePill: "Benvenuto", welcomeSubject: "Benvenuto nella newsletter di Casa Iglesias", welcomeTitle: "Grazie per l'iscrizione",
    welcomeBody: "Una volta al mese ti invierò un consiglio pratico per curare il sito e l'immagine della tua attività: cose semplici da fare da solo in dieci minuti.\n\nNiente pubblicità né email ogni settimana. Se un giorno non ti serve più, ti cancelli con un clic.\n\nUn saluto,\nMario · Casa Iglesias",
    visit: "Visita il sito", unsubscribe: "Cancellami",
    welcomeText: (u) => `Grazie per esserti iscritto alla newsletter di Casa Iglesias. Un consiglio pratico al mese.\n\nCancellati: ${u}`,
    newsletterNote: "Nota: la newsletter mensile è scritta in spagnolo.",
  },
  de: {
    types: { primera: "Erstgespräch", presupuesto: "Angebot", seguimiento: "Folgetermin" }, reminderPill: "Erinnerung",
    reminderSubject: (t) => `Erinnerung: Unser Gespräch ist morgen um ${t} Uhr`,
    reminderTitle: (n) => `Bis morgen, ${n}`,
    reminderBody: (type, day, time) => `Ich erinnere dich an unser Gespräch (${type}): ${day} um ${time} Uhr, kanarische Zeit. Es dauert etwa 30 Minuten.\n\nWenn du nicht kannst oder die Uhrzeit ändern möchtest, antworte einfach auf diese E-Mail.\n\nMario · Casa Iglesias`,
    reminderText: (type, day, time) => `Erinnerung: ${type}, ${day} um ${time} Uhr (kanarische Zeit). Für Änderungen einfach auf diese E-Mail antworten.`,
    welcomePill: "Willkommen", welcomeSubject: "Willkommen beim Newsletter von Casa Iglesias", welcomeTitle: "Danke für deine Anmeldung",
    welcomeBody: "Einmal im Monat schicke ich dir einen praktischen Tipp für die Website und den Auftritt deines Unternehmens: einfache Dinge, die du in zehn Minuten selbst umsetzen kannst.\n\nKeine Werbung, keine wöchentlichen Mails. Abmeldung jederzeit mit einem Klick.\n\nViele Grüße,\nMario · Casa Iglesias",
    visit: "Zur Website", unsubscribe: "Abmelden",
    welcomeText: (u) => `Danke für deine Anmeldung zum Newsletter von Casa Iglesias. Ein praktischer Tipp pro Monat.\n\nAbmelden: ${u}`,
    newsletterNote: "Hinweis: Der monatliche Newsletter ist auf Spanisch.",
  },
  fr: {
    types: { primera: "Premier rendez-vous", presupuesto: "Devis", seguimiento: "Suivi" }, reminderPill: "Rappel",
    reminderSubject: (t) => `Rappel : notre rendez-vous est demain à ${t}`,
    reminderTitle: (n) => `À demain, ${n}`,
    reminderBody: (type, day, time) => `Je vous rappelle notre rendez-vous (${type.toLowerCase()}) : ${day} à ${time}, heure des Canaries. Il dure environ 30 minutes.\n\nSi vous ne pouvez pas venir ou souhaitez changer l'horaire, répondez à cet e-mail et nous nous organiserons.\n\nMario · Casa Iglesias`,
    reminderText: (type, day, time) => `Rappel : ${type}, ${day} à ${time} (heure des Canaries). Pour le modifier, répondez à cet e-mail.`,
    welcomePill: "Bienvenue", welcomeSubject: "Bienvenue dans la newsletter de Casa Iglesias", welcomeTitle: "Merci pour votre inscription",
    welcomeBody: "Une fois par mois, je vous enverrai un conseil pratique pour prendre soin du site et de l'image de votre entreprise : des choses simples à faire vous-même en dix minutes.\n\nNi publicité ni e-mails chaque semaine. Si un jour cela ne vous sert plus, désinscription en un clic.\n\nBien à vous,\nMario · Casa Iglesias",
    visit: "Visiter le site", unsubscribe: "Me désinscrire",
    welcomeText: (u) => `Merci pour votre inscription à la newsletter de Casa Iglesias. Un conseil pratique par mois.\n\nSe désinscrire : ${u}`,
    newsletterNote: "Remarque : la newsletter mensuelle est rédigée en espagnol.",
  },
  he: {
    types: { primera: "פגישת היכרות", presupuesto: "הצעת מחיר", seguimiento: "פגישת המשך" }, reminderPill: "תזכורת",
    reminderSubject: (t) => `תזכורת: הפגישה שלנו מחר בשעה ${t}`,
    reminderTitle: (n) => `נתראה מחר, ${n}`,
    reminderBody: (type, day, time) => `רק מזכיר את הפגישה שלנו (${type}): ${day} בשעה ${time}, שעון האיים הקנריים. היא נמשכת כ-30 דקות.\n\nאם לא תוכלו להגיע או שתרצו לשנות את השעה, השיבו למייל הזה ונסדר.\n\nמריו · Casa Iglesias`,
    reminderText: (type, day, time) => `תזכורת: ${type}, ${day} בשעה ${time} (שעון האיים הקנריים). לשינוי, השיבו למייל הזה.`,
    welcomePill: "ברוכים הבאים", welcomeSubject: "ברוכים הבאים לניוזלטר של Casa Iglesias", welcomeTitle: "תודה שנרשמתם",
    welcomeBody: "פעם בחודש אשלח לכם טיפ מעשי לטיפוח האתר והתדמית של העסק: דברים פשוטים שאפשר לעשות לבד בעשר דקות.\n\nבלי פרסומות ובלי מיילים כל שבוע. אם זה כבר לא מועיל, מבטלים בלחיצה.\n\nבברכה,\nמריו · Casa Iglesias",
    visit: "לאתר", unsubscribe: "ביטול הרשמה",
    welcomeText: (u) => `תודה שנרשמתם לניוזלטר של Casa Iglesias. טיפ מעשי אחד בחודש.\n\nביטול הרשמה: ${u}`,
    newsletterNote: "שימו לב: הניוזלטר החודשי נכתב בספרדית.",
  },
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

// Marco de marca de todos los correos: banner arriba, logo y datos abajo (imágenes en casaiglesias.es/email/)
const IMG = "https://casaiglesias.es/email/";
const BRAND_LINK = `style="color:${BUTTER};text-decoration:none"`;
function frame(inner: string, lang = "es") {
  return `
  <div dir="${lang === "he" ? "rtl" : "ltr"}" lang="${lang}" style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${INK};padding:24px 12px">
    <div style="max-width:600px;margin:0 auto;background:${CREAM};border-radius:16px;overflow:hidden">
      <a href="https://casaiglesias.es/" style="display:block;text-decoration:none"><img src="${IMG}banner.png" width="600" alt="Casa Iglesias · Estudio de diseño y desarrollo web" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a>
      <div style="padding:30px 32px">${inner}</div>
      <a href="https://casaiglesias.es/" style="display:block;text-decoration:none"><img src="${IMG}pie.png" width="600" alt="Casa Iglesias" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a>
      <div style="background:${INK};padding:2px 24px 24px;text-align:center;color:#d9c9b8;font-size:12px;line-height:1.7">
        <a href="https://casaiglesias.es/" ${BRAND_LINK}>casaiglesias.es</a> · <a href="mailto:hola@casaiglesias.es" ${BRAND_LINK}>hola@casaiglesias.es</a> · <a href="https://www.instagram.com/casaiglesias.studio/" ${BRAND_LINK}>@casaiglesias.studio</a> · <a href="https://casaiglesias.es/privacidad/" ${BRAND_LINK}>Privacidad</a>
      </div>
    </div>
  </div>`;
}

function layout(pill: string, title: string, body: string, footer = "", lang: L = "es") {
  return frame(`
      <p style="margin:0 0 8px"><span style="display:inline-block;background:${BUTTER};color:${INK};font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 12px;border-radius:999px">${esc(pill)}</span></p>
      <h1 style="margin:14px 0 18px;color:${INK};font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.2">${esc(title)}</h1>
      ${body}
      ${footer ? `<p style="margin:24px 0 0;color:${MUTED};font-size:13px;line-height:1.5">${footer}</p>` : ""}`, lang);
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
const unsubscribeLink = (token: unknown, lang: unknown = "es") => `${WEB}${asLang(lang) === "es" ? "" : `${asLang(lang)}/`}baja/?t=${token}`;
// Baja en un clic desde el botón del propio programa de correo (Gmail, Apple Mail…)
const unsubscribeHeaders = (token: unknown) => ({ "List-Unsubscribe": `<${unsubscribeUrl(token)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
async function subscriber(id: string) {
  const s = await claim("subscribers", id, "id, email, token, lang");
  if (!s) return json({ ok: true, skipped: true });
  await send({
    from: FROM_MARIO, to: await adminEmails(),
    subject: oneLine(`💌 Nuevo suscriptor del boletín: ${s.email}${s.lang && s.lang !== "es" ? ` (${LANG_NAME[asLang(s.lang)]})` : ""}`),
    html: layout("Boletín", "Alguien se ha apuntado", `<p style="color:${INK};font-size:16px">${esc(s.email)}</p>${button(PANEL_URL, "Ver suscriptores")}`),
    text: `Nuevo suscriptor del boletín: ${s.email}`,
  });
  if (FROM_CLIENTS) {
    const lang = asLang(s.lang), c = CT[lang], web = lang === "es" ? WEB : `${WEB}${lang}/`;
    const ok = await send({
      from: FROM_CLIENTS, to: [s.email], reply_to: (await adminEmails())[0],
      subject: c.welcomeSubject,
      html: layout(c.welcomePill, c.welcomeTitle, paragraphs(c.welcomeBody + (c.newsletterNote ? `\n\n${c.newsletterNote}` : "")) + button(web, c.visit),
        `<a href="${unsubscribeLink(s.token, lang)}" style="color:${MUTED}">${esc(c.unsubscribe)}</a>`, lang),
      text: c.welcomeText(unsubscribeLink(s.token, lang)),
      headers: unsubscribeHeaders(s.token),
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
      .select("id, name, email, phone, topic, starts_at, meeting_type, lang").maybeSingle();
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
    const lang = asLang(b.lang), c = CT[lang];
    const cDay = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(when);
    const cTime = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(when);
    const cType = c.types[b.meeting_type] ?? c.types.primera;
    // Para el cliente (solo con dominio propio)
    if (FROM_CLIENTS) {
      await send({
        from: FROM_CLIENTS, to: [b.email], reply_to: admins[0],
        subject: oneLine(c.reminderSubject(cTime)),
        html: layout(c.reminderPill, c.reminderTitle(String(b.name).split(" ")[0] ?? ""), paragraphs(c.reminderBody(cType, cDay, cTime)), "", lang),
        text: c.reminderText(cType, cDay, cTime),
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
  const { data: subs } = await supabase.from("subscribers").select("email, token, lang").eq("unsubscribed", false);
  const replyTo = (await adminEmails())[0];
  const emails = (subs ?? []).map((s) => ({
    from: FROM_CLIENTS, to: [s.email], reply_to: replyTo, subject: oneLine(asunto),
    html: layout("Consejo del mes", asunto, paragraphs(texto) + button(WEB, "Visitar Casa Iglesias"),
      `Recibes este boletín porque te apuntaste en la web de Casa Iglesias. <a href="${unsubscribeLink(s.token, s.lang)}" style="color:${MUTED}">Darme de baja</a>`),
    text: `${texto}\n\nDarte de baja: ${unsubscribeLink(s.token, s.lang)}`,
    headers: unsubscribeHeaders(s.token),
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

/* ---------- Baja del boletín ----------
   Supabase no deja mostrar páginas web desde sus funciones (las enseña como texto),
   así que el enlace del email lleva a casaiglesias.es/baja/, que tiene el botón de confirmar.
   La baja la hace este POST (desde esa página o desde el botón del programa de correo). */
const bajaPage = (token: unknown, lang: L = "es") => `${WEB}${lang === "es" ? "" : `${lang}/`}baja/?t=${token}`;
const validToken = (token: string) => /^[0-9a-f-]{36}$/i.test(token);
async function unsubscribe(token: string) {
  if (!validToken(token)) return json({ error: "bad_token" }, 400);
  await supabase.from("subscribers").update({ unsubscribed: true }).eq("token", token);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const baja = new URL(req.url).searchParams.get("baja");
  // Enlaces antiguos de baja: llevan a la página de la web
  if (req.method === "GET") return baja ? Response.redirect(bajaPage(baja), 302) : json({ error: "not_found" }, 404);
  if (req.method === "POST" && baja) return unsubscribe(baja);
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
