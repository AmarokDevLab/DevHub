-- ============================================================
-- DEVHUB - MÓDULO PROYECTOS
-- Ejecutar después de Autenticación/Perfiles y Biblioteca.
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

-- ============================================================
-- 1. PROYECTOS
-- ============================================================

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    client_name text null,
    description text null,
    project_type text not null default 'personal',
    status text not null default 'planning',
    start_date date null,
    end_date date null,
    repository_url text null,
    production_url text null,
    testing_url text null,
    domain text null,
    color text not null default '#7C6FF2',
    icon text not null default 'code',
    is_pinned boolean not null default false,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint projects_name_length check (char_length(trim(name)) between 1 and 150),
    constraint projects_client_name_length check (client_name is null or char_length(trim(client_name)) between 1 and 150),
    constraint projects_description_length check (description is null or char_length(description) <= 3000),
    constraint projects_project_type check (project_type in ('personal','client','internal','experimental','educational','product')),
    constraint projects_status check (status in ('planning','active','paused','testing','completed','cancelled','archived')),
    constraint projects_dates_valid check (end_date is null or start_date is null or end_date >= start_date),
    constraint projects_repository_url_length check (repository_url is null or char_length(trim(repository_url)) <= 2048),
    constraint projects_repository_url_protocol check (repository_url is null or lower(trim(repository_url)) ~ '^https?://'),
    constraint projects_production_url_length check (production_url is null or char_length(trim(production_url)) <= 2048),
    constraint projects_production_url_protocol check (production_url is null or lower(trim(production_url)) ~ '^https?://'),
    constraint projects_testing_url_length check (testing_url is null or char_length(trim(testing_url)) <= 2048),
    constraint projects_testing_url_protocol check (testing_url is null or lower(trim(testing_url)) ~ '^https?://'),
    constraint projects_domain_length check (domain is null or char_length(trim(domain)) <= 255),
    constraint projects_domain_no_spaces check (domain is null or domain !~ '[[:space:]]'),
    constraint projects_color_format check (color ~ '^#[0-9A-Fa-f]{6}$'),
    constraint projects_icon_format check (icon ~ '^[a-z0-9][a-z0-9_-]{0,49}$'),
    constraint projects_user_id_id_unique unique (user_id, id)
);

comment on table public.projects is 'Aplicaciones, sitios web, APIs y demás iniciativas administradas en DevHub.';
comment on column public.projects.domain is 'Dominio normalizado sin protocolo, ruta ni espacios.';
comment on column public.projects.icon is 'Identificador seguro del icono; nunca contiene HTML arbitrario.';

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_projects_user_status on public.projects(user_id, status);
create index if not exists idx_projects_user_type on public.projects(user_id, project_type);
create index if not exists idx_projects_user_created on public.projects(user_id, created_at desc);
create index if not exists idx_projects_user_updated on public.projects(user_id, updated_at desc);
create index if not exists idx_projects_user_start_date on public.projects(user_id, start_date desc);
create index if not exists idx_projects_user_archived on public.projects(user_id, is_archived);
create index if not exists idx_projects_user_pinned on public.projects(user_id, is_pinned) where is_pinned = true;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

-- ============================================================
-- 2. TECNOLOGÍAS
-- ============================================================

create table if not exists public.technologies (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    normalized_name text not null,
    color text null,
    icon text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint technologies_name_length check (char_length(trim(name)) between 1 and 60),
    constraint technologies_normalized_name_length check (char_length(trim(normalized_name)) between 1 and 60),
    constraint technologies_color_format check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
    constraint technologies_icon_format check (icon is null or icon ~ '^[a-z0-9][a-z0-9_-]{0,49}$'),
    constraint technologies_unique_normalized_name unique (user_id, normalized_name),
    constraint technologies_user_id_id_unique unique (user_id, id)
);

create or replace function public.normalize_technology_name()
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

revoke all on function public.normalize_technology_name()
from public, anon, authenticated;

