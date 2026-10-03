-- Mejoras de experiencia (3 de octubre de 2026)
-- 1. Tipo de reunión en las reservas + recordatorio 24 h antes
-- 2. Opiniones con sector y foto (con permiso)
-- 3. Formulario de contacto, cuestionario para clientes y boletín
-- Todos los avisos por email los manda la edge function "avisos".

/* ---------- 1. Reservas: tipo de reunión y recordatorio ---------- */
alter table public.bookings
  add column if not exists meeting_type text not null default 'primera'
    check (meeting_type in ('primera', 'presupuesto', 'seguimiento')),
  add column if not exists reminded_at timestamptz;

drop function if exists public.book_appointment(text, text, text, text, timestamptz);
create or replace function public.book_appointment(
  p_name text, p_email text, p_phone text, p_topic text, p_starts_at timestamptz,
  p_type text default 'primera'
) returns timestamptz
language plpgsql security definer set search_path to ''
as $function$
declare
    v_day date := (p_starts_at at time zone 'Atlantic/Canary')::date;
    v_headers json := nullif(current_setting('request.headers', true), '')::json;
    v_ip text := coalesce(
        v_headers ->> 'cf-connecting-ip',
        v_headers ->> 'x-real-ip',
        nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')
    );
    v_ip_hash text := case when v_ip is null then null else md5('mario-web-reservas:' || v_ip) end;
    v_type text := coalesce(nullif(btrim(p_type), ''), 'primera');
begin
    if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80
       or char_length(btrim(coalesce(p_email, ''))) > 120
       or btrim(coalesce(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       or char_length(coalesce(p_phone, '')) > 30
       or char_length(coalesce(p_topic, '')) > 500
       or v_type not in ('primera', 'presupuesto', 'seguimiento') then
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

    insert into public.bookings (name, email, phone, topic, starts_at, ip_hash, meeting_type)
    values (btrim(p_name), lower(btrim(p_email)),
            nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_topic, '')), ''),
            p_starts_at, v_ip_hash, v_type);
    return p_starts_at;
exception
    when unique_violation then raise exception 'slot_unavailable';
end;
$function$;
revoke all on function public.book_appointment(text, text, text, text, timestamptz, text) from public;
grant execute on function public.book_appointment(text, text, text, text, timestamptz, text) to anon, authenticated;

-- Llamada genérica a la edge function de avisos
create or replace function public.call_avisos(p_body jsonb) returns void
language plpgsql security definer set search_path to ''
as $function$
begin
    perform net.http_post(
        url := 'https://uaojfcqpdngoqpjrmttx.supabase.co/functions/v1/avisos',
        body := p_body,
        headers := jsonb_build_object('Content-Type', 'application/json')
    );
end;
$function$;
revoke all on function public.call_avisos(jsonb) from public, anon, authenticated;

-- Cada hora se buscan las reuniones de mañana que todavía no tienen recordatorio
create extension if not exists pg_cron;
select cron.unschedule('recordatorios-reuniones') where exists (select 1 from cron.job where jobname = 'recordatorios-reuniones');
select cron.schedule('recordatorios-reuniones', '5 * * * *', $$select public.call_avisos('{"tipo":"recordatorios"}'::jsonb)$$);

/* ---------- 2. Opiniones con sector y foto ---------- */
alter table public.comments
  add column if not exists sector text,
  add column if not exists photo_url text,
  add column if not exists photo_consent boolean not null default false;

