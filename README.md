# Kanban local multi-proyecto

SPA personal para organizar proyectos en tableros Kanban. Funciona como HTML, CSS y JavaScript
estatico: no requiere servidor, backend, build, instalacion ni dependencias de ejecucion.

La fuente portable de datos son archivos JSON editables en `my_projects/`.
Esa carpeta no esta ignorada por Git, para que puedas versionar proyectos si lo deseas.

## Ejecutar

Abre `index.html` con doble clic.

No hace falta ejecutar `npm install`, `npm start` ni un servidor local. El script `npm test` existe
solo para desarrollo.

## Flujo de datos

1. Guarda tus proyectos como `.json` dentro de `my_projects/`.
2. En la app, pulsa **Cargar JSON** y selecciona uno o varios archivos.
3. Edita proyectos y tareas desde la interfaz.
4. Cuando aparezca el aviso de cambios pendientes, pulsa **Guardar proyecto** o **Guardar todos**.
5. Reemplaza en `my_projects/` los archivos descargados por el navegador.

La app no puede sobrescribir automaticamente archivos locales en todos los navegadores cuando se
abre con doble clic. Esa limitacion viene del modelo de seguridad del navegador, no del formato de
datos.

## Formato de proyecto

Cada archivo representa un proyecto completo:

```json
{
  "format": "local-kanban-project",
  "version": 1,
  "savedAt": "2026-07-10T12:00:00.000Z",
  "project": {},
  "columns": [],
  "tasks": []
}
```

El modo de carga es estricto. Si un JSON esta roto, tiene version incorrecta, IDs duplicados o
relaciones invalidas entre proyecto, columnas y tareas, la app muestra error y no lo carga.

## Uso

- **Nuevo proyecto** crea un proyecto en memoria y lo marca como pendiente de guardar.
- **Cargar JSON** reemplaza el espacio actual por los proyectos seleccionados.
- **Guardar proyecto** descarga el JSON del proyecto activo.
- **Guardar todos** descarga un JSON por cada proyecto cargado.
- Las tareas se crean con el boton `+` de cada columna.
- Las tareas se editan haciendo clic en su tarjeta.
- Las tareas se mueven entre columnas arrastrandolas.

## Pruebas

Las pruebas usan solo `node:test`, sin paquetes externos:

```powershell
npm.cmd test
```

Cubren validacion de proyectos y tareas, columnas predeterminadas, movimiento/reordenamiento,
formato JSON editable y rechazo de JSON invalido.

## Arquitectura

```text
UI -> estado central -> servicios/modelos de dominio -> JSON editable
```

- `src/namespace.js`: crea el namespace global `LocalKanban`.
- `src/core`: inicializacion, estado observable y manejo de errores.
- `src/domain`: modelos y validaciones.
- `src/persistence`: funciones de formato JSON y utilidades heredadas.
- `src/ui`: eventos y render seguro con APIs DOM.
- `my_projects`: carpeta de proyectos JSON editables.

IndexedDB ya no es la fuente principal de datos. Algunos modulos heredados pueden permanecer en el
codigo para compatibilidad o migraciones futuras, pero el flujo principal carga y guarda JSON.
