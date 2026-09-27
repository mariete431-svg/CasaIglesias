---
titulo: Auditoría profesional: seguridad, privacidad y un iPhone que imprimía mal
fecha: 2026-09-27 12:00
resumen: Pedí una revisión completa de la web, como la haría una empresa, sin cambiar nada. Salieron 18 puntos ordenados por importancia. Estos son los que más me enseñaron y cómo los arreglamos.
etiquetas: Auditoría, Seguridad, SEO
---

Una cosa es que la web **funcione** y otra que esté **bien hecha**. Para saberlo pedí una auditoría completa, primero **sin tocar nada**: solo mirar y apuntar. Salieron 18 puntos, ordenados de más a menos importante. Ninguno era grave, pero varios merecían la pena.

## Lo más importante primero

**Guardar el CV en PDF desde el iPhone.** El creador de CV prepara la hoja para imprimir, abre la ventana de impresión y luego deshace la preparación. En el ordenador la ventana espera; en el iPhone, no. Resultado posible: se imprimía la página entera en vez de solo el CV. Ahora la web **espera a que el navegador avise de que ha terminado** antes de deshacer nada.

**Que nadie pueda llenar mi agenda.** Había un límite general de reservas para frenar el spam. El problema: una sola persona con malas intenciones podía agotarlo y dejar la agenda "ocupada" para todos. Lo cambiamos por un **límite por persona**. Para distinguir a cada una, se guarda una huella anónima de su conexión, **nunca la dirección IP**.

## Privacidad: las letras también cuentan

Las letras de la web se descargaban de Google Fonts. Parece inofensivo, pero cada visita **enviaba la IP del visitante a Google**. Ahora las letras están dentro de la propia web: nadie más se entera de quién entra, y además carga más rápido. Lo expliqué en la [página de privacidad](/privacidad).

## Seguridad que no se ve

- Una **política de seguridad** que solo permite cargar cosas de mi web y de mi base de datos. Si alguien intentara colar un script ajeno, el navegador lo bloquearía.
- Mi web **no se puede meter dentro de otra página** para engañar a quien la usa.

## Accesibilidad con el teclado

- El menú del móvil ahora **se cierra con Escape** y, mientras está abierto, el teclado no se escapa a la página de detrás.
- Los desplegables cerrados ya no "atrapan" el foco con enlaces invisibles.
- Un enlace **"Saltar al contenido"** para ir directo a lo importante.

## Google y velocidad

- Una **ficha para Google** con mi nombre, a qué me dedico y dónde estoy, en el formato que Google entiende (schema.org).
- **Texto real dentro de cada página**, para que los buscadores lo lean aunque no ejecuten JavaScript.
- Las fotos, en formato **WebP**: hasta un 60 % más ligeras.
- Después di de alta la web en **Google Search Console** y envié el mapa del sitio.

## Y lo que vino después

Al ver la web publicada en mi móvil surgieron dos detalles más: las opiniones pasaron a un **cuadro amarillo muy claro** para que destacaran sobre el burdeos, y descubrí que en mi iPhone no pasaban solas. La causa: tengo activado "Reducir movimiento", y la web las paraba por completo. Ahora pasan siempre, y con esa opción solo cambian con un **fundido suave**.

> **Lo que aprendí**
> Una auditoría sin tocar nada es la mejor forma de empezar: primero entender, luego priorizar, y solo después arreglar. Y probar en tu propio teléfono descubre cosas que ninguna simulación enseña.

## Lo siguiente

Para contar todo esto nació esta bitácora. En el siguiente artículo explico cómo funciona y por qué se escribe (casi) sola.
