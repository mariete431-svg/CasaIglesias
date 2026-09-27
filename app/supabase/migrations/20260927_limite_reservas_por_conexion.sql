-- Evita que una sola persona llene la agenda con reservas falsas.
-- Antes: límite general (4 por hora, 15 pendientes) que cualquiera podía agotar.
-- Ahora: límite por conexión (huella anónima de la IP, nunca la IP) + límite general mucho más alto.

alter table public.bookings add column if not exists ip_hash text;
create index if not exists bookings_ip_hash_idx on public.bookings (ip_hash, created_at);

create or replace function public.book_appointment(p_name text, p_email text, p_phone text, p_topic text, p_starts_at timestamp with time zone)
 returns timestamp with time zone
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
    v_day date := (p_starts_at at time zone 'Atlantic/Canary')::date;
    v_headers json := nullif(current_setting('request.headers', true), '')::json;
    v_ip text := coalesce(
        v_headers ->> 'cf-connecting-ip',
        v_headers ->> 'x-real-ip',
        nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')
    );
    -- Huella anónima: no se puede volver a sacar la IP a partir de ella
    v_ip_hash text := case when v_ip is null then null else md5('mario-web-reservas:' || v_ip) end;
begin
    if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80
       or char_length(btrim(coalesce(p_email, ''))) > 120
       or btrim(coalesce(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       or char_length(coalesce(p_phone, '')) > 30
       or char_length(coalesce(p_topic, '')) > 500 then
        raise exception 'invalid_input';
    end if;

    if not exists (select 1 from public.get_available_slots(v_day) s where s.starts_at = p_starts_at) then
        raise exception 'slot_unavailable';
    end if;

    -- Por email: como mucho 3 citas pendientes a la vez
    if (select count(*) from public.bookings b
        where b.email = lower(btrim(p_email)) and b.status = 'pendiente' and b.starts_at > now()) >= 3 then
        raise exception 'too_many';
    end if;

    -- Por conexión: como mucho 2 citas pendientes y 3 reservas al día
    if v_ip_hash is not null and (
        (select count(*) from public.bookings b where b.ip_hash = v_ip_hash and b.status = 'pendiente' and b.starts_at > now()) >= 2
        or (select count(*) from public.bookings b where b.ip_hash = v_ip_hash and b.created_at > now() - interval '1 day') >= 3
    ) then
        raise exception 'too_many';
    end if;

    -- Red de seguridad general (mucho más alta que antes)
    if (select count(*) from public.bookings b where b.created_at > now() - interval '1 hour') >= 12
       or (select count(*) from public.bookings b where b.status = 'pendiente' and b.starts_at > now()) >= 40 then
        raise exception 'busy';
    end if;

    insert into public.bookings (name, email, phone, topic, starts_at, ip_hash)
    values (btrim(p_name), lower(btrim(p_email)),
            nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_topic, '')), ''), p_starts_at, v_ip_hash);
    return p_starts_at;
exception
    when unique_violation then raise exception 'slot_unavailable';
end;
$function$;
