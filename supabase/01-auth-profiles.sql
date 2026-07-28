-- ============================================================
-- DEVHUB - ETAPA 1: AUTENTICACIÓN Y PERFILES
-- ============================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    avatar_path text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_display_name_length check (char_length(display_name) <= 80),
    constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 500)
);

comment on table public.profiles is
'Perfil público interno de cada usuario autenticado en DevHub.';
comment on column public.profiles.id is
'Identificador compartido con auth.users.id.';
comment on column public.profiles.avatar_path is
'Ruta del archivo en Supabase Storage; no almacena contraseñas ni URLs firmadas.';

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    requested_display_name text;
begin
    requested_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    insert into public.profiles (id, display_name)
    values (new.id, left(requested_display_name, 80))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
