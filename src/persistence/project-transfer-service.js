(function registerProjectTransferService(namespace) {
  const { createId, nowIso } = namespace.shared;
  const { TASK_PRIORITIES, normalizeOptionalText } = namespace.domain;

  const FORMAT = "local-kanban";
  const PROJECT_FORMAT = "local-kanban-project";
  const VERSION = 1;
  const COLUMN_TYPES = new Set(["inbox", "todo", "in_progress", "blocked", "done"]);

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function assertObject(value, message) {
    if (!isObject(value)) {
      throw new Error(message);
    }
  }

  function assertArray(value, message) {
    if (!Array.isArray(value)) {
      throw new Error(message);
    }
  }

  function assertIsoDate(value, field) {
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      throw new Error(`El campo ${field} no contiene una fecha valida.`);
    }
    return value;
  }

  function assertDueDate(value) {
    if (value === null || value === "") return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("Una tarea contiene una fecha de vencimiento invalida.");
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error("Una tarea contiene una fecha de vencimiento invalida.");
    }
    return value;
  }

  function safeFilePart(value) {
    return normalizeOptionalText(value)
      .toLocaleLowerCase("es")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function slugifyProjectName(value) {
    return safeFilePart(value) || "proyecto";
  }

  function createExportPayload(kind, projectGraphs) {
    return {
      format: FORMAT,
      version: VERSION,
      kind,
      exportedAt: nowIso(),
      projects: projectGraphs,
    };
  }

  function createProjectFilePayload(graph) {
    return {
      format: PROJECT_FORMAT,
      version: VERSION,
      savedAt: nowIso(),
      project: graph.project,
      columns: graph.columns,
      tasks: graph.tasks,
    };
  }

  function validatePayload(payload) {
    assertObject(payload, "El archivo no contiene un respaldo valido.");
    if (payload.format !== FORMAT || payload.version !== VERSION) {
      throw new Error("El archivo JSON no pertenece a esta version de Kanban local.");
    }
    if (payload.kind !== "project" && payload.kind !== "projects") {
      throw new Error("El tipo de exportacion no es valido.");
    }
    assertArray(payload.projects, "El archivo no contiene proyectos para importar.");
    if (payload.projects.length === 0) {
      throw new Error("El archivo no contiene proyectos para importar.");
    }
    return payload;
  }

  function validateProjectGraphEntry(entry, options = {}) {
    assertObject(entry, "Un proyecto exportado tiene formato invalido.");
    assertObject(entry.project, "Falta la informacion de un proyecto.");
    assertArray(entry.columns, "Faltan las columnas de un proyecto.");
    assertArray(entry.tasks, "Faltan las tareas de un proyecto.");

    const sourceProject = entry.project;
    const sourceProjectId = normalizeOptionalText(sourceProject.id);
    const projectName = normalizeOptionalText(sourceProject.name);
    if (!sourceProjectId || !projectName) {
      throw new Error("Un proyecto importado no tiene identificador o nombre valido.");
    }

    const projectId = options.regenerateIds ? createId() : sourceProjectId;
    const timestamp = options.touchProject ? nowIso() : sourceProject.updatedAt;
    const project = {
      id: projectId,
      name: projectName,
      description: normalizeOptionalText(sourceProject.description),
      repository: normalizeOptionalText(sourceProject.repository),
      localPath: normalizeOptionalText(sourceProject.localPath),
      archived: false,
      createdAt: assertIsoDate(sourceProject.createdAt, "project.createdAt"),
      updatedAt: assertIsoDate(timestamp, "project.updatedAt"),
    };

    const columnIds = new Map();
    const columns = entry.columns
      .map((sourceColumn) => {
        assertObject(sourceColumn, "Una columna tiene formato invalido.");
        const sourceColumnId = normalizeOptionalText(sourceColumn.id);
        const name = normalizeOptionalText(sourceColumn.name);
        const type = normalizeOptionalText(sourceColumn.type);
        if (!sourceColumnId || !name || !COLUMN_TYPES.has(type)) {
          throw new Error("Una columna importada tiene datos invalidos.");
        }
        if (sourceColumn.projectId !== sourceProjectId) {
          throw new Error("Una columna no pertenece al proyecto importado.");
        }
        if (!Number.isInteger(sourceColumn.order) || sourceColumn.order < 0) {
          throw new Error("Una columna importada tiene orden invalido.");
        }
        if (
          sourceColumn.wipLimit !== null &&
          sourceColumn.wipLimit !== undefined &&
          (!Number.isInteger(sourceColumn.wipLimit) || sourceColumn.wipLimit < 0)
        ) {
          throw new Error("Una columna importada tiene limite WIP invalido.");
        }

        const columnId = options.regenerateIds ? createId() : sourceColumnId;
        columnIds.set(sourceColumnId, columnId);
        return {
          id: columnId,
          projectId,
          name,
          type,
          order: sourceColumn.order,
          wipLimit: sourceColumn.wipLimit ?? null,
          createdAt: assertIsoDate(sourceColumn.createdAt, "column.createdAt"),
          updatedAt: assertIsoDate(sourceColumn.updatedAt, "column.updatedAt"),
        };
      })
      .sort((left, right) => left.order - right.order)
      .map((column, order) => ({ ...column, order }));

    const columnTypes = new Set(columns.map((column) => column.type));
    COLUMN_TYPES.forEach((type) => {
      if (!columnTypes.has(type)) {
        throw new Error("El proyecto importado no contiene todas las columnas esperadas.");
      }
    });

    const tasks = entry.tasks
      .map((sourceTask) => {
        assertObject(sourceTask, "Una tarea tiene formato invalido.");
        const sourceTaskId = normalizeOptionalText(sourceTask.id);
        const sourceColumnId = normalizeOptionalText(sourceTask.columnId);
        if (sourceTask.projectId !== sourceProjectId || !columnIds.has(sourceColumnId)) {
          throw new Error("Una tarea importada tiene relaciones invalidas.");
        }
        const title = normalizeOptionalText(sourceTask.title);
        const priority = normalizeOptionalText(sourceTask.priority) || "none";
        if (!sourceTaskId || !title || !TASK_PRIORITIES.includes(priority)) {
          throw new Error("Una tarea importada tiene datos invalidos.");
        }
        if (!Number.isInteger(sourceTask.order) || sourceTask.order < 0) {
          throw new Error("Una tarea importada tiene orden invalido.");
        }
        const labels = Array.isArray(sourceTask.labels)
          ? sourceTask.labels.map((label) => normalizeOptionalText(label)).filter(Boolean)
          : [];

        return {
          id: options.regenerateIds ? createId() : sourceTaskId,
          projectId,
          columnId: columnIds.get(sourceColumnId),
          title,
          description: normalizeOptionalText(sourceTask.description),
          priority,
          dueDate: assertDueDate(sourceTask.dueDate),
          labels,
          order: sourceTask.order,
          createdAt: assertIsoDate(sourceTask.createdAt, "task.createdAt"),
          updatedAt: assertIsoDate(sourceTask.updatedAt, "task.updatedAt"),
          completedAt:
            sourceTask.completedAt === null || sourceTask.completedAt === undefined
              ? null
              : assertIsoDate(sourceTask.completedAt, "task.completedAt"),
        };
      })
      .sort((left, right) => {
        if (left.columnId !== right.columnId) return left.columnId.localeCompare(right.columnId);
        return left.order - right.order;
      });

    if (new Set(columns.map((column) => column.id)).size !== columns.length) {
      throw new Error("El proyecto importado contiene columnas duplicadas.");
    }
    if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
      throw new Error("El proyecto importado contiene tareas duplicadas.");
    }

    return { project, columns, tasks };
  }

  function cloneImportedGraph(entry) {
    return validateProjectGraphEntry(entry, { regenerateIds: true, touchProject: true });
  }

  function prepareImportGraphs(payload) {
    return validatePayload(payload).projects.map(cloneImportedGraph);
  }

  function parseProjectFilePayload(payload, fileName = "") {
    assertObject(payload, "El archivo no contiene un proyecto valido.");
    if (payload.format !== PROJECT_FORMAT || payload.version !== VERSION) {
      throw new Error("El archivo JSON no pertenece al formato editable de Kanban local.");
    }
    const graph = validateProjectGraphEntry(payload, {
      regenerateIds: false,
      touchProject: false,
    });
    return {
      ...graph,
      fileName: fileName || `${slugifyProjectName(graph.project.name)}.json`,
      dirty: false,
    };
  }

  function getProjectFileName(graph) {
    const currentName = normalizeOptionalText(graph.fileName);
    if (currentName.toLocaleLowerCase("es").endsWith(".json")) {
      return currentName;
    }
    return `${slugifyProjectName(graph.project.name)}.json`;
  }

  Object.assign(namespace.persistence, {
    createExportPayload,
    createProjectFilePayload,
    getProjectFileName,
    parseProjectFilePayload,
    prepareImportGraphs,
    slugifyProjectName,
    validateTransferPayload: validatePayload,
  });
})(globalThis.LocalKanban);
