-- Estadísticas propias: visitas a la web (sin cookies) y resumen diario de Instagram.
-- Solo se guarda la página, el idioma, de qué web viene la visita (solo el dominio) y si es móvil u ordenador.
-- La huella de la conexión (ip_hash, no la IP) sirve para frenar abusos y contar personas distintas; se borra a los 30 días.

create table if not exists public.page_views (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200),
  lang text not null default 'es' check (char_length(lang) <= 5),
  ref text check (char_length(ref) <= 100),
  device text check (device in ('movil', 'tablet', 'ordenador')),
  ip_hash text
);
create index if not exists page_views_created_idx on public.page_views (created_at);
create index if not exists page_views_ip_idx on public.page_views (ip_hash, created_at);
alter table public.page_views enable row level security;
drop policy if exists "Cualquiera puede contar una visita" on public.page_views;
create policy "Cualquiera puede contar una visita" on public.page_views for insert to anon, authenticated with check (char_length(path) <= 200);

create or replace function public.limit_views() returns trigger
language plpgsql security definer set search_path to ''
as $$
declare v_hash text := public.request_ip_hash();
begin
  new.ip_hash := v_hash;
  if v_hash is not null and (select count(*) from public.page_views v where v.ip_hash = v_hash and v.created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'too_many';
  end if;
  if (select count(*) from public.page_views v where v.created_at > now() - interval '1 minute') >= 300 then
    raise exception 'too_many';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_views() from public, anon, authenticated;
drop trigger if exists page_views_limit on public.page_views;
create trigger page_views_limit before insert on public.page_views for each row execute function public.limit_views();

create table if not exists public.instagram_daily (
  day date primary key,
  followers int, follows int, posts int, likes int, comments int,
  last_post timestamptz, top jsonb,
  updated_at timestamptz not null default now()
);
alter table public.instagram_daily enable row level security;

create or replace function public.call_instagram() returns void
language plpgsql security definer set search_path to ''
as $$
begin
  perform net.http_post(url := 'https://uaojfcqpdngoqpjrmttx.supabase.co/functions/v1/instagram', body := '{}'::jsonb, headers := jsonb_build_object('Content-Type', 'application/json'));
end;
$$;
revoke all on function public.call_instagram() from public, anon, authenticated;

select cron.schedule('instagram-diario', '15 */6 * * *', $$select public.call_instagram()$$);
select cron.schedule('visitas-limpieza', '30 3 * * *', $$update public.page_views set ip_hash = null where ip_hash is not null and created_at < now() - interval '30 days'; delete from public.page_views where created_at < now() - interval '400 days'$$);
