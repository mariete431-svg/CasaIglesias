var e=Object.assign({"../content/blog/2026-09-12-mi-primera-web.md":`---
titulo: Mi primera web: una página y una lista de tareas
fecha: 2026-09-12 21:00
resumen: Cómo empezó todo. Una página sencilla para contar quién soy y una lista de tareas que funciona de verdad, sin servidores ni bases de datos.
etiquetas: Primeros pasos
---

Llevaba tiempo con ganas de tener un sitio propio en internet. No una red social, sino **un lugar que fuera mío**, donde contar quién soy, qué sé hacer y qué estoy aprendiendo. Así que el 12 de septiembre publiqué la primera versión de esta web.

## Lo que quería

Tres cosas, nada más:

- Una **portada** que me presentara en pocas líneas.
- Una sección de **proyectos**, aunque todavía tuviera pocos.
- Algo que **funcionara de verdad**, no solo texto bonito. Elegí una lista de tareas.

## Por qué empezar tan pequeño

Podría haber intentado hacerlo todo a la vez: reservas, blog, panel de administración… Pero cuando empiezas, lo difícil no es escribir código, es **terminar algo y publicarlo**. Una web pequeña y publicada enseña más que una grande a medias en tu ordenador.

## Cómo está hecha

La primera versión era lo más sencillo posible:

- **HTML** para el contenido: títulos, textos, enlaces.
- **CSS** para el aspecto: letras, colores, tarjetas de proyectos y que se viera bien en el móvil.
- **JavaScript** solo para la lista de tareas.

La lista guarda las tareas con algo que se llama \`localStorage\`: un pequeño espacio que cada navegador reserva para cada web. Las tareas se quedan en tu propio ordenador o móvil, y no le llegan a nadie más. Para una primera herramienta es perfecto: **funciona sin servidores y sin bases de datos**, y no hay datos de nadie que proteger.

> **Lo que aprendí**
> Publicar pronto es mejor que publicar perfecto. Y guardar datos en el navegador es la forma más sencilla (y más privada) de que una herramienta recuerde cosas.

## Dónde vive la web

La web está alojada gratis en **GitHub Pages**. El código está en un repositorio de GitHub y, cada vez que se aprueba un cambio, GitHub publica la versión nueva. Esa forma de trabajar (proponer un cambio, revisarlo y aceptarlo) es la que sigo usando hoy para todo.

## Lo siguiente

Con la base publicada, el siguiente paso era que la web sirviera para algo más que presentarme: que la gente pudiera **pedirme una cita**. Eso ya necesitaba una base de datos de verdad, y te lo cuento en el siguiente artículo.
`,"../content/blog/2026-09-26-agenda-de-citas.md":`---
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
`,"../content/blog/2026-09-26-primera-auditoria.md":`---
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
- Un **mapa del sitio** (\`sitemap.xml\`) para que Google encuentre todas las páginas.
- Las páginas privadas (el panel, las tareas) **no salen en Google**.

## Más rápida

La portada pasó a descargar un **33 % menos**: la base de datos, el calendario y algunos efectos solo se cargan cuando hacen falta. Una web rápida se nota, sobre todo con datos móviles.

## Privacidad y moderación

Añadí una [página de privacidad](/privacidad) que explica qué datos se guardan y para qué. Y los comentarios ahora **quedan pendientes hasta que yo los apruebo**, para evitar spam u ofensas.

> **Lo que aprendí**
> Lo que no se ve también es diseño. Una web accesible, rápida y clara con los datos transmite tanto como una bonita.

## Lo siguiente

Con todo en orden por dentro, volví al aspecto: quería una web con **más vida**. Ahí empezó el rediseño en burdeos.
`,"../content/blog/2026-09-26-rediseno-editorial.md":`---
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
- **Las direcciones antiguas** (por ejemplo \`cv.html\`) redirigen a las nuevas, para que ningún enlace que hubiera enviado se quedara roto.

## Hacerlo fácil de usar

Con el diseño decidido, me fijé en **qué quiero que haga la gente** al entrar: reservar una reunión o crear su currículum con mi herramienta gratuita. Así que:

- Pusimos esos dos botones **siempre a mano** en la cabecera.
- Justo debajo de la portada añadimos un bloque **"Empieza aquí"** con dos desplegables: uno abre el calendario de reservas y el otro presenta el [creador de CV](/crear-cv).
- Añadimos las **opiniones** de la gente que ha dejado su comentario, que van pasando solas.

> **Lo que aprendí**
> Decir "esto no me representa" a tiempo ahorra mucho trabajo después. Y un buen diseño empieza por saber qué quieres que haga quien entra.

## Lo siguiente

La web ya se veía bien. Pero ¿estaba **bien hecha** por dentro? Para saberlo hice mi primera auditoría completa.
`,"../content/blog/2026-09-27-auditoria-profesional.md":`---
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
`,"../content/blog/2026-09-27-burdeos-y-3d.md":`---
titulo: Burdeos, 3D y una puesta de sol: darle vida a la web sin perder la elegancia
fecha: 2026-09-27 10:00
resumen: "Parece una oficina de abogados." Con esa frase empezó el rediseño. Cómo pasé de una web blanca y seria a una en burdeos, con movimiento en 3D, una entrada con mi foto de Tenerife y cero objetos volando.
etiquetas: Diseño
---

La web estaba bien hecha, pero al mirarla sentía que **le faltaba vida**. Blanca, fina, correcta… demasiado seria. La inspiración la tenía clara: la estética de la marca **Nude Project** y su tienda de Madrid: burdeos, aire *old money*, pero joven. Y la regla también: **nada de parecer una feria**.

## Una entrada con mi puesta de sol

Al abrir la web, ahora aparece a pantalla completa una foto que hice en Tenerife: el mar dorado al atardecer con una barca. La foto se enfoca, aparece mi nombre y después **se levanta como una tarjeta en 3D**, como cuando cierras una app en el iPhone, dejando ver la portada. Detalles que importan:

- Solo sale **una vez por visita**, y se salta tocando la pantalla o haciendo scroll.
- Hay dos versiones de la foto: una horizontal para ordenador y otra **recortada en vertical para el móvil**. La original pesaba 4,4 MB; las de la web, una fracción.
- Si la conexión es mala, la web entra directamente sin la foto, para no hacer esperar a nadie.

## Movimiento en 3D al hacer scroll

Los bloques **se "ponen de pie"** al entrar en pantalla, la portada se inclina hacia atrás al bajar y las líneas se dibujan solas. Muchos de estos efectos usan una técnica moderna de CSS (*animaciones ligadas al scroll*) que hace el propio navegador, así que van fluidos también en el móvil. Y si alguien tiene activado "Reducir movimiento" en su teléfono, **la web lo respeta** y cambia los efectos por fundidos suaves.

## Iterar con lo que se siente, no con lo que se piensa

El color fue lo que más vueltas dio:

1. Primero, **blanco y amarillo bebé**, con el texto en burdeos muy oscuro. Elegante, pero seguía siendo "una oficina de abogados".
2. Luego añadimos **más amarillo**: etiquetas en píldora, un subrayado de rotulador y una cinta con estrellas ✦. Mejor, pero la página seguía viéndose blanca.
3. Probamos que **el fondo cambiara de color** al bajar (blanco, amarillo, burdeos). Llamativo… y demasiado.
4. La decisión final: **toda la web en burdeos**, con letras crema y el amarillo solo para los detalles. Ahí sí.

Algo parecido pasó con un sello redondo que gira. La idea gustó, pero el primero era demasiado grande y en el móvil estorbaba. Acabó siendo **un aro fino**, más pequeño, y oculto en el móvil.

> **Lo que aprendí**
> El diseño se decide mirando, no imaginando. Probar rápido, enseñar el resultado y cambiar lo que no convence es más eficaz que intentar acertar a la primera.

## Que nada se rompa

Cambiar todos los colores tiene riesgos que no se ven a primera vista: textos que dejan de leerse, calendarios con el número invisible, la hoja del creador de CV que debe seguir siendo **blanca para imprimirla**… Revisé cada página en iPhone, tablet y ordenador midiendo el contraste de cada texto, y arreglé todo lo que falló.

## Lo siguiente

Con el nuevo estilo publicado, tocaba una revisión más profunda: seguridad, privacidad y Google. Una auditoría "profesional".
`,"../content/blog/2026-09-27-un-blog-que-se-escribe-solo.md":`---
titulo: Un blog que se escribe (casi) solo
fecha: 2026-09-27 14:00
resumen: Cómo funciona esta bitácora: cada cambio que hago en la web se convierte en un artículo, escrito con ayuda de Claude y revisado por mí antes de publicarse. Y por qué la he puesto dentro de mi web y no aparte.
etiquetas: Proceso
---

Esta web la estoy construyendo con ayuda de **Claude**, una inteligencia artificial que escribe código conmigo. Cada mejora deja un rastro: qué quería, qué decidimos y por qué. Me pareció una pena que todo eso se quedara escondido, así que nació esta bitácora.

## Por qué un blog

- **Para aprender en público.** Explicar lo que haces es la mejor forma de entenderlo de verdad.
- **Para que quien me conozca vea cómo trabajo**, no solo el resultado final. Un currículum dice lo que has hecho; un blog enseña cómo piensas.
- **Para que Google me encuentre.** Cada artículo es una página nueva con contenido propio, y eso ayuda a que la web aparezca al buscar mi nombre.

## Por qué dentro de mi web y no aparte

Podría haberlo puesto en otra dirección, pero todo lo que Google valore del blog **suma a mi web**. Con dos sitios separados, ese valor se repartiría. Además, quien entra a ver mi CV descubre el blog, y al revés.

## Cómo se escribe "solo"

1. **Construimos algo** en la web: un arreglo, una sección nueva, un cambio de diseño.
2. En el mismo cambio, Claude **redacta el artículo** a partir del trabajo real: qué problema había, qué opciones había, qué elegimos y qué aprendí.
3. **Yo lo reviso** junto con el resto del cambio en GitHub. Si no me convence, no se publica.
4. Cuando lo acepto, la web se actualiza y **el artículo aparece aquí**, en el [mapa del sitio](/sitemap.xml) para Google y en el [canal RSS](/blog/feed.xml) para quien quiera seguirlo.

Además, una tarea automática revisa cada semana si hubo cambios sin artículo y, si los hay, me propone uno.

## Las reglas

- **Nada se publica sin mi visto bueno.**
- **Solo cosas que pasaron de verdad**, con sus fechas.
- **Nunca detalles de seguridad sensibles**: ni claves, ni datos de nadie, ni cómo funcionan por dentro las defensas de la web.
- **Transparencia:** cada artículo dice que está escrito con ayuda de Claude.

> **Lo que aprendí**
> La inteligencia artificial es una herramienta increíble para construir y para contar lo que construyes, pero la decisión final tiene que ser tuya. Revisar antes de publicar no es opcional.

Si quieres seguir la obra, vuelve de vez en cuando o suscríbete por RSS. Y si algo no se entiende o crees que se podría hacer mejor, [escríbeme](mailto:mariete431@icloud.com).
`});function t(e,t){let n=t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/),r={};for(let e of(n?.[1]??``).split(/\r?\n/)){let t=e.indexOf(`:`);t>0&&(r[e.slice(0,t).trim()]=e.slice(t+1).trim())}let i=(n?.[2]??t).trim(),a=i.split(/\s+/).filter(Boolean).length;return{slug:e.replace(/^.*\//,``).replace(/\.md$/,``).replace(/^\d{4}-\d{2}-\d{2}-/,``),title:r.titulo??`Sin título`,date:r.fecha??``,summary:r.resumen??``,tags:(r.etiquetas??``).split(`,`).map(e=>e.trim()).filter(Boolean),body:i,minutes:Math.max(1,Math.round(a/200))}}var n=Object.entries(e).map(([e,n])=>t(e,n)).sort((e,t)=>t.date.localeCompare(e.date)||e.slug.localeCompare(t.slug)),r=new Intl.DateTimeFormat(`es-ES`,{day:`numeric`,month:`long`,year:`numeric`,timeZone:`UTC`}),i=e=>e?r.format(new Date(`${e.slice(0,10)}T12:00:00Z`)):``,a=e=>e.slice(0,10);export{a as n,n as r,i as t};