-- ============================================================
-- DEVHUB - FUNDACIÓN COMPARTIDA
-- Ejecutar antes de Prompts, Biblioteca y Proyectos.
-- Unifica la función updated_at y la tabla compartida public.tags.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke all on function public.set_updated_at()
from public, anon, authenticated;

-- Esquema canónico compartido por Prompts y Biblioteca.
create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    normalized_name text not null,
    color text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Compatibilidad con una instalación anterior donde normalized_name
-- se hubiera creado como columna GENERATED por el SQL de Prompts.
do $$
declare
    generated_kind "char";
begin
    select a.attgenerated
      into generated_kind
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'tags'
       and a.attname = 'normalized_name'
       and not a.attisdropped;

    if generated_kind = 's' then
        alter table public.tags drop constraint if exists tags_user_name_unique;
        alter table public.tags drop constraint if exists tags_unique_normalized_name;
        alter table public.tags drop constraint if exists tags_user_normalized_name_unique;
        alter table public.tags drop column normalized_name;
        alter table public.tags add column normalized_name text;
    elsif generated_kind is null then
        alter table public.tags add column normalized_name text;
    end if;

    if not exists (
        select 1
          from information_schema.columns
         where table_schema = 'public'
           and table_name = 'tags'
           and column_name = 'color'
    ) then
        alter table public.tags add column color text null;
    end if;
end
$$;

update public.tags
set name = trim(regexp_replace(name, '[[:space:]]+', ' ', 'g')),
    normalized_name = lower(trim(regexp_replace(name, '[[:space:]]+', ' ', 'g')))
where normalized_name is null
   or normalized_name <> lower(trim(regexp_replace(name, '[[:space:]]+', ' ', 'g')))
   or name <> trim(regexp_replace(name, '[[:space:]]+', ' ', 'g'));

alter table public.tags
alter column normalized_name set not null;

create or replace function public.normalize_shared_tag_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.name := trim(regexp_replace(new.name, '[[:space:]]+', ' ', 'g'));
    new.normalized_name := lower(new.name);
    return new;
end;
$$;

revoke all on function public.normalize_shared_tag_name()
from public, anon, authenticated;

drop trigger if exists tags_normalize_name on public.tags;
create trigger tags_normalize_name
before insert or update of name
on public.tags
for each row
execute function public.normalize_shared_tag_name();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

-- Evita duplicados sin distinguir mayúsculas/minúsculas.
alter table public.tags drop constraint if exists tags_user_name_unique;
alter table public.tags drop constraint if exists tags_unique_normalized_name;
alter table public.tags drop constraint if exists tags_user_normalized_name_unique;
alter table public.tags
add constraint tags_user_normalized_name_unique
unique (user_id, normalized_name);

-- Necesaria para las llaves foráneas compuestas de Biblioteca.
do $$
begin
    if not exists (
        select 1
          from pg_constraint
         where conname = 'tags_user_id_id_unique'
           and conrelid = 'public.tags'::regclass
    ) then
        alter table public.tags
        add constraint tags_user_id_id_unique unique (user_id, id);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'tags_name_not_empty'
          and conrelid = 'public.tags'::regclass
    ) then
        alter table public.tags add constraint tags_name_not_empty
        check (char_length(trim(name)) between 1 and 50);
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'tags_color_format'
          and conrelid = 'public.tags'::regclass
    ) then
        alter table public.tags add constraint tags_color_format
        check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
    end if;
end
$$;

create index if not exists idx_tags_user on public.tags(user_id);
create index if not exists idx_tags_user_name on public.tags(user_id, normalized_name);

alter table public.tags enable row level security;

drop policy if exists "tags_select_own" on public.tags;
drop policy if exists "tags_insert_own" on public.tags;
drop policy if exists "tags_update_own" on public.tags;
drop policy if exists "tags_delete_own" on public.tags;

create policy "tags_select_own"
on public.tags for select to authenticated
using ((select auth.uid()) = user_id);

create policy "tags_insert_own"
on public.tags for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "tags_update_own"
on public.tags for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tags_delete_own"
on public.tags for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.tags from anon;
grant select, insert, update, delete on table public.tags to authenticated;
