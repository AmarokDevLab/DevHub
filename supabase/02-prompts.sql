-- ============================================================
-- DEVHUB - MÓDULO PROMPTS IA
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 1. FUNCIÓN COMPARTIDA PARA updated_at
-- ============================================================

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


-- ============================================================
-- 2. TIPOS PERMITIDOS
-- ============================================================

do $$
begin
    create type public.ai_prompt_type as enum (
        'chatgpt',
        'claude',
        'gemini',
        'image',
        'midjourney',
        'flux',
        'stable_diffusion'
    );
exception
    when duplicate_object then null;
end
$$;


-- ============================================================
-- 3. TABLA PRINCIPAL
-- ============================================================

create table if not exists public.ai_prompts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    title text not null,

    prompt_type public.ai_prompt_type not null,

    prompt_text text not null,

    negative_prompt text null,

    provider text null,

    model_name text null,

    json_content jsonb null,

    result_text text null,

    notes text null,

    reference_image_path text null,

    result_image_path text null,

    version text not null default '1',

    is_favorite boolean not null default false,

    last_used_at timestamptz null,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    search_vector tsvector generated always as (
        setweight(
            to_tsvector(
                'simple'::regconfig,
                coalesce(title, '')
            ),
            'A'
        )
        ||
        setweight(
            to_tsvector(
                'simple'::regconfig,
                coalesce(prompt_text, '')
            ),
            'A'
        )
        ||
        setweight(
            to_tsvector(
                'simple'::regconfig,
                coalesce(negative_prompt, '')
                || ' '
                || coalesce(provider, '')
                || ' '
                || coalesce(model_name, '')
            ),
            'B'
        )
        ||
        setweight(
            to_tsvector(
                'simple'::regconfig,
                coalesce(result_text, '')
                || ' '
                || coalesce(notes, '')
                || ' '
                || coalesce(json_content::text, '')
            ),
            'C'
        )
    ) stored,

    constraint ai_prompts_title_not_blank
        check (
            char_length(trim(title)) between 1 and 200
        ),

    constraint ai_prompts_prompt_not_blank
        check (
            char_length(trim(prompt_text)) >= 1
        ),

    constraint ai_prompts_title_length
        check (
            char_length(title) <= 200
        ),

    constraint ai_prompts_provider_length
        check (
            provider is null
            or char_length(provider) <= 100
        ),

    constraint ai_prompts_model_length
        check (
            model_name is null
            or char_length(model_name) <= 150
        ),

    constraint ai_prompts_version_length
        check (
            char_length(trim(version)) between 1 and 30
        ),

    constraint ai_prompts_reference_path_length
        check (
            reference_image_path is null
            or char_length(reference_image_path) <= 1000
        ),

    constraint ai_prompts_result_path_length
        check (
            result_image_path is null
            or char_length(result_image_path) <= 1000
        )
);


create index if not exists ai_prompts_user_updated_idx
on public.ai_prompts (
    user_id,
    updated_at desc
);

create index if not exists ai_prompts_user_type_idx
on public.ai_prompts (
    user_id,
    prompt_type
);

create index if not exists ai_prompts_user_favorite_idx
on public.ai_prompts (
    user_id,
    is_favorite
);

create index if not exists ai_prompts_search_vector_idx
on public.ai_prompts
using gin (search_vector);


drop trigger if exists ai_prompts_set_updated_at
on public.ai_prompts;

create trigger ai_prompts_set_updated_at
before update on public.ai_prompts
for each row
execute function public.set_updated_at();


-- ============================================================
-- 4. CATEGORÍAS
-- ============================================================

create table if not exists public.prompt_categories (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    normalized_name text generated always as (
        lower(trim(name))
    ) stored,

    color text null,

    icon text null,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint prompt_categories_name_length
        check (char_length(trim(name)) between 1 and 60),

    constraint prompt_categories_color_format
        check (
            color is null
            or color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    constraint prompt_categories_icon_length
        check (
            icon is null
            or char_length(icon) <= 60
        ),

    constraint prompt_categories_user_name_unique
        unique (user_id, normalized_name)
);


create index if not exists prompt_categories_user_idx
on public.prompt_categories (user_id);


drop trigger if exists prompt_categories_set_updated_at
on public.prompt_categories;

create trigger prompt_categories_set_updated_at
before update on public.prompt_categories
for each row
execute function public.set_updated_at();


-- ============================================================
-- 5. ETIQUETAS
-- ============================================================

create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,

    normalized_name text generated always as (
        lower(trim(name))
    ) stored,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint tags_name_length
        check (char_length(trim(name)) between 1 and 50),

    constraint tags_user_name_unique
        unique (user_id, normalized_name)
);


create index if not exists tags_user_idx
on public.tags (user_id);


drop trigger if exists tags_set_updated_at
on public.tags;

create trigger tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();


-- ============================================================
-- 6. RELACIÓN PROMPTS - CATEGORÍAS
-- ============================================================

