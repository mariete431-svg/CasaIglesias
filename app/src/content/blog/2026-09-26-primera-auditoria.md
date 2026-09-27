---
titulo: Mi primera auditoría: todo lo que no se ve
fecha: 2026-09-26 20:00
resumen: Una web puede verse bien y aun así fallar en el iPhone, ser difícil de usar con el teclado o no aparecer en Google. Revisé la mía de arriba abajo y esto es lo que cambió.
etiquetas: Auditoría, Accesibilidad, SEO
---

Con el diseño terminado, hice algo que recomiendo a cualquiera que empiece: **revisar la web como si fuera de otra persona**. Página por página, en móvil y en ordenador, buscando fallos. Salieron muchos más de los que esperaba.

## Formularios que fallaban sin explicar por qué

El formulario de reserva dejaba escribir un nombre de una sola letra o un mensaje larguísimo, pero la base de datos lo rechazaba después, **sin decir por qué**. Lo arreglamos para que el formulario use exactamente los mismos límites que la base de datos y muestre mensajes claros. También añadimos un **campo trampa** invisible: las personas no lo ven, pero los robots que rellenan formularios sí, y así se delatan.

## El iPhone y el zoom

En el iPhone, si un campo de texto tiene letra de menos de 16 píxeles, Safari **amplía la pantalla** al tocarlo, y la página queda descolocada. Solución: letra de 16 píxeles en todos los campos. Pequeño detalle, gran diferencia.

## Accesibilidad: una web para todo el mundo

- Todo se puede usar **con el teclado**, con un contorno visible que marca dónde estás.
- Las opiniones que pasan solas **se pueden pausar**, y no interrumpen a quien usa un lector de pantalla.
- Los botones pequeños crecieron para tocarlos cómodamente con el dedo.

## Aparecer en Google (SEO)

- Cada página tiene su **título y su descripción** propios.
- Una **imagen para compartir**, que es la que sale al mandar el enlace por WhatsApp o redes.
- Un **mapa del sitio** (`sitemap.xml`) para que Google encuentre todas las páginas.
- Las páginas privadas (el panel, las tareas) **no salen en Google**.

## Más rápida

La portada pasó a descargar un **33 % menos**: la base de datos, el calendario y algunos efectos solo se cargan cuando hacen falta. Una web rápida se nota, sobre todo con datos móviles.

## Privacidad y moderación

Añadí una [página de privacidad](/privacidad) que explica qué datos se guardan y para qué. Y los comentarios ahora **quedan pendientes hasta que yo los apruebo**, para evitar spam u ofensas.

> **Lo que aprendí**
> Lo que no se ve también es diseño. Una web accesible, rápida y clara con los datos transmite tanto como una bonita.

## Lo siguiente

Con todo en orden por dentro, volví al aspecto: quería una web con **más vida**. Ahí empezó el rediseño en burdeos.
