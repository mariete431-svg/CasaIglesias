import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
// Letras alojadas en la propia web (sin Google): solo los grosores que se usan
import "@fontsource/cormorant-garamond/latin-300.css";
import "@fontsource/cormorant-garamond/latin-300-italic.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./styles.css";

// Nadie puede mostrar esta web dentro de otra página (protección contra engaños por "clickjacking")
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top!.location.href = window.location.href; } catch { /* el navegador lo impide: la web queda oculta */ }
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
    <App />
  </BrowserRouter>,
);
