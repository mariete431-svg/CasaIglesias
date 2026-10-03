import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, usePageTitle } from "@/components/SiteChrome";
import { useLocalize, useT } from "@/i18n";

/* Baja del boletín: el enlace del email trae ?t=<token>. Solo se da de baja al pulsar
   el botón (los antivirus de correo que abren los enlaces no dan de baja a nadie). */
const FN = "https://uaojfcqpdngoqpjrmttx.supabase.co/functions/v1/avisos";

export default function UnsubscribePage() {
  const t = useT().unsub;
  const local = useLocalize();
  usePageTitle(`${t.lines.join(" ")} — Casa Iglesias`);
  const token = new URLSearchParams(window.location.search).get("t") ?? "";
  const valid = /^[0-9a-f-]{36}$/i.test(token);
  const [state, setState] = useState<"idle" | "doing" | "done" | "error">("idle");

  const confirm = async () => {
    setState("doing");
    try {
      const res = await fetch(`${FN}?baja=${encodeURIComponent(token)}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  };

  const home = <Button variant="outlineLuxury" size="lg" asChild><Link to={local("/")}>{t.home} <ArrowUpRight /></Link></Button>;
  return <main>
    <PageHero
      eyebrow={t.eyebrow}
      lines={state === "done" ? [t.doneTitle, ""] : t.lines}
      subtitle={!valid ? t.invalid : state === "done" ? t.done : state === "error" ? t.error : t.text}
      actions={!valid || state === "done" ? home : <>
        <Button variant="luxury" size="lg" onClick={confirm} disabled={state === "doing"}>{state === "doing" ? t.doing : t.button}</Button>
        {home}
      </>}
      bottom="Casa Iglesias"
    />
  </main>;
}
