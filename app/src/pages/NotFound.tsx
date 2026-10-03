import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, usePageTitle } from "@/components/SiteChrome";
import { useLocalize, useT } from "@/i18n";

export default function NotFound() {
  const tr = useT();
  const t = tr.notFound;
  const local = useLocalize();
  usePageTitle(tr.meta.notFound);
  return <main>
    <PageHero
      eyebrow={t.eyebrow}
      lines={t.lines}
      subtitle={t.subtitle}
      actions={<Button variant="luxury" size="lg" asChild><Link to={local("/")}>{t.home} <ArrowUpRight /></Link></Button>}
      bottom="Mario Iglesias"
    />
  </main>;
}
