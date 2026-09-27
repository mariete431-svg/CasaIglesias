---
titulo: Tres diseños en un día: saber decir "esto no"
fecha: 2026-09-26 15:00
resumen: Probé un "pequeño universo" en verde, luego un estilo amarillo con efectos 3D, y ninguno era yo. Así llegué a un diseño editorial y elegante, y a una web más fácil de usar.
etiquetas: Diseño
---

Tener una web que funciona no es lo mismo que tener una web **que te represente**. El 26 de septiembre cambié el diseño tres veces. Suena a perder el tiempo, pero fue de lo más útil del proyecto.

## Intento 1: un "pequeño universo"

La primera idea fue una portada muy personal: tonos verde bosque y crema, la foto de un atardecer en Tenerife, la historia contada en capítulos, objetos en 3D, un cursor propio y hasta un secreto escondido. Técnicamente era ambicioso… pero al verlo entero, **no era yo**. Demasiadas cosas pasando a la vez.

## Intento 2: blanco, amarillo y efectos

Probamos lo contrario: fondo blanco, amarillo bebé y transiciones en 3D. Tampoco. Era más limpio, pero seguía sin tener personalidad.

## Intento 3: estilo editorial

Lo que sí encajó fue un estilo **editorial, como el de una revista**: una tipografía con serifa elegante (Cormorant Garamond) para los títulos, una muy legible (Inter) para el texto, mucho espacio en blanco y detalles finos. La portada la empecé con **Lovable**, una herramienta que genera webs a partir de una descripción. Cuando se acabaron sus créditos, rehicimos el resto de páginas a mano con el mismo estilo.

Con ese cambio la web pasó a estar hecha con **React y Vite**, herramientas modernas que permiten reutilizar piezas: la cabecera, los botones o las animaciones se escriben una vez y se usan en todas las páginas.

## Cuidar lo que ya existía

Rehacer el diseño no podía romper nada:

- **Los mismos datos:** citas, tareas y comentarios siguieron en la misma base de datos.
- **Las direcciones antiguas** (por ejemplo `cv.html`) redirigen a las nuevas, para que ningún enlace que hubiera enviado se quedara roto.

## Hacerlo fácil de usar

Con el diseño decidido, me fijé en **qué quiero que haga la gente** al entrar: reservar una reunión o crear su currículum con mi herramienta gratuita. Así que:

- Pusimos esos dos botones **siempre a mano** en la cabecera.
- Justo debajo de la portada añadimos un bloque **"Empieza aquí"** con dos desplegables: uno abre el calendario de reservas y el otro presenta el [creador de CV](/crear-cv).
- Añadimos las **opiniones** de la gente que ha dejado su comentario, que van pasando solas.

> **Lo que aprendí**
> Decir "esto no me representa" a tiempo ahorra mucho trabajo después. Y un buen diseño empieza por saber qué quieres que haga quien entra.

## Lo siguiente

La web ya se veía bien. Pero ¿estaba **bien hecha** por dentro? Para saberlo hice mi primera auditoría completa.
