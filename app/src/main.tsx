import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { applyHtmlLang, langFromPath, loadLang } from "./i18n";
// Letras alojadas en la propia web (sin Google): solo los grosores que se usan
import "@fontsource/cormorant-garamond/latin-300.css";
import "@fontsource/cormorant-garamond/latin-300-italic.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
// Hebreo: letras con caracteres hebreos (solo se descargan si la página los usa)
import "@fontsource/frank-ruhl-libre/hebrew-400.css";
import "@fontsource/heebo/hebrew-400.css";
import "@fontsource/heebo/hebrew-500.css";
// Letra del logo de Casa Iglesias (solo para el logo)
import "@fontsource/bodoni-moda/latin-500.css";
import "./styles.css";

// Nadie puede mostrar esta web dentro de otra página (protección contra engaños por "clickjacking")
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top!.location.href = window.location.href; } catch { /* el navegador lo impide: la web queda oculta */ }
}

// Antes de pintar, se descargan los textos del idioma de la dirección (/en/, /he/…)
const lang = langFromPath(window.location.pathname);
applyHtmlLang(lang);
loadLang(lang).catch(() => undefined).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <App />
    </BrowserRouter>,
  );
});
