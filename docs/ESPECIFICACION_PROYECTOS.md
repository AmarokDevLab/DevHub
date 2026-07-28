Actúa como un **Arquitecto de Software Senior**, **Frontend Technical Lead**, **UX/UI Designer Senior**, **Especialista en Supabase**, **Diseñador de Producto** y **Especialista en accesibilidad web**.

Debes construir únicamente el módulo **Proyectos** para una aplicación llamada **DevHub**.

DevHub es una base de conocimiento personal para desarrolladores. La aplicación es 100 % frontend, se publica en GitHub Pages y utiliza Supabase para autenticación, base de datos, almacenamiento y seguridad mediante Row Level Security.

No construyas todavía el Diario de Desarrollo, Roadmap, Ideas, Prompts, DevVault, Archivos ni Biblioteca completos. Sin embargo, el módulo Proyectos debe quedar preparado para integrarse posteriormente con esos módulos.

## Objetivo del módulo

El módulo Proyectos permitirá registrar y administrar aplicaciones, sitios web, APIs, productos digitales, desarrollos internos o cualquier iniciativa técnica en la que el usuario esté trabajando.

El proyecto será una de las entidades centrales de DevHub.

Cada proyecto funcionará como punto de reunión de toda la información relacionada con una iniciativa.

Posteriormente, dentro de un proyecto se podrán consultar:

* Diario de desarrollo.
* Roadmap.
* Ideas.
* Prompts.
* DevVault.
* Biblioteca.
* Archivos.

El módulo debe evitar que la información relacionada con un proyecto quede dispersa entre distintas secciones.

## Tecnologías permitidas

Utiliza exclusivamente:

* HTML5.
* CSS3.
* JavaScript ES6+ mediante módulos.
* Bootstrap 5.x.
* Supabase JS.
* Supabase Authentication.
* Supabase Database.
* Supabase Storage.
* PostgreSQL mediante Supabase.
* Row Level Security.

No utilizar:

* Tailwind CSS.
* React.
* Vue.
* Angular.
* Svelte.
* TypeScript.
* Material UI.
* Font Awesome.
* Ningún framework CSS adicional.
* Backend propio.
* Node.js como servidor.
* Express.

Bootstrap debe ser el único framework CSS.

Para iconos utiliza preferentemente SVG inline. Puedes usar Bootstrap Icons únicamente si se incorpora como dependencia independiente y justificada.

## Seguridad obligatoria

El usuario debe haber iniciado sesión para acceder al módulo.

Cada proyecto debe pertenecer al usuario autenticado.

La tabla principal debe incluir:

```text
user_id uuid not null
```

y todas las operaciones deben validarse mediante:

```sql
auth.uid()
```

Activa Row Level Security en todas las tablas relacionadas.

Cada usuario únicamente podrá:

* Consultar sus propios proyectos.
* Crear proyectos a su nombre.
* Modificar sus propios proyectos.
* Archivar sus propios proyectos.
* Eliminar sus propios proyectos.
* Consultar únicamente las tecnologías asociadas a sus proyectos.
* Relacionar registros de otros módulos únicamente con sus propios proyectos.

No confíes en filtros del frontend como mecanismo de seguridad.

La protección real debe implementarse mediante políticas RLS.

Nunca utilices en el frontend:

* `service_role`.
* Secret keys.
* Credenciales administrativas.
* Tokens permanentes.
* Claves privadas.

Utiliza solamente la URL pública de Supabase y la Publishable Key o clave pública `anon`.

## Información de cada proyecto

Cada proyecto debe almacenar:

* Nombre.
* Cliente.
* Descripción.
* Estado.
* Tecnologías utilizadas.
* Fecha de inicio.
* Fecha de finalización.
* Repositorio Git.
* URL de producción.
* URL de pruebas.
* Dominio.
* Color.
* Icono.
* Estado destacado.
* Estado archivado.
* Fecha de creación.
* Fecha de actualización.

El campo cliente debe ser opcional.

El proyecto puede ser:

* Personal.
* De cliente.
* Interno.
* Experimental.
* Educativo.
* Producto propio.

Incluye un campo opcional `project_type` para representar este tipo de proyecto.

## Estados del proyecto

Utiliza valores internos consistentes:

```text
planning
active
paused
testing
completed
cancelled
archived
```

