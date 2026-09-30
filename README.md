# Mario Iglesias — web personal

Web publicada: https://mariete431-svg.github.io/CasaIglesias/

## Dónde está cada cosa

- `app/` — el código de la web (React + Vite + framer-motion). Es lo único que se edita.
- `app/supabase/` — la función que avisa por email de cada reserva y los cambios de la base de datos.
- La raíz del repositorio (`index.html`, `assets/`, `cv/`…) la genera `npm run build`: no se edita a mano.

## Publicar cambios

```bash
cd app
npm install
npm run build
```

`npm run build` comprueba el código, genera la web y la copia a la raíz del repositorio, que es lo que publica GitHub Pages.
Cada página recibe su título, descripción, ficha para Google y política de seguridad.
