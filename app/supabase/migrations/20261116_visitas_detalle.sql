-- Visitas con más detalle para la estadística propia: idioma del navegador, país aproximado, navegador,
-- sistema, pantalla, zona horaria, un número al azar por navegador (para saber quién vuelve)
-- y una marca para las visitas del propio Mario. Solo añade columnas: no borra ni cambia nada de lo que había.
alter table public.page_views
  add column if not exists vid text check (char_length(vid) <= 24),
  add column if not exists nav_lang text check (char_length(nav_lang) <= 12),
  add column if not exists langs text check (char_length(langs) <= 60),
  add column if not exists tz text check (char_length(tz) <= 40),
  add column if not exists country text check (char_length(country) <= 2),
  add column if not exists browser text check (char_length(browser) <= 20),
  add column if not exists os text check (char_length(os) <= 20),
  add column if not exists screen text check (char_length(screen) <= 11),
  add column if not exists src text check (char_length(src) <= 60),
  add column if not exists own boolean not null default false;
create index if not exists page_views_vid_idx on public.page_views (vid, created_at);

-- El país lo pone el servidor a partir de la conexión (la IP no se guarda).
create or replace function public.limit_views() returns trigger
language plpgsql security definer set search_path to ''
as $$
declare v_hash text := public.request_ip_hash();
  v_c text;
begin
  new.ip_hash := v_hash;
  new.country := null;
  begin
    v_c := upper(nullif(current_setting('request.headers', true), '')::json ->> 'cf-ipcountry');
    if v_c ~ '^[A-Z]{2}$' and v_c not in ('XX', 'T1') then new.country := v_c; end if;
  exception when others then new.country := null;
  end;
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
