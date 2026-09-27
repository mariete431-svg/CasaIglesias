# Web de Mario Iglesias — instrucciones para Claude

Mario habla español y está aprendiendo: explícale todo con pasos sencillos y sin jerga.

## Cómo se trabaja

- El código está en `app/` (React + Vite). `npm run build` (dentro de `app/`) genera la web y la copia a la raíz del repositorio, que es lo que publica GitHub Pages. Nunca edites a mano los archivos de la raíz generados (`index.html`, `assets/`, `blog/`, `cv/`…).
- Cada cambio va en una rama nueva desde `origin/main` y una propuesta (pull request). Mario la acepta él mismo; tú no puedes aceptarla. Antes de decir que algo está publicado, comprueba con `gh pr view` que la propuesta está en estado MERGED.
- Colores: toda la web en burdeos (`--ink`), letras crema y amarillo bebé solo para detalles. Nada de objetos volando: el movimiento es elegante y respeta "Reducir movimiento".

## Bitácora (blog): un artículo por cada cambio

Cada vez que termines un cambio visible o importante en la web, escribe en la **misma rama** un artículo nuevo en `app/src/content/blog/`. Así, cuando Mario acepta la propuesta, se publican a la vez el cambio y su artículo.

No hace falta artículo para retoques mínimos (una errata, un color); en ese caso añade una frase al final del artículo más reciente que trate del tema, o nada.

### Formato del archivo

Nombre: `AAAA-MM-DD-palabras-clave.md` (la parte después de la fecha es la dirección: `/blog/palabras-clave`).

```
---
titulo: Título claro y concreto
fecha: 2026-09-27 16:00
resumen: Una o dos frases (máx. ~200 caracteres). Salen en la lista y en Google.
etiquetas: Diseño
---
```

Etiquetas: usa solo estas (una a tres): `Primeros pasos`, `Diseño`, `Seguridad`, `Auditoría`, `Accesibilidad`, `SEO`, `Proceso`. Si hace falta una nueva, que sea general y avisa a Mario.

### Cómo escribir

- En primera persona, con la voz de Mario: cercano, claro, sin tecnicismos sin explicar. Frases cortas.
- Estructura: contexto → qué quería → qué hicimos → **por qué así** (las decisiones y las alternativas descartadas) → una cita con `> **Lo que aprendí**` → "Lo siguiente".
- Entre 400 y 800 palabras. Títulos de sección con `##`.
- Solo hechos reales, con sus fechas. Si algo no se probó, dilo.
- Enlaces internos con `/`, por ejemplo `[creador de CV](/crear-cv)`.

### Lo que nunca se publica

- Claves, identificadores de proyecto, correos de administradores ni datos de visitantes o reservas.
- Detalles de cómo funcionan las defensas (límites exactos, nombres de tablas o funciones, reglas de la base de datos).
- Fallos de seguridad que todavía no estén arreglados.

La firma ("Escrito por Mario Iglesias con ayuda de Claude") la añade la página automáticamente.

Después de escribir el artículo, ejecuta `npm run build` en `app/` para comprobar que aparece en `blog/`, en `sitemap.xml` y en `blog/feed.xml`.