Muestra sus nombres en español:

* Planeación.
* Activo.
* Pausado.
* En pruebas.
* Completado.
* Cancelado.
* Archivado.

El estado predeterminado debe ser:

```text
planning
```

No utilices textos libres para el estado.

## Tecnologías utilizadas

Un proyecto puede utilizar múltiples tecnologías.

Ejemplos:

* HTML.
* CSS.
* JavaScript.
* Bootstrap.
* Supabase.
* PostgreSQL.
* .NET.
* Blazor.
* ServiceNow.
* Docker.
* GitHub Actions.

No almacenes las tecnologías como una cadena separada por comas.

Utiliza una relación muchos a muchos mediante:

```text
technologies
project_technologies
```

Cada tecnología debe pertenecer al usuario.

El usuario debe poder:

* Seleccionar tecnologías existentes.
* Crear una tecnología desde el mismo formulario.
* Quitar tecnologías antes de guardar.
* Filtrar proyectos por tecnología.
* Asignar un color o icono opcional a cada tecnología.

Evita duplicados para un mismo usuario sin distinguir mayúsculas y minúsculas.

Ejemplo:

```text
JavaScript
javascript
JAVASCRIPT
```

deben considerarse la misma tecnología.

## Pantalla principal

La pantalla principal debe mostrar:

* Título “Proyectos”.
* Cantidad total de proyectos.
* Cantidad de proyectos activos.
* Buscador.
* Filtro por estado.
* Filtro por tipo.
* Filtro por tecnología.
* Filtro de proyectos destacados.
* Filtro de proyectos archivados.
* Ordenamiento.
* Botón “Nuevo proyecto”.
* Alternador entre vista de tarjetas y vista compacta.

En dispositivos móviles, los filtros secundarios deben mostrarse dentro de un panel desplegable o drawer.

No satures la cabecera con demasiados controles visibles.

## Tarjeta de proyecto

Cada tarjeta debe mostrar:

* Icono del proyecto.
* Color representativo.
* Nombre.
* Cliente, si existe.
* Descripción breve.
* Estado.
* Tipo de proyecto.
* Tecnologías principales.
* Fecha de inicio.
* Fecha de última actualización.
* Indicador de destacado.
* Accesos rápidos.
* Menú de acciones.

Acciones disponibles:

* Abrir proyecto.
* Editar.
* Destacar o quitar de destacados.
* Archivar o restaurar.
* Abrir repositorio.
* Abrir producción.
* Abrir pruebas.
* Copiar URL.
* Eliminar.

No muestres botones de repositorio, producción o pruebas cuando no exista la URL correspondiente.

Las URLs externas deben abrirse con:

```html
target="_blank"
rel="noopener noreferrer"
```

No conviertas toda la tarjeta en enlace si eso dificulta el acceso a las demás acciones.

## Vista de detalle del proyecto

Al abrir un proyecto, muestra una vista de detalle que funcione como centro de información.

Debe incluir:

### Encabezado

* Nombre.
* Icono.
* Color.
* Estado.
* Cliente.
* Tipo.
* Descripción.
* Fecha de inicio.
* Fecha de finalización.
* Tecnologías.
* Botón editar.
* Botón destacar.
* Menú de acciones.

### Enlaces técnicos

* Repositorio Git.
* Producción.
* Pruebas.
* Dominio.

### Resumen de módulos relacionados

Incluye tarjetas o pestañas para:

* Diario.
* Roadmap.
* Ideas.
* Prompts.
* DevVault.
* Biblioteca.
* Archivos.

En esta etapa, si esos módulos todavía no están construidos, muestra estados preparados como:

```text
0 entradas
0 elementos
0 archivos
```

No inventes registros.

No construyas lógica falsa.

Cada tarjeta debe quedar preparada para recibir posteriormente el conteo real desde Supabase.

La Biblioteca ya existe conceptualmente como reemplazo del módulo Favoritos. Utiliza siempre el nombre:

```text
Biblioteca
```

No utilices el término Favoritos dentro de la interfaz.

## Formulario de proyecto

El formulario debe incluir secciones claras.

### Información principal

* Nombre.
* Cliente.
* Descripción.
* Tipo de proyecto.
* Estado.

### Identidad visual

* Color.
* Icono.

### Tecnologías

* Selector múltiple.
* Crear tecnología.
* Quitar tecnología.

