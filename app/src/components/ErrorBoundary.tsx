import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { langFromPath } from "@/i18n";

const ERROR_TEXT = {
  es: ["ALGO HA FALLADO", "Vuelve a", "intentarlo.", "La página no se ha podido cargar. Puede que la web se acabe de actualizar o que la conexión haya fallado.", "Recargar la página"],
  en: ["SOMETHING WENT WRONG", "Please try", "again.", "The page couldn't be loaded. The website may have just been updated or the connection may have failed.", "Reload the page"],
  it: ["QUALCOSA NON HA FUNZIONATO", "Riprova", "di nuovo.", "Non è stato possibile caricare la pagina. Forse il sito è appena stato aggiornato o la connessione si è interrotta.", "Ricarica la pagina"],
  de: ["ETWAS IST SCHIEFGELAUFEN", "Bitte versuche es", "erneut.", "Die Seite konnte nicht geladen werden. Vielleicht wurde die Website gerade aktualisiert oder die Verbindung ist abgebrochen.", "Seite neu laden"],
  fr: ["UN PROBLÈME EST SURVENU", "Veuillez", "réessayer.", "La page n'a pas pu être chargée. Le site vient peut-être d'être mis à jour ou la connexion a été interrompue.", "Recharger la page"],
  he: ["משהו השתבש", "נסו", "שוב.", "לא הצלחנו לטעון את הדף. ייתכן שהאתר עודכן הרגע או שהחיבור נקטע.", "טעינת הדף מחדש"],
} as const;

const RELOAD_KEY = "mi-recarga-por-version";

/** Tras publicar una versión nueva, las piezas antiguas de la web ya no existen. */
const isOldVersionError = (error: unknown) =>
  error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(error.message);

/**
 * Si algo falla al dibujar una página, en vez de dejarla en blanco:
 * - si es porque hay una versión nueva de la web, recarga una vez sola;
 * - si no, muestra un aviso con un botón para recargar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (!isOldVersionError(error)) return;
    let reloaded = false;
    try { reloaded = sessionStorage.getItem(RELOAD_KEY) === "1"; sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* sin guardado */ }
    if (!reloaded) window.location.reload();
  }

  componentDidMount() {
    // La página ha cargado bien: se permite otra recarga automática en el futuro
    window.setTimeout(() => { try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* sin guardado */ } }, 5000);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const [label, title, em, text, button] = ERROR_TEXT[langFromPath(window.location.pathname)];
    return <main className="error-screen"><div>
      <span className="eyebrow">{label}</span>
      <h1>{title} <em>{em}</em></h1>
      <p>{text}</p>
      <Button variant="luxury" size="lg" onClick={() => window.location.reload()}>{button}</Button>
    </div></main>;
  }
}
