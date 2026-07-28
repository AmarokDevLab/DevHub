-- ============================================================
-- DEVHUB - DIAGNÓSTICO DE REGISTROS INVISIBLES EN BIBLIOTECA
-- Ejecutar primero en Supabase > SQL Editor.
-- ============================================================

-- 1) Usuarios registrados y sus UUID reales.
select id, email, created_at
from auth.users
order by created_at;

-- 2) Cantidad de recursos por propietario.
select
    li.user_id,
    u.email,
    count(*) as total,
    count(*) filter (where coalesce(li.is_archived, false) = false) as activos,
    count(*) filter (where li.is_archived = true) as archivados
from public.library_items li
left join auth.users u on u.id = li.user_id
group by li.user_id, u.email
order by total desc;

-- 3) Registros cuyo user_id no corresponde a ningún usuario actual.
select li.id, li.title, li.user_id
from public.library_items li
left join auth.users u on u.id = li.user_id
where u.id is null
order by li.created_at desc;

-- 4) Políticas activas.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('library_items', 'library_categories', 'library_item_tags', 'tags')
order by tablename, policyname;

-- 5) Recargar el esquema de PostgREST.
notify pgrst, 'reload schema';

-- ============================================================
-- REPARACIÓN OPCIONAL PARA UNA INSTALACIÓN CON UN SOLO USUARIO
-- ============================================================
-- Este bloque solo se ejecuta si existe EXACTAMENTE un usuario en auth.users.
-- Conserva los recursos, elimina únicamente sus relaciones de etiquetas y
-- limpia category_id antes de reasignarlos para no violar llaves foráneas.
-- Si tienes más de un usuario, el bloque se detendrá sin modificar nada.
--
-- IMPORTANTE: ejecuta esta parte solamente si confirmaste que todos los
-- registros de library_items pertenecen al único usuario de la aplicación.

/*
do $$
declare
    v_target_user uuid;
    v_user_count integer;
begin
    select count(*), min(id)
      into v_user_count, v_target_user
    from auth.users;

    if v_user_count <> 1 then
        raise exception 'Reparación cancelada: existen % usuarios. Debes reasignar por UUID de forma manual.', v_user_count;
    end if;

    delete from public.library_item_tags
    where user_id <> v_target_user;

    update public.library_items
       set category_id = null,
           user_id = v_target_user,
           updated_at = now()
     where user_id <> v_target_user;

    raise notice 'Recursos reasignados al usuario %', v_target_user;
end $$;
*/
