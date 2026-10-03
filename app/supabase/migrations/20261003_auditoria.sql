-- Arreglos de la auditoría (3 de octubre de 2026)
-- 1. Antispam por persona (huella anónima de la conexión) en mensajes, cuestionarios, boletín y opiniones
-- 2. Límite de fotos de opiniones por hora
-- 3. Idioma del cliente en reservas, boletín y mensajes (para escribirle en su idioma)
-- 4. Las funciones internas de los avisos ya no se pueden llamar desde fuera

/* ---------- Huella anónima de la conexión (igual que en las reservas) ---------- */
create or replace function public.request_ip_hash() returns text
language plpgsql stable security definer set search_path to ''
as $function$
declare
    v_headers json := nullif(current_setting('request.headers', true), '')::json;
    v_ip text := coalesce(
        v_headers ->> 'cf-connecting-ip',
        v_headers ->> 'x-real-ip',
        nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')
    );
begin
    return case when v_ip is null then null else md5('mario-web-reservas:' || v_ip) end;
end;
$function$;
revoke all on function public.request_ip_hash() from public, anon, authenticated;

alter table public.contact_messages add column if not exists ip_hash text, add column if not exists lang text not null default 'es';
alter table public.briefs add column if not exists ip_hash text, add column if not exists lang text not null default 'es';
alter table public.subscribers add column if not exists ip_hash text, add column if not exists lang text not null default 'es';
alter table public.comments add column if not exists ip_hash text;
alter table public.bookings add column if not exists lang text not null default 'es';

do $$ begin
  alter table public.contact_messages add constraint contact_messages_lang_check check (lang in ('es','en','it','de','fr','he'));
  alter table public.briefs add constraint briefs_lang_check check (lang in ('es','en','it','de','fr','he'));
  alter table public.subscribers add constraint subscribers_lang_check check (lang in ('es','en','it','de','fr','he'));
  alter table public.bookings add constraint bookings_lang_check check (lang in ('es','en','it','de','fr','he'));
exception when duplicate_object then null; end $$;

-- Formularios: como mucho 3 envíos por persona cada 10 minutos y 40 en total (por si atacan desde muchas conexiones)
create or replace function public.limit_forms() returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare n_ip int; n_all int; v_hash text := public.request_ip_hash();
begin
  new.ip_hash := v_hash;
  execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name) into n_all;
  if v_hash is not null then
    execute format('select count(*) from public.%I where ip_hash = $1 and created_at > now() - interval ''10 minutes''', tg_table_name) into n_ip using v_hash;
    if n_ip >= 3 then raise exception 'too_many'; end if;
  end if;
  if n_all >= 40 then raise exception 'too_many'; end if;
  new.email := lower(btrim(new.email));
  return new;
end;
$function$;

-- Opiniones: 2 por persona cada 10 minutos y 20 en total
create or replace function public.limit_comments() returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare v_hash text := public.request_ip_hash();
begin
  new.ip_hash := v_hash;
  if v_hash is not null and (select count(*) from public.comments c where c.ip_hash = v_hash and c.created_at > now() - interval '10 minutes') >= 2 then
    raise exception 'too_many';
  end if;
  if (select count(*) from public.comments c where c.created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'too_many';
  end if;
  return new;
end;
$function$;

-- Los visitantes no pueden escribir la huella ni el idioma con valores raros (lo pone la base de datos o el formulario)
drop policy if exists "Visitantes: enviar mensaje" on public.contact_messages;
create policy "Visitantes: enviar mensaje" on public.contact_messages for insert to anon
  with check (done = false and notified_at is null);
drop policy if exists "Visitantes: enviar cuestionario" on public.briefs;
create policy "Visitantes: enviar cuestionario" on public.briefs for insert to anon
  with check (done = false and notified_at is null);

/* ---------- Fotos de opiniones: como mucho 20 por hora entre todos ---------- */
create or replace function public.opiniones_uploads_last_hour() returns int
language sql stable security definer set search_path to ''
as $$ select count(*)::int from storage.objects o where o.bucket_id = 'opiniones' and o.created_at > now() - interval '1 hour' $$;
revoke all on function public.opiniones_uploads_last_hour() from public;
grant execute on function public.opiniones_uploads_last_hour() to anon;

drop policy if exists "Visitantes: subir foto de opinion" on storage.objects;
create policy "Visitantes: subir foto de opinion" on storage.objects
  for insert to anon with check (
    bucket_id = 'opiniones'
    and storage.extension(name) in ('jpg', 'webp')
    and public.opiniones_uploads_last_hour() < 20
  );

/* ---------- Reservas con el idioma del cliente ---------- */
drop function if exists public.book_appointment(text, text, text, text, timestamptz, text);
create or replace function public.book_appointment(
  p_name text, p_email text, p_phone text, p_topic text, p_starts_at timestamptz,
  p_type text default 'primera', p_lang text default 'es'
) returns timestamptz
language plpgsql security definer set search_path to ''
as $function$
declare
    v_day date := (p_starts_at at time zone 'Atlantic/Canary')::date;
    v_ip_hash text := public.request_ip_hash();
    v_type text := coalesce(nullif(btrim(p_type), ''), 'primera');
    v_lang text := coalesce(nullif(btrim(p_lang), ''), 'es');
begin
    if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80
       or char_length(btrim(coalesce(p_email, ''))) > 120
       or btrim(coalesce(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       or char_length(coalesce(p_phone, '')) > 30
       or char_length(coalesce(p_topic, '')) > 500
       or v_type not in ('primera', 'presupuesto', 'seguimiento')
       or v_lang not in ('es', 'en', 'it', 'de', 'fr', 'he') then
        raise exception 'invalid_input';
    end if;

    if not exists (select 1 from public.get_available_slots(v_day) s where s.starts_at = p_starts_at) then
        raise exception 'slot_unavailable';
    end if;

    if (select count(*) from public.bookings b
        where b.email = lower(btrim(p_email)) and b.status = 'pendiente' and b.starts_at > now()) >= 3 then
        raise exception 'too_many';
    end if;

    if v_ip_hash is not null and (
        (select count(*) from public.bookings b where b.ip_hash = v_ip_hash and b.status = 'pendiente' and b.starts_at > now()) >= 2
        or (select count(*) from public.bookings b where b.ip_hash = v_ip_hash and b.created_at > now() - interval '1 day') >= 3
    ) then
        raise exception 'too_many';
    end if;

    if (select count(*) from public.bookings b where b.created_at > now() - interval '1 hour') >= 12
       or (select count(*) from public.bookings b where b.status = 'pendiente' and b.starts_at > now()) >= 40 then
        raise exception 'busy';
    end if;

    insert into public.bookings (name, email, phone, topic, starts_at, ip_hash, meeting_type, lang)
    values (btrim(p_name), lower(btrim(p_email)),
            nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_topic, '')), ''),
            p_starts_at, v_ip_hash, v_type, v_lang);
    return p_starts_at;
exception
    when unique_violation then raise exception 'slot_unavailable';
end;
$function$;
revoke all on function public.book_appointment(text, text, text, text, timestamptz, text, text) from public;
grant execute on function public.book_appointment(text, text, text, text, timestamptz, text, text) to anon, authenticated;

/* ---------- Funciones internas: solo las usa la base de datos ---------- */
revoke execute on function public.limit_forms() from public, anon, authenticated;
revoke execute on function public.notify_form() from public, anon, authenticated;
revoke execute on function public.limit_comments() from public, anon, authenticated;
revoke execute on function public.call_avisos(jsonb) from public, anon, authenticated;
