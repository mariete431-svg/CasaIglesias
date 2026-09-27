---
titulo: Agenda de citas
fecha: 2026-09-26 08:00
resumen: Añadí la posibilidad de reservar una reunión conmigo, con un panel privado para gestionar las citas.
etiquetas: Seguridad
---

El siguiente paso fue que la gente pudiera reservar una reunión desde la web.

## Qué añadí

- Un calendario que muestra solo las horas libres, en bloques de 30 minutos y en hora de Canarias.
- Un panel privado con contraseña para ver las citas y organizar mi horario.
- Un aviso por email cada vez que alguien reserva.

## Cómo

Para guardar las reservas usé Supabase, un servicio de base de datos. Lo primero que configuré fueron las reglas de acceso: los visitantes solo pueden ver qué horas están libres y reservar; todo lo demás solo lo veo yo.
