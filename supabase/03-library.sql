-- ============================================================
-- DEVHUB - MÓDULO BIBLIOTECA
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

revoke all on function public.set_updated_at()
from public, anon, authenticated;


-- ============================================================
-- 2. CATEGORÍAS DE LA BIBLIOTECA
-- ============================================================

create table if not exists public.library_categories (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,
    normalized_name text not null,
    color text null,
    icon text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint library_categories_name_not_empty
        check (char_length(trim(name)) between 1 and 50),

    constraint library_categories_normalized_name_not_empty
        check (char_length(trim(normalized_name)) between 1 and 50),

    constraint library_categories_color_format
        check (
            color is null
            or color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    constraint library_categories_icon_length
        check (
            icon is null
            or char_length(icon) <= 50
        ),

    constraint library_categories_unique_name
        unique (user_id, normalized_name),

    constraint library_categories_user_id_id_unique
        unique (user_id, id)
);

comment on table public.library_categories is
'Categorías personales utilizadas para organizar la Biblioteca de DevHub.';


create index if not exists idx_library_categories_user
on public.library_categories(user_id);

create index if not exists idx_library_categories_user_name
on public.library_categories(user_id, normalized_name);


drop trigger if exists library_categories_set_updated_at
on public.library_categories;

create trigger library_categories_set_updated_at
before update on public.library_categories
for each row
execute function public.set_updated_at();


-- ============================================================
-- 3. ETIQUETAS REUTILIZABLES
-- ============================================================

create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null,
    normalized_name text not null,
    color text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tags_name_not_empty
        check (char_length(trim(name)) between 1 and 40),

    constraint tags_normalized_name_not_empty
        check (char_length(trim(normalized_name)) between 1 and 40),

    constraint tags_color_format
        check (
            color is null
            or color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    constraint tags_unique_normalized_name
        unique (user_id, normalized_name),

    constraint tags_user_id_id_unique
        unique (user_id, id)
);

comment on table public.tags is
'Etiquetas personales reutilizables en los módulos de DevHub.';


create index if not exists idx_tags_user
on public.tags(user_id);

create index if not exists idx_tags_user_name
on public.tags(user_id, normalized_name);


drop trigger if exists tags_set_updated_at
on public.tags;

create trigger tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();


-- ============================================================
-- 4. ELEMENTOS DE LA BIBLIOTECA
-- ============================================================

create table if not exists public.library_items (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    -- La llave foránea con projects se agregará cuando exista
    -- formalmente el módulo de Proyectos.
    project_id uuid null,

    category_id uuid null,

    resource_type text not null default 'other',

    url text not null,
    title text not null,
    description text null,
    personal_notes text null,

    preview_external_url text null,
    preview_storage_path text null,

    is_pinned boolean not null default false,
    is_archived boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint library_items_title_length
        check (char_length(trim(title)) between 1 and 200),

    constraint library_items_url_length
        check (char_length(trim(url)) between 8 and 2048),

    constraint library_items_url_protocol
        check (
            lower(trim(url)) ~ '^https?://'
        ),

    constraint library_items_resource_type
        check (
            resource_type in (
                'article',
                'tutorial',
                'video',
                'documentation',
                'component',
                'design',
                'repository',
                'tool',
                'other'
            )
        ),

    constraint library_items_description_length
        check (
            description is null
            or char_length(description) <= 2000
        ),

    constraint library_items_notes_length
        check (
            personal_notes is null
            or char_length(personal_notes) <= 10000
        ),

    constraint library_items_external_preview_length
        check (
            preview_external_url is null
            or char_length(preview_external_url) <= 2048
        ),

    constraint library_items_external_preview_protocol
        check (
            preview_external_url is null
            or lower(trim(preview_external_url)) ~ '^https?://'
        ),

    constraint library_items_storage_path_length
        check (
            preview_storage_path is null
            or char_length(preview_storage_path) <= 500
        ),

    constraint library_items_category_owner_fk
        foreign key (user_id, category_id)
        references public.library_categories(user_id, id)
        on delete set null (category_id),

    constraint library_items_user_id_id_unique
        unique (user_id, id)
);

comment on table public.library_items is
'Enlaces, recursos técnicos y referencias visuales guardados en la Biblioteca.';

comment on column public.library_items.preview_external_url is
'URL externa de una imagen de vista previa.';

comment on column public.library_items.preview_storage_path is
'Ruta privada del archivo dentro del bucket library-previews.';


create index if not exists idx_library_items_user_created
on public.library_items(user_id, created_at desc);

create index if not exists idx_library_items_user_updated
on public.library_items(user_id, updated_at desc);

create index if not exists idx_library_items_user_type
on public.library_items(user_id, resource_type);

create index if not exists idx_library_items_user_category
on public.library_items(user_id, category_id);

create index if not exists idx_library_items_user_project
on public.library_items(user_id, project_id);

create index if not exists idx_library_items_user_pinned
on public.library_items(user_id, is_pinned)
where is_pinned = true;

create index if not exists idx_library_items_user_archived
on public.library_items(user_id, is_archived);


drop trigger if exists library_items_set_updated_at
on public.library_items;

create trigger library_items_set_updated_at
before update on public.library_items
for each row
execute function public.set_updated_at();


-- ============================================================
-- 5. RELACIÓN ENTRE BIBLIOTECA Y ETIQUETAS
-- ============================================================
create table if not exists public.library_item_tags (
    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    library_item_id uuid not null,
    tag_id uuid not null,

    created_at timestamptz not null default now(),

    primary key (
        user_id,
        library_item_id,
        tag_id
    ),

    constraint library_item_tags_item_owner_fk
        foreign key (user_id, library_item_id)
        references public.library_items(user_id, id)
        on delete cascade,

    constraint library_item_tags_tag_owner_fk
        foreign key (user_id, tag_id)
        references public.tags(user_id, id)
        on delete cascade
);

comment on table public.library_item_tags is
'Relación muchos a muchos entre elementos de Biblioteca y etiquetas.';


create index if not exists idx_library_item_tags_user
on public.library_item_tags(user_id);

create index if not exists idx_library_item_tags_tag
on public.library_item_tags(user_id, tag_id);

create index if not exists idx_library_item_tags_item
on public.library_item_tags(user_id, library_item_id);


-- ============================================================
-- 6. ACTIVAR ROW LEVEL SECURITY
-- ============================================================

alter table public.library_categories enable row level security;
alter table public.tags enable row level security;
alter table public.library_items enable row level security;
alter table public.library_item_tags enable row level security;


-- ============================================================
-- 7. POLÍTICAS RLS DE CATEGORÍAS
-- ============================================================

drop policy if exists "library_categories_select_own"
on public.library_categories;

drop policy if exists "library_categories_insert_own"
on public.library_categories;

drop policy if exists "library_categories_update_own"
on public.library_categories;

drop policy if exists "library_categories_delete_own"
on public.library_categories;


create policy "library_categories_select_own"
on public.library_categories
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "library_categories_insert_own"
on public.library_categories
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "library_categories_update_own"
on public.library_categories
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "library_categories_delete_own"
on public.library_categories
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- 8. POLÍTICAS RLS DE ETIQUETAS
-- ============================================================

drop policy if exists "tags_select_own"
on public.tags;

drop policy if exists "tags_insert_own"
on public.tags;

drop policy if exists "tags_update_own"
on public.tags;

drop policy if exists "tags_delete_own"
on public.tags;


create policy "tags_select_own"
on public.tags
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "tags_insert_own"
on public.tags
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "tags_update_own"
on public.tags
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "tags_delete_own"
on public.tags
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- 9. POLÍTICAS RLS DE ELEMENTOS DE BIBLIOTECA
-- ============================================================

drop policy if exists "library_items_select_own"
on public.library_items;

drop policy if exists "library_items_insert_own"
on public.library_items;

drop policy if exists "library_items_update_own"
on public.library_items;

drop policy if exists "library_items_delete_own"
on public.library_items;


create policy "library_items_select_own"
on public.library_items
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "library_items_insert_own"
on public.library_items
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "library_items_update_own"
on public.library_items
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "library_items_delete_own"
on public.library_items
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


-- ============================================================
-- 10. POLÍTICAS RLS DE RELACIÓN CON ETIQUETAS
-- ============================================================

drop policy if exists "library_item_tags_select_own"
on public.library_item_tags;

drop policy if exists "library_item_tags_insert_own"
on public.library_item_tags;

drop policy if exists "library_item_tags_delete_own"
on public.library_item_tags;


create policy "library_item_tags_select_own"
on public.library_item_tags
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "library_item_tags_insert_own"
on public.library_item_tags
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "library_item_tags_delete_own"
on public.library_item_tags
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


-- No se necesita política UPDATE para library_item_tags.
-- Para cambiar etiquetas se elimina una relación y se crea otra.


-- ============================================================
-- 11. PRIVILEGIOS
-- ============================================================

revoke all on table public.library_categories from anon;
revoke all on table public.tags from anon;
revoke all on table public.library_items from anon;
revoke all on table public.library_item_tags from anon;


grant select, insert, update, delete
on table public.library_categories
to authenticated;

grant select, insert, update, delete
on table public.tags
to authenticated;

grant select, insert, update, delete
on table public.library_items
to authenticated;

grant select, insert, delete
on table public.library_item_tags
to authenticated;