create table if not exists public.prompt_category_links (
    prompt_id uuid not null
        references public.ai_prompts(id)
        on delete cascade,

    category_id uuid not null
        references public.prompt_categories(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    primary key (prompt_id, category_id)
);


create index if not exists prompt_category_links_user_idx
on public.prompt_category_links (user_id);

create index if not exists prompt_category_links_category_idx
on public.prompt_category_links (category_id);


-- ============================================================
-- 7. RELACIÓN PROMPTS - ETIQUETAS
-- ============================================================

create table if not exists public.prompt_tag_links (
    prompt_id uuid not null
        references public.ai_prompts(id)
        on delete cascade,

    tag_id uuid not null
        references public.tags(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    primary key (prompt_id, tag_id)
);


create index if not exists prompt_tag_links_user_idx
on public.prompt_tag_links (user_id);

create index if not exists prompt_tag_links_tag_idx
on public.prompt_tag_links (tag_id);


-- ============================================================
-- 8. VALIDAR RELACIONES DEL MISMO USUARIO
-- ============================================================

create or replace function public.validate_prompt_category_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.ai_prompts p
        where p.id = new.prompt_id
          and p.user_id = new.user_id
    ) then
        raise exception 'El prompt no pertenece al usuario.';
    end if;

    if not exists (
        select 1
        from public.prompt_categories c
        where c.id = new.category_id
          and c.user_id = new.user_id
    ) then
        raise exception 'La categoría no pertenece al usuario.';
    end if;

    return new;
end;
$$;


drop trigger if exists validate_prompt_category_owner_trigger
on public.prompt_category_links;

create trigger validate_prompt_category_owner_trigger
before insert or update
on public.prompt_category_links
for each row
execute function public.validate_prompt_category_owner();


create or replace function public.validate_prompt_tag_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.ai_prompts p
        where p.id = new.prompt_id
          and p.user_id = new.user_id
    ) then
        raise exception 'El prompt no pertenece al usuario.';
    end if;

    if not exists (
        select 1
        from public.tags t
        where t.id = new.tag_id
          and t.user_id = new.user_id
    ) then
        raise exception 'La etiqueta no pertenece al usuario.';
    end if;

    return new;
end;
$$;


drop trigger if exists validate_prompt_tag_owner_trigger
on public.prompt_tag_links;

create trigger validate_prompt_tag_owner_trigger
before insert or update
on public.prompt_tag_links
for each row
execute function public.validate_prompt_tag_owner();


-- ============================================================
-- 9. ACTIVAR RLS
-- ============================================================

alter table public.ai_prompts enable row level security;
alter table public.prompt_categories enable row level security;
alter table public.tags enable row level security;
alter table public.prompt_category_links enable row level security;
alter table public.prompt_tag_links enable row level security;


-- ============================================================
-- 10. POLÍTICAS PARA ai_prompts
-- ============================================================

drop policy if exists "ai_prompts_select_own"
on public.ai_prompts;

drop policy if exists "ai_prompts_insert_own"
on public.ai_prompts;

drop policy if exists "ai_prompts_update_own"
on public.ai_prompts;

drop policy if exists "ai_prompts_delete_own"
on public.ai_prompts;


create policy "ai_prompts_select_own"
on public.ai_prompts
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "ai_prompts_insert_own"
on public.ai_prompts
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "ai_prompts_update_own"
on public.ai_prompts
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "ai_prompts_delete_own"
on public.ai_prompts
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- 11. POLÍTICAS PARA CATEGORÍAS
-- ============================================================

create policy "prompt_categories_select_own"
on public.prompt_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "prompt_categories_insert_own"
on public.prompt_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "prompt_categories_update_own"
on public.prompt_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "prompt_categories_delete_own"
on public.prompt_categories
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- 12. POLÍTICAS PARA RELACIONES
-- ============================================================

create policy "prompt_category_links_select_own"
on public.prompt_category_links
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "prompt_category_links_insert_own"
on public.prompt_category_links
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "prompt_category_links_delete_own"
on public.prompt_category_links
for delete
to authenticated
using ((select auth.uid()) = user_id);


create policy "prompt_tag_links_select_own"
on public.prompt_tag_links
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "prompt_tag_links_insert_own"
on public.prompt_tag_links
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "prompt_tag_links_delete_own"
on public.prompt_tag_links
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- 13. PRIVILEGIOS
-- ============================================================

revoke all on public.ai_prompts from anon;
revoke all on public.prompt_categories from anon;
revoke all on public.tags from anon;
revoke all on public.prompt_category_links from anon;
revoke all on public.prompt_tag_links from anon;


grant select, insert, update, delete
on public.ai_prompts
to authenticated;

grant select, insert, update, delete
on public.prompt_categories
to authenticated;

grant select, insert, update, delete
on public.tags
to authenticated;

grant select, insert, delete
on public.prompt_category_links
to authenticated;

grant select, insert, delete
on public.prompt_tag_links
to authenticated;


revoke all on function public.validate_prompt_category_owner()
from public, anon, authenticated;

revoke all on function public.validate_prompt_tag_owner()
from public, anon, authenticated;