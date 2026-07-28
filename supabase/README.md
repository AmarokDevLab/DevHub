# SQL de DevHub

## Orden recomendado

Ejecuta los scripts completos en Supabase SQL Editor, en este orden:

1. `00-shared-foundation.sql`
2. `01-auth-profiles.sql`
3. `02-prompts.sql`
4. `03-library.sql`
5. `04-projects.sql`

`00-shared-foundation.sql` resuelve la incompatibilidad histórica de `public.tags`: Prompts la definía con `normalized_name` generado, mientras que Biblioteca esperaba `normalized_name` editable, `color` y una llave única compuesta. Debe ejecutarse primero en instalaciones nuevas y también puede alinear una instalación existente.

## Proyectos

- `domain` se almacena sin protocolo ni ruta (`devhub.app`). El frontend normaliza una URL completa al nombre de host.
- `is_archived` controla la visibilidad. Archivar no destruye el estado operativo anterior.
- `project_technologies` utiliza llaves compuestas para impedir relaciones entre usuarios.
- La relación de Biblioteca utiliza `ON DELETE SET NULL (project_id)`: al eliminar un proyecto, el recurso se conserva.
- Todas las tablas están protegidas mediante RLS; el frontend no sustituye esa seguridad.

## Actualización de una instalación existente

1. Crea un respaldo antes de ejecutar migraciones.
2. Ejecuta `00-shared-foundation.sql`.
3. Ejecuta `04-projects.sql`.
4. En Supabase, verifica que PostgREST haya actualizado la caché del esquema.
5. Prueba crear, editar, destacar, archivar y eliminar un proyecto con una sesión autenticada.