### Fechas

* Fecha de inicio.
* Fecha de finalización.

### Enlaces técnicos

* Repositorio Git.
* URL de producción.
* URL de pruebas.
* Dominio.

### Opciones

* Destacado.
* Archivado.

## Validaciones

El nombre debe ser obligatorio.

Longitud máxima recomendada:

```text
150 caracteres
```

La descripción debe ser opcional.

Longitud máxima recomendada:

```text
3000 caracteres
```

Las URLs deben aceptar únicamente:

```text
http
https
```

El repositorio puede aceptar URLs de:

* GitHub.
* GitLab.
* Bitbucket.
* Otros proveedores Git.

No limites innecesariamente el repositorio únicamente a GitHub, aunque la etiqueta visible puede ser “Repositorio Git”.

El dominio puede guardarse como:

```text
devhub.app
```

o como URL completa.

Define una estrategia consistente:

* O almacenar el dominio sin protocolo.
* O normalizarlo como URL.

Explica cuál opción eliges.

La fecha de finalización no puede ser anterior a la fecha de inicio.

Un proyecto completado puede tener fecha de finalización opcional, pero la interfaz debe recomendar capturarla.

No permitas guardar colores que no cumplan el formato hexadecimal:

```text
#RRGGBB
```

El icono debe almacenarse como un identificador seguro, no como HTML arbitrario.

## Diseño visual

Utiliza un estilo de **Claymorphism profesional**.

Características:

* Formas suaves.
* Tarjetas ligeramente infladas.
* Bordes redondeados.
* Sombras exteriores suaves.
* Sombras interiores discretas.
* Superficies con volumen moderado.
* Mucho espacio visual.
* Buena legibilidad.
* Apariencia tecnológica y profesional.
* No infantil.
* No excesivamente decorativo.

No utilices líneas horizontales como divisores principales.

Separa las secciones mediante:

* Espaciado.
* Contraste.
* Elevación.
* Cambios de superficie.
* Color.
* Jerarquía tipográfica.

## Responsive Design

La interfaz debe ser Mobile First y 100 % responsiva.

Debe funcionar desde 320 px de ancho.

### Móvil

* Una tarjeta por fila.
* Botón “Nuevo proyecto” fácilmente accesible.
* Buscador visible.
* Filtros secundarios en panel.
* Formulario en una sola columna.
* Acciones táctiles de al menos 44 px.
* Detalle del proyecto en bloques verticales.

### Tablet

* Hasta 2 tarjetas por fila.
* Filtros compactos.
* Formulario dividido en secciones.

### Escritorio

* Entre 3 y 4 tarjetas por fila.
* Barra superior con buscador y filtros principales.
* Detalle del proyecto con resumen, enlaces y módulos relacionados.
* Formulario en panel lateral, modal amplio o vista integrada.

No debe existir desplazamiento horizontal.

## UX

Reduce la navegación innecesaria.

El usuario debe poder:

* Crear un proyecto desde la pantalla principal.
* Editar sin perder filtros.
* Crear tecnologías desde el formulario.
* Abrir el detalle sin recargar toda la aplicación.
* Destacar desde la tarjeta.
* Archivar desde la tarjeta.
* Copiar enlaces con una sola acción.
* Abrir el repositorio rápidamente.
* Crear un proyecto desde otros módulos mediante una opción de creación rápida.

El formulario de creación rápida debe solicitar solamente:

* Nombre.
* Estado.
* Color opcional.

Después, el usuario podrá completar el resto.

Mantén el estado de filtros y búsqueda después de editar.

No utilices `alert()`.

No utilices `window.confirm()`.

Antes de eliminar un proyecto muestra una confirmación clara.

La confirmación debe indicar:

* Nombre del proyecto.
* Que el proyecto será eliminado.
* Que las relaciones con otros módulos pueden verse afectadas.
* Que los datos relacionados no deben eliminarse automáticamente salvo que se haya diseñado expresamente.
* Botón “Cancelar”.
* Botón destructivo “Eliminar”.

## Comportamiento al eliminar proyectos

No elimines automáticamente información de otros módulos sin una decisión explícita.

Para relaciones como Biblioteca, Diario, Prompts, Ideas o DevVault, utiliza preferentemente:

```sql
on delete set null
```

