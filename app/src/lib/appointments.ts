// Fechas y horas de las reservas (hora de Canarias).
// No importa Supabase a propósito: así la portada se dibuja sin esperar a descargarlo.
export const ZONE = "Atlantic/Canary";
export const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

/** "sábado, 26 de septiembre" → "Sábado, 26 de septiembre" */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);

export const formatDay = (key: string) => new Intl.DateTimeFormat("es-ES", {
  timeZone: ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(dateFromKey(key));

export const formatTime = (iso: string) => new Intl.DateTimeFormat("es-ES", {
  timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(iso));

export function downloadCalendarEvent(iso: string, type = "Reunión") {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 30 * 60_000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mario Iglesias//Reuniones//ES", "BEGIN:VEVENT",
    `UID:${stamp(start)}-mario-iglesias@reuniones`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${type} con Mario Iglesias (Casa Iglesias)`, "DESCRIPTION:Reunión de 30 minutos por teléfono o videollamada.", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Reunión con Mario mañana", "TRIGGER:-P1D", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reunion-mario-iglesias.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
