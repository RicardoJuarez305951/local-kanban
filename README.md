# Kanban local multi-proyecto

SPA personal para organizar varios proyectos en tableros independientes. Funciona completamente
en el navegador, sin autenticación, backend ni dependencias de ejecución, y guarda la información
en IndexedDB.

Esta primera fase incluye creación y selección de proyectos, columnas predeterminadas y
persistencia local. Todavía no incluye tareas, edición, archivo o eliminación, drag and drop,
filtros, respaldos ni PWA.

## Ejecutar la aplicación

Clona o descarga el repositorio y abre `index.html` con doble clic. La aplicación no requiere
servidor, instalación, build, conexión a internet ni dependencias de ejecución.

Los scripts se cargan directamente desde el repositorio mediante `file://`. Mantén el repositorio
en la misma ruta absoluta y usa el mismo navegador y perfil para seguir viendo la misma base local.
Mover la carpeta o abrirla desde otro perfil puede crear un almacén IndexedDB independiente.

## Pruebas automatizadas

Las pruebas de dominio son opcionales para desarrollo y usan únicamente el runner incluido en
Node.js. No requieren instalar paquetes:

```powershell
npm.cmd test
```

Cubren validación y normalización del proyecto, generación de identificadores y creación de las
cinco columnas con sus tipos internos y orden estable.

## Pruebas manuales de la fase

1. Abre `index.html` directamente sin servidor y comprueba que aparece el estado para crear el primer proyecto,
   sin errores en la consola.
2. Envía un nombre compuesto solo por espacios y comprueba que se muestra la validación.
3. Crea un proyecto con nombre, descripción, repositorio y ruta local. Deben aparecer las columnas
   Entrada, Por hacer, En progreso, Bloqueado y Terminado.
4. Recarga la página y confirma que el proyecto y su selección permanecen.
5. Crea un segundo proyecto, cambia entre ambos y comprueba que cada uno carga sus propias cinco
   columnas.
6. Deja activo el segundo proyecto, recarga y confirma que vuelve a seleccionarse.
7. Usa texto como `<img src=x onerror=alert(1)>` en nombre o descripción y comprueba que se presenta
   literalmente, sin interpretarse como HTML.
8. En las herramientas del navegador abre **Application/Storage → IndexedDB → local-kanban** y
   comprueba los stores `projects`, `columns`, `tasks` y `settings`, sus índices y los `projectId`.
9. Repite el flujo principal en Chrome, Edge o Brave y en Firefox.

Para reiniciar los datos de prueba, elimina la base `local-kanban` desde las herramientas del
navegador. La aplicación no incluye todavía una acción destructiva para hacerlo.

## Arquitectura

```text
UI → estado central → servicios de dominio → repositorios/transacciones → IndexedDB
```

- `src/namespace.js`: crea el único namespace global `LocalKanban`.
- `src/core`: inicialización, estado observable y manejo de errores.
- `src/domain`: validación, modelos y coordinación de casos de uso.
- `src/persistence`: esquema IndexedDB, repositorios y unidad de trabajo transaccional.
- `src/ui`: eventos y renderizado seguro mediante propiedades de texto del DOM.
- `src/shared`: identificadores UUID y fechas ISO UTC.

La creación de un proyecto escribe el proyecto, sus cinco columnas y `activeProjectId` en una sola
transacción. La interfaz solo actualiza su estado después de que la transacción finaliza. Los tipos
de columna (`inbox`, `todo`, `in_progress`, `blocked`, `done`) controlarán las reglas futuras sin
depender de sus nombres visibles.

## Esquema IndexedDB v1

- `projects`: clave `id`; índices `name`, `archived`, `updatedAt`.
- `columns`: clave `id`; índices `projectId`, `[projectId, order]`, `type`.
- `tasks`: clave `id`; índices de proyecto, columna, fecha, prioridad y terminación.
- `settings`: clave `key`; almacena preferencias globales como `activeProjectId`.

La ruta local y la referencia de repositorio son texto informativo. La aplicación no intenta
acceder al sistema de archivos ni conectarse a servicios externos.

## Datos locales y Git

IndexedDB pertenece al perfil del navegador y se guarda fuera del repositorio, por lo que Git no
puede leer ni versionar los proyectos. El archivo `.gitignore` reserva `local-data/`, `backups/` y
`exports/` para copias manuales o una futura función de exportación, y también ignora archivos
`*.local-kanban.json`.

Los navegadores no estandarizan completamente el almacenamiento para direcciones `file://`. La
aplicación está orientada a navegadores modernos; antes de mover el repositorio o cambiar de perfil,
conserva un respaldo cuando la función de exportación esté disponible.

La carga directa y la persistencia se han verificado en Chrome y Edge. Firefox admite los scripts
clásicos, pero su política de almacenamiento para archivos locales puede variar entre versiones;
comprueba la persistencia con un proyecto de prueba antes de guardar información importante.
