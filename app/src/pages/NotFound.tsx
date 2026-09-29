import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, usePageTitle } from "@/components/SiteChrome";

export default function NotFound() {
  usePageTitle("Página no encontrada — Casa Iglesias");
  return <main>
    <PageHero
      eyebrow="ERROR 404 — PÁGINA NO ENCONTRADA"
      lines={["Aquí no", "hay nada."]}
      subtitle="La página que buscas no existe o ha cambiado de dirección."
      actions={<Button variant="luxury" size="lg" asChild><Link to="/">Volver al inicio <ArrowUpRight /></Link></Button>}
      bottom="Mario Iglesias"
    />
  </main>;
}
