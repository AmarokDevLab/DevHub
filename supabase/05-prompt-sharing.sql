-- ============================================================
-- DEVHUB - COMPARTIR PROMPTS COMO COPIAS INDEPENDIENTES
-- Ejecutar después de 01-auth-profiles.sql y 02-prompts.sql.
-- ============================================================

alter table public.ai_prompts
    add column if not exists shared_from_prompt_id uuid null,
    add column if not exists shared_by_user_id uuid null
        references auth.users(id) on delete set null,
    add column if not exists shared_at timestamptz null;

comment on column public.ai_prompts.shared_from_prompt_id is
'ID informativo del prompt de origen. No crea acceso al registro original.';

comment on column public.ai_prompts.shared_by_user_id is
'Usuario que envió esta copia.';

comment on column public.ai_prompts.shared_at is
'Fecha en que se generó la copia compartida.';

create index if not exists ai_prompts_shared_by_idx
on public.ai_prompts (user_id, shared_at desc)
where shared_at is not null;

create or replace function public.list_prompt_share_recipients()
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
    select
        p.id,
        coalesce(nullif(trim(p.display_name), ''), 'Usuario ' || left(p.id::text, 8))
    from public.profiles p
    where p.id <> (select auth.uid())
    order by 2, p.id;
$$;

create or replace function public.share_prompt_copy(
    source_prompt_id uuid,
    recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    caller_id uuid := (select auth.uid());
    copied_prompt_id uuid;
begin
    if caller_id is null then
        raise exception 'AUTH_REQUIRED' using errcode = '42501';
    end if;

    if recipient_id is null or recipient_id = caller_id then
        raise exception 'INVALID_RECIPIENT' using errcode = '22023';
    end if;

    if not exists (select 1 from public.profiles p where p.id = recipient_id) then
        raise exception 'RECIPIENT_NOT_FOUND' using errcode = '22023';
    end if;

    insert into public.ai_prompts (
        user_id, title, prompt_type, prompt_text, negative_prompt,
        provider, model_name, json_content, result_text, notes,
        reference_image_path, result_image_path, version, is_favorite,
        shared_from_prompt_id, shared_by_user_id, shared_at
    )
    select
        recipient_id, source.title, source.prompt_type, source.prompt_text,
        source.negative_prompt, source.provider, source.model_name,
        source.json_content, source.result_text, source.notes,
        source.reference_image_path, source.result_image_path, source.version,
        false, source.id, caller_id, now()
    from public.ai_prompts source
    where source.id = source_prompt_id
      and source.user_id = caller_id
    returning id into copied_prompt_id;

    if copied_prompt_id is null then
        raise exception 'PROMPT_NOT_FOUND_OR_NOT_OWNED' using errcode = '42501';
    end if;

    -- Crear en la cuenta receptora únicamente las categorías que no existan.
    insert into public.prompt_categories (user_id, name, color, icon)
    select distinct
        recipient_id,
        source_category.name,
        source_category.color,
        source_category.icon
    from public.prompt_category_links source_link
    join public.prompt_categories source_category
      on source_category.id = source_link.category_id
     and source_category.user_id = caller_id
    where source_link.prompt_id = source_prompt_id
      and source_link.user_id = caller_id
    on conflict (user_id, normalized_name) do nothing;

    -- Enlazar la copia con la categoría equivalente del destinatario.
    insert into public.prompt_category_links (prompt_id, category_id, user_id)
    select distinct
        copied_prompt_id,
        recipient_category.id,
        recipient_id
    from public.prompt_category_links source_link
    join public.prompt_categories source_category
      on source_category.id = source_link.category_id
     and source_category.user_id = caller_id
    join public.prompt_categories recipient_category
      on recipient_category.user_id = recipient_id
     and recipient_category.normalized_name = source_category.normalized_name
    where source_link.prompt_id = source_prompt_id
      and source_link.user_id = caller_id
    on conflict (prompt_id, category_id) do nothing;

    -- Crear en la cuenta receptora únicamente las etiquetas que no existan.
    insert into public.tags (user_id, name, color)
    select distinct
        recipient_id,
        source_tag.name,
        source_tag.color
    from public.prompt_tag_links source_link
    join public.tags source_tag
      on source_tag.id = source_link.tag_id
     and source_tag.user_id = caller_id
    where source_link.prompt_id = source_prompt_id
      and source_link.user_id = caller_id
    on conflict (user_id, normalized_name) do nothing;

    -- Enlazar la copia con la etiqueta equivalente del destinatario.
    insert into public.prompt_tag_links (prompt_id, tag_id, user_id)
    select distinct
        copied_prompt_id,
        recipient_tag.id,
        recipient_id
    from public.prompt_tag_links source_link
    join public.tags source_tag
      on source_tag.id = source_link.tag_id
     and source_tag.user_id = caller_id
    join public.tags recipient_tag
      on recipient_tag.user_id = recipient_id
     and recipient_tag.normalized_name = source_tag.normalized_name
    where source_link.prompt_id = source_prompt_id
      and source_link.user_id = caller_id
    on conflict (prompt_id, tag_id) do nothing;

    return copied_prompt_id;
end;
$$;

revoke all on function public.list_prompt_share_recipients() from public;
revoke all on function public.list_prompt_share_recipients() from anon;
grant execute on function public.list_prompt_share_recipients() to authenticated;

revoke all on function public.share_prompt_copy(uuid, uuid) from public;
revoke all on function public.share_prompt_copy(uuid, uuid) from anon;
grant execute on function public.share_prompt_copy(uuid, uuid) to authenticated;
