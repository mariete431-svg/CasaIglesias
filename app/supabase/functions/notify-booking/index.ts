// Avisa por email a los administradores cuando alguien reserva una cita.
// La llama la base de datos (trigger en public.bookings) con { id }.
// Es segura aunque sea pública: solo manda UN email por cita que exista
// y no se haya avisado todavía (columna notified_at).

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PANEL_URL = "https://mariete431-svg.github.io/CasaIglesias/admin/";
const TZ = "Atlantic/Canary";

// Colores de la web: burdeos, crema y amarillo bebé
const INK = "#3d1119";
const CREAM = "#fbf6e6";
const BUTTER = "#fbf0b3";
const MUTED = "#7a4b53";

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

const oneLine = (value: unknown) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return json({ error: "bad_request" }, 400);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("Falta el secreto RESEND_API_KEY: no se puede enviar el aviso.");
    return json({ error: "not_configured" }, 503);
  }

  // Reserva el aviso de forma atómica: solo una llamada puede "ganarlo"
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("id, name, email, phone, topic, starts_at")
    .maybeSingle();

  if (error) {
    console.error("Error leyendo la cita:", error.message);
    return json({ error: "db_error" }, 500);
  }
  if (!booking) return json({ ok: true, skipped: true });

  const { data: admins } = await supabase.from("admins").select("email");
  const to = (admins ?? []).map((a) => a.email);
  if (!to.length) return json({ ok: true, skipped: true });

  const when = new Date(booking.starts_at);
  const day = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long",
  }).format(when);
  const time = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  }).format(when);

  const subject = oneLine(`📅 Nueva cita: ${booking.name} · ${day}, ${time}`);

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:${MUTED};vertical-align:top">${label}</td><td style="padding:6px 0;color:${INK}">${value}</td></tr>`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${INK};padding:32px 16px">
    <div style="max-width:520px;margin:0 auto;background:${CREAM};border-radius:20px;padding:32px">
      <p style="margin:0 0 8px"><span style="display:inline-block;background:${BUTTER};color:${INK};font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 12px;border-radius:999px">Nueva cita</span></p>
      <h1 style="margin:14px 0 4px;color:${INK};font-family:Georgia,serif;font-weight:400;font-size:30px">${esc(booking.name)}</h1>
      <p style="margin:0 0 24px;color:${INK};font-size:18px"><strong>${esc(day)} · ${esc(time)}</strong> <span style="color:${MUTED}">(hora de Canarias)</span></p>
      <table style="border-collapse:collapse;font-size:15px">
        ${row("Email", `<a href="mailto:${esc(booking.email)}" style="color:${INK}">${esc(booking.email)}</a>`)}
        ${booking.phone ? row("Teléfono", `<a href="tel:${esc(booking.phone)}" style="color:${INK}">${esc(booking.phone)}</a>`) : ""}
        ${booking.topic ? row("Tema", esc(booking.topic).replace(/\n/g, "<br>")) : ""}
      </table>
      <p style="margin:28px 0 0">
        <a href="${PANEL_URL}" style="display:inline-block;background:${INK};color:${BUTTER};text-decoration:none;padding:12px 22px;border-radius:999px">Abrir mi panel</a>
      </p>
      <p style="margin:20px 0 0;color:${MUTED};font-size:13px">Si respondes a este email, le escribirás directamente a ${esc(booking.name)}.</p>
    </div>
  </div>`;

  const text = [
    `Nueva cita: ${booking.name}`,
    `${day} · ${time} (hora de Canarias)`,
    `Email: ${booking.email}`,
    booking.phone ? `Teléfono: ${booking.phone}` : "",
    booking.topic ? `Tema: ${booking.topic}` : "",
    "",
    `Panel: ${PANEL_URL}`,
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mi web <onboarding@resend.dev>",
      to,
      reply_to: booking.email,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Resend ha fallado:", res.status, await res.text());
    // Deja la cita como "sin avisar" para poder reintentar
    await supabase.from("bookings").update({ notified_at: null }).eq("id", booking.id);
    return json({ error: "email_failed" }, 502);
  }

  return json({ ok: true });
});
