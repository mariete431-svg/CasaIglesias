# Web de Mario Iglesias — instrucciones para Claude

Mario habla español y está aprendiendo: explícale todo con pasos sencillos y sin jerga.

## Cómo se trabaja

- El código está en `app/` (React + Vite). `npm run build` (dentro de `app/`) genera la web y la copia a la raíz del repositorio, que es lo que publica GitHub Pages. Nunca edites a mano los archivos de la raíz generados (`index.html`, `assets/`, `blog/`, `cv/`…).
- Cada cambio va en una rama nueva desde `origin/main` y una propuesta (pull request). Mario la acepta él mismo; tú no puedes aceptarla. Antes de decir que algo está publicado, comprueba con `gh pr view` que la propuesta está en estado MERGED.
- Colores: toda la web en burdeos (`--ink`), letras crema y amarillo bebé solo para detalles. Nada de objetos volando: el movimiento es elegante y respeta "Reducir movimiento".

## Blog: consejos prácticos + frase cada dos días

Mario **no quiere que el blog cuente lo que se hace por dentro en la web** (nada de «Web más profesional», «Nuevo servicio…», resúmenes de conversaciones ni diarios de cambios). El blog es el de un estudio profesional.

### Cuando cambies algo de la web

**No escribas un artículo.** En su lugar, añade **una frase nueva arriba del todo** en `app/src/content/frases.ts`, con la fecha del cambio (`{ texto: "…", fecha: "AAAA-MM-DD" }`), y quita la `fecha` a la frase que la tenía antes. Esa frase se enseña dos días; después la frase del blog va cambiando sola cada dos días.

Las frases: cortas, inspiradoras y profesionales, sobre negocios, diseño, webs o marca. Nunca sobre lo que se ha cambiado en la web.

### Artículos (solo cuando Mario los pida)

Consejos prácticos para dueños de negocios: webs, reservas online, Google, marca, fotos, redes. Útiles y concretos, con listas cortas.

Nombre: `AAAA-MM-DD-palabras-clave.md` (la parte después de la fecha es la dirección: `/blog/palabras-clave`).

```
---
titulo: Título claro y útil
fecha: 2026-09-29 10:00
resumen: Una o dos frases (máx. ~200 caracteres). Salen en la lista y en Google.
etiquetas: Webs
---
```

Etiquetas (una a tres): `Webs`, `Reservas`, `Google`, `Marca`, `Consejos`.

- Tono profesional y cercano, de tú. Entre 120 y 300 palabras, con `##` cortas y listas.
- Nunca hablar de cómo está hecha esta web, de Claude, de revisiones internas ni de los cambios del día.
- Nada de datos inventados (porcentajes, estudios) presentados como reales.

### Lo que nunca se publica

- Claves, identificadores de proyecto, correos de administradores ni datos de visitantes o reservas.
- Detalles de cómo funcionan las defensas (límites exactos, nombres de tablas o funciones, reglas de la base de datos).
- Fallos de seguridad que todavía no estén arreglados.

La firma («Escrito con ayuda de IA (Claude)») la añade la página automáticamente.

Después de tocar el blog o las frases, ejecuta `npm run build` en `app/` para comprobar que todo aparece en `blog/`, en `sitemap.xml` y en `blog/feed.xml`.