drop trigger if exists technologies_normalize_name on public.technologies;
create trigger technologies_normalize_name
before insert or update of name on public.technologies
for each row execute function public.normalize_technology_name();

drop trigger if exists technologies_set_updated_at on public.technologies;
create trigger technologies_set_updated_at before update on public.technologies
for each row execute function public.set_updated_at();

create index if not exists idx_technologies_user on public.technologies(user_id);
create index if not exists idx_technologies_user_name on public.technologies(user_id, normalized_name);

-- ============================================================
-- 3. RELACIÓN PROYECTO - TECNOLOGÍA
-- ============================================================

create table if not exists public.project_technologies (
    user_id uuid not null references auth.users(id) on delete cascade,
    project_id uuid not null,
    technology_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (user_id, project_id, technology_id),
    constraint project_technologies_project_owner_fk
        foreign key (user_id, project_id)
        references public.projects(user_id, id)
        on delete cascade,
    constraint project_technologies_technology_owner_fk
        foreign key (user_id, technology_id)
        references public.technologies(user_id, id)
        on delete cascade
);

create index if not exists idx_project_technologies_user on public.project_technologies(user_id);
create index if not exists idx_project_technologies_project on public.project_technologies(user_id, project_id);
create index if not exists idx_project_technologies_technology on public.project_technologies(user_id, technology_id);

-- ============================================================
-- 4. RLS Y PRIVILEGIOS
-- ============================================================

alter table public.projects enable row level security;
alter table public.technologies enable row level security;
alter table public.project_technologies enable row level security;

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_select_own" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "technologies_select_own" on public.technologies;
drop policy if exists "technologies_insert_own" on public.technologies;
drop policy if exists "technologies_update_own" on public.technologies;
drop policy if exists "technologies_delete_own" on public.technologies;
create policy "technologies_select_own" on public.technologies for select to authenticated using ((select auth.uid()) = user_id);
create policy "technologies_insert_own" on public.technologies for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "technologies_update_own" on public.technologies for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "technologies_delete_own" on public.technologies for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "project_technologies_select_own" on public.project_technologies;
drop policy if exists "project_technologies_insert_own" on public.project_technologies;
drop policy if exists "project_technologies_delete_own" on public.project_technologies;
create policy "project_technologies_select_own" on public.project_technologies for select to authenticated using ((select auth.uid()) = user_id);
create policy "project_technologies_insert_own" on public.project_technologies for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "project_technologies_delete_own" on public.project_technologies for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.projects from anon;
revoke all on table public.technologies from anon;
revoke all on table public.project_technologies from anon;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.technologies to authenticated;
grant select, insert, delete on table public.project_technologies to authenticated;

-- ============================================================
-- 5. INTEGRACIÓN SEGURA CON BIBLIOTECA
-- ============================================================
-- La relación compuesta evita asociar un recurso a un proyecto ajeno.
-- Al eliminar el proyecto solo project_id se vuelve NULL; el recurso se conserva.

do $$
begin
    if to_regclass('public.library_items') is not null then
        if not exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'library_items' and column_name = 'project_id'
        ) then
            alter table public.library_items add column project_id uuid null;
        end if;

        if not exists (
            select 1 from pg_constraint
            where conname = 'library_items_user_id_id_unique'
              and conrelid = 'public.library_items'::regclass
        ) then
            alter table public.library_items
            add constraint library_items_user_id_id_unique unique (user_id, id);
        end if;

        update public.library_items li
        set project_id = null
        where project_id is not null
          and not exists (
              select 1 from public.projects p
              where p.user_id = li.user_id and p.id = li.project_id
          );

        alter table public.library_items
        drop constraint if exists library_items_project_owner_fk;

        alter table public.library_items
        add constraint library_items_project_owner_fk
        foreign key (user_id, project_id)
        references public.projects(user_id, id)
        on delete set null (project_id);

        comment on column public.library_items.project_id is
        'Proyecto opcional del mismo usuario. El recurso se conserva al eliminar el proyecto.';
    end if;
end
$$;
