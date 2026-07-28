-- DEVHUB: diagnóstico rápido del módulo Biblioteca
-- Ejecutar en Supabase SQL Editor.

-- 1. Confirma que existen registros y revisa a qué usuario pertenecen.
select
    user_id,
    count(*) as total_recursos,
    count(*) filter (where is_archived = false) as activos,
    count(*) filter (where is_archived = true) as archivados
from public.library_items
group by user_id
order by total_recursos desc;

-- 2. Confirma políticas activas de las tablas de Biblioteca.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
      'library_items',
      'library_categories',
      'library_item_tags',
      'tags'
  )
order by tablename, policyname;

-- 3. Solicita a PostgREST recargar su caché de esquema si acabas de crear
--    o modificar llaves foráneas, tablas o políticas.
notify pgrst, 'reload schema';
