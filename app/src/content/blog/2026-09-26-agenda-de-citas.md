---
titulo: Una agenda de citas de verdad (y por qué la seguridad va primero)
fecha: 2026-09-26 08:00
resumen: Pasar de una web que solo se lee a una que guarda datos de otras personas. Cómo monté las reservas con Supabase, un panel privado y avisos por email, y por qué empecé por las reglas de seguridad.
etiquetas: Seguridad
---

La lista de tareas guardaba los datos en el navegador de cada persona. Pero una **agenda de citas** es otra cosa: si alguien reserva una reunión, esa reserva tiene que llegarme **a mí**. Necesitaba una base de datos en internet.

## La herramienta: Supabase

Elegí **Supabase**, un servicio que te da una base de datos (PostgreSQL), inicio de sesión y funciones en la nube, con un plan gratuito generoso. Para una web personal es ideal: no tengo que mantener ningún servidor.

## Lo que construimos

- **Reserva por pasos:** eliges día, luego hora y luego dejas tus datos. El calendario **solo enseña los huecos libres**, en hora de Canarias y en bloques de 30 minutos.
- **Panel privado:** una página con contraseña donde veo las citas, marco si están confirmadas, bloqueo días de vacaciones y cambio mi horario.
- **Aviso por email:** cuando alguien reserva, me llega un correo con sus datos para poder responderle directamente.

## Por qué empecé por la seguridad

Aquí está la decisión más importante de todo el proyecto. En cuanto una web guarda nombres, emails y teléfonos de otras personas, **tienes la responsabilidad de protegerlos**.

Supabase tiene una herramienta clave para esto: las **reglas por fila** (en inglés, *Row Level Security*). Con ellas decides, dentro de la propia base de datos, quién puede leer o cambiar cada cosa. Lo configuramos así:

- Los **visitantes** no pueden leer ninguna tabla. Solo pueden hacer dos cosas muy concretas: preguntar qué horas están libres y reservar una.
- Esas dos acciones pasan por **funciones que comprueban los datos**: que el nombre y el correo tengan sentido, que la hora siga libre y que nadie reserve de más.
- Todo lo demás (citas, horario, días bloqueados) **solo lo puede ver el administrador**.

La ventaja de hacerlo en la base de datos, y no solo en la web, es que **aunque alguien se salte la web** y hable directamente con la base de datos, las reglas siguen ahí.

> **Lo que aprendí**
> La seguridad no se añade al final: se diseña al principio. Y lo más seguro es que el público solo pueda hacer lo mínimo imprescindible.

## Un fallo curioso que tuvimos después

Unos días más tarde vi que las opiniones de la web salían vacías… pero solo en mi ordenador. La causa: yo tenía abierta la sesión del panel privado, y para la base de datos yo ya no era un "visitante", así que las reglas para visitantes no me incluían. La solución fue que las partes públicas de la web usen siempre una conexión de visitante, aunque haya una sesión abierta. Un buen recordatorio de que **probar como un visitante cualquiera** es parte del trabajo.

## Lo siguiente

La agenda funcionaba, pero el diseño de la web no me convencía. Lo cambiamos varias veces hasta dar con uno que sí, y de eso va el siguiente artículo.