drop policy if exists "Visitantes: escribir comentarios (quedan pendientes)" on public.comments;
create policy "Visitantes: escribir comentarios (quedan pendientes)" on public.comments
  for insert to anon with check (
    approved = false
    and length(btrim(name)) between 1 and 50
    and length(btrim(message)) between 1 and 500
    and (sector is null or length(btrim(sector)) <= 60)
    and (photo_url is null or (
      photo_consent
      and photo_url like 'https://uaojfcqpdngoqpjrmttx.supabase.co/storage/v1/object/public/opiniones/%'
    ))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('opiniones', 'opiniones', true, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp'];

drop policy if exists "Visitantes: subir foto de opinion" on storage.objects;
create policy "Visitantes: subir foto de opinion" on storage.objects
  for insert to anon with check (bucket_id = 'opiniones' and storage.extension(name) in ('jpg', 'webp'));
drop policy if exists "Admin: fotos de opiniones" on storage.objects;
create policy "Admin: fotos de opiniones" on storage.objects
  for all to authenticated using (bucket_id = 'opiniones' and (select public.is_admin()))
  with check (bucket_id = 'opiniones' and (select public.is_admin()));

/* ---------- 3. Contacto, cuestionario y boletín ---------- */
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 80),
  email text not null check (length(email) <= 120 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  kind text check (kind is null or length(kind) <= 40),
  message text not null check (length(btrim(message)) between 5 and 1500),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 80),
  email text not null check (length(email) <= 120 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  business text not null check (length(btrim(business)) between 1 and 120),
  answers jsonb not null default '{}'::jsonb check (length(answers::text) <= 8000),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(email) <= 120 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token uuid not null default gen_random_uuid(),
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  welcomed_at timestamptz
);

alter table public.contact_messages enable row level security;
alter table public.briefs enable row level security;
alter table public.subscribers enable row level security;

-- Los visitantes solo pueden ESCRIBIR (no leer). Mario lo ve todo desde /admin.
drop policy if exists "Visitantes: enviar mensaje" on public.contact_messages;
create policy "Visitantes: enviar mensaje" on public.contact_messages for insert to anon
  with check (done = false and notified_at is null);
drop policy if exists "Visitantes: enviar cuestionario" on public.briefs;
create policy "Visitantes: enviar cuestionario" on public.briefs for insert to anon
  with check (done = false and notified_at is null);
drop policy if exists "Visitantes: apuntarse al boletin" on public.subscribers;
create policy "Visitantes: apuntarse al boletin" on public.subscribers for insert to anon
  with check (unsubscribed = false and notified_at is null and welcomed_at is null);

drop policy if exists "Solo admin: mensajes" on public.contact_messages;
create policy "Solo admin: mensajes" on public.contact_messages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Solo admin: cuestionarios" on public.briefs;
create policy "Solo admin: cuestionarios" on public.briefs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Solo admin: suscriptores" on public.subscribers;
create policy "Solo admin: suscriptores" on public.subscribers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant insert on public.contact_messages, public.briefs, public.subscribers to anon;
grant select, insert, update, delete on public.contact_messages, public.briefs, public.subscribers to authenticated;

-- Freno contra spam: como mucho 6 envíos de cada tipo cada 10 minutos
create or replace function public.limit_forms() returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare n int;
begin
  execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name) into n;
  if n >= 6 then raise exception 'too_many'; end if;
  new.email := lower(btrim(new.email));
  return new;
end;
$function$;

-- Aviso por email a Mario (y bienvenida al suscriptor cuando haya dominio)
create or replace function public.notify_form() returns trigger
language plpgsql security definer set search_path to ''
as $function$
begin
  perform public.call_avisos(jsonb_build_object('tipo', tg_table_name, 'id', new.id));
  return new;
end;
$function$;

drop trigger if exists contact_messages_limit on public.contact_messages;
create trigger contact_messages_limit before insert on public.contact_messages for each row execute function public.limit_forms();
drop trigger if exists briefs_limit on public.briefs;
create trigger briefs_limit before insert on public.briefs for each row execute function public.limit_forms();
drop trigger if exists subscribers_limit on public.subscribers;
create trigger subscribers_limit before insert on public.subscribers for each row execute function public.limit_forms();

drop trigger if exists contact_messages_notify on public.contact_messages;
create trigger contact_messages_notify after insert on public.contact_messages for each row execute function public.notify_form();
drop trigger if exists briefs_notify on public.briefs;
create trigger briefs_notify after insert on public.briefs for each row execute function public.notify_form();
drop trigger if exists subscribers_notify on public.subscribers;
create trigger subscribers_notify after insert on public.subscribers for each row execute function public.notify_form();