De esta forma, si un proyecto se elimina, el recurso relacionado permanece como información global.

Para elementos que no tengan sentido sin proyecto, como ciertos elementos internos del Roadmap, puede utilizarse posteriormente:

```sql
on delete cascade
```

Documenta esta diferencia.

## Estados de la interfaz

Diseña los siguientes estados:

* Cargando.
* Lista con proyectos.
* Sin proyectos.
* Sin resultados.
* Error de conexión.
* Creación en proceso.
* Actualización en proceso.
* Archivado en proceso.
* Eliminación en proceso.
* Vista de detalle.
* Proyecto no encontrado.
* Sesión expirada.

El estado vacío debe mostrar:

* Mensaje claro.
* Explicación breve.
* Botón “Crear mi primer proyecto”.

## Búsqueda

La búsqueda debe considerar:

* Nombre.
* Cliente.
* Descripción.
* Dominio.
* Repositorio.
* URL de producción.
* URL de pruebas.

Implementa debounce.

No descargues todos los proyectos para buscarlos exclusivamente en el navegador.

Prepara consultas paginadas desde Supabase.

## Filtros

Incluye filtros por:

* Estado.
* Tipo.
* Tecnología.
* Destacado.
* Archivado.
* Fecha de inicio.

Incluye una acción:

```text
Limpiar filtros
```

## Ordenamiento

Permite ordenar por:

* Más recientes.
* Más antiguos.
* Actualizados recientemente.
* Nombre de A a Z.
* Nombre de Z a A.
* Fecha de inicio.
* Destacados primero.

El orden predeterminado debe ser:

```text
Actualizados recientemente
```

## Paginación

Utiliza paginación o carga incremental.

No consultes una cantidad ilimitada de registros.

Valor inicial recomendado:

```text
24 proyectos por página
```

Muestra números en lugar de números escritos con palabras.

Ejemplo correcto:

```text
12 proyectos activos
```

No:

```text
Doce proyectos activos
```

## Accesibilidad

Implementa:

* HTML semántico.
* Labels asociados.
* Foco visible.
* Navegación con teclado.
* Texto accesible para iconos.
* `aria-live` para mensajes dinámicos.
* Contraste WCAG AA.
* Estados de foco y hover distinguibles.
* Respeto a `prefers-reduced-motion`.
* Menús accesibles.
* Botones con nombres claros.
* Formularios navegables con teclado.

No utilices placeholders como sustituto de los labels.

## Arquitectura frontend

Organiza el código como mínimo en:

```text
/
├── proyectos.html
├── css/
│   ├── variables.css
│   ├── components.css
│   └── projects.css
├── js/
│   ├── config.js
│   ├── supabase-client.js
│   ├── auth-service.js
│   ├── project-service.js
│   ├── technology-service.js
│   ├── project-summary-service.js
│   ├── project-ui.js
│   ├── project-detail-ui.js
│   ├── validators.js
│   └── app.js
└── assets/
    └── projects-empty.svg
```

La estructura puede adaptarse a la arquitectura existente de DevHub, pero debe separar claramente:

* Acceso a datos.
* Validaciones.
* Estado de interfaz.
* Renderizado.
* Eventos.
* Consultas de resumen.
* Tecnologías.
* Autenticación.

## Modelo de datos esperado

Propón como mínimo estas tablas:

```text
projects
technologies
project_technologies
```

La tabla `projects` debe incluir:

```text
id
user_id
name
client_name
description
project_type
status
start_date
end_date
repository_url
production_url
testing_url
domain
color
icon
is_pinned
is_archived
created_at
updated_at
```

La tabla `technologies` debe incluir:

```text
id
user_id
name
normalized_name
color
icon
created_at
updated_at
```

La tabla `project_technologies` debe incluir:

```text
user_id
project_id
technology_id
created_at
```

Utiliza claves foráneas compuestas para garantizar que:

* El proyecto pertenece al usuario.
* La tecnología pertenece al usuario.
* La relación no puede mezclar información de usuarios distintos.

La tabla `projects` debe incluir:

```sql
unique (user_id, id)
```

La tabla `technologies` debe incluir:

```sql
unique (user_id, id)
```

La tabla `project_technologies` debe utilizar preferentemente:

```sql
primary key (
    user_id,
    project_id,
    technology_id
)
```

## Integración con Biblioteca

La tabla existente:

```text
public.library_items
```

ya contiene:

```text
project_id uuid null
```

Cuando la tabla `projects` exista, agrega una relación compuesta:

```sql
foreign key (user_id, project_id)
references public.projects(user_id, id)
on delete set null
```

Esto debe impedir que un usuario asocie un elemento de Biblioteca a un proyecto ajeno.

Antes de agregar la llave, verifica que:

```text
public.library_items
```

tenga:

```sql
unique (user_id, id)
```

y que `projects` tenga:

```sql
unique (user_id, id)
```

No elimines registros existentes de Biblioteca.

## Row Level Security

Genera políticas para:

### `projects`

* SELECT propio.
* INSERT propio.
* UPDATE propio.
* DELETE propio.

### `technologies`

* SELECT propio.
* INSERT propio.
* UPDATE propio.
* DELETE propio.

### `project_technologies`

* SELECT propio.
* INSERT propio.
* DELETE propio.

No se requiere UPDATE en la tabla intermedia.

Todas las políticas deben usar:

```sql
(select auth.uid()) = user_id
```

## Índices

Crea índices para:

### Proyectos

* `user_id`.
* `user_id, status`.
* `user_id, project_type`.
* `user_id, created_at`.
* `user_id, updated_at`.
* `user_id, is_pinned`.
* `user_id, is_archived`.
* `user_id, start_date`.

### Tecnologías

* `user_id`.
* `user_id, normalized_name`.

### Relación proyecto-tecnología

* `user_id`.
* `user_id, project_id`.
* `user_id, technology_id`.

## Consultas necesarias

Incluye código JavaScript para:

* Crear proyecto.
* Consultar proyectos paginados.
* Consultar un proyecto por ID.
* Actualizar proyecto.
* Destacar proyecto.
* Archivar proyecto.
* Eliminar proyecto.
* Crear tecnología.
* Asociar tecnologías.
* Reemplazar tecnologías de un proyecto.
* Consultar tecnologías.
* Consultar el resumen de módulos relacionados.
* Consultar elementos de Biblioteca relacionados con un proyecto.

## Requisitos de código

El código debe:

* Utilizar módulos JavaScript.
* Inicializar Supabase una sola vez.
* Verificar sesión antes de consultar.
* No aceptar `user_id` desde inputs.
* Obtener el usuario desde Supabase Auth.
* Incluir `user_id` en inserciones.
* Manejar errores con `try/catch`.
* Deshabilitar botones durante procesos asíncronos.
* Evitar envíos duplicados.
* No utilizar `innerHTML` con datos del usuario.
* Utilizar `textContent` o creación segura de nodos.
* Validar URLs.
* Validar fechas.
* Validar colores.
* Aplicar paginación.
* Mantener filtros.
* Limpiar listeners cuando sea necesario.
* Manejar una sesión expirada.
* No mostrar información privada antes de validar sesión.

## Entrega requerida

Entrega en este orden:

1. Explicación funcional del módulo.
2. Flujo de usuario.
3. Modelo de datos.
4. Diagrama de relaciones.
5. Script SQL completo.
6. Políticas RLS.
7. Integración con `library_items`.
8. Árbol de archivos.
9. Código completo de cada archivo.
10. Consultas a Supabase.
11. Manejo de tecnologías.
12. Vista de detalle.
13. Resumen de módulos relacionados.
14. Paginación, filtros y búsqueda.
15. Pruebas manuales.
16. Riesgos de seguridad.
17. Mejoras futuras.

No construyas otros módulos completos.

No utilices Tailwind CSS.

No utilices un backend personalizado.

No utilices la clave `service_role`.

No reemplaces el nombre Biblioteca por Favoritos.

Antes de entregar, verifica que:

* Un usuario no pueda consultar proyectos ajenos.
* Un usuario no pueda editar proyectos ajenos.
* Un usuario no pueda asignar tecnologías ajenas.
* Un usuario no pueda relacionar recursos de Biblioteca con proyectos ajenos.
* La eliminación de un proyecto no elimine accidentalmente elementos de Biblioteca.
* Las URLs externas sean seguras.
* Las fechas sean coherentes.
* La interfaz funcione en GitHub Pages.
* El diseño sea completamente responsivo.
* El módulo conserve el estilo Claymorphism de DevHub.

