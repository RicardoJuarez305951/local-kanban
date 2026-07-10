(function registerTaskModel(namespace) {
  const { createId, nowIso } = namespace.shared;
  const { ValidationError, normalizeOptionalText } = namespace.domain;

  const TASK_PRIORITIES = Object.freeze(["none", "low", "medium", "high"]);

  function normalizeDueDate(value) {
    const dueDate = normalizeOptionalText(value);
    if (!dueDate) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new ValidationError("La fecha de vencimiento no es valida.", "dueDate");
    }

    const parsed = new Date(`${dueDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dueDate) {
      throw new ValidationError("La fecha de vencimiento no es valida.", "dueDate");
    }

    return dueDate;
  }

  function normalizeLabels(value) {
    const labels = Array.isArray(value)
      ? value
      : normalizeOptionalText(value)
          .split(",")
          .map((label) => label.trim());

    const seen = new Set();
    return labels
      .map((label) => normalizeOptionalText(label))
      .filter(Boolean)
      .filter((label) => {
        const key = label.toLocaleLowerCase("es");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizePriority(value) {
    const priority = normalizeOptionalText(value) || "none";
    if (!TASK_PRIORITIES.includes(priority)) {
      throw new ValidationError("La prioridad seleccionada no es valida.", "priority");
    }
    return priority;
  }

  function normalizeTaskInput(input = {}) {
    const task = {
      title: normalizeOptionalText(input.title),
      description: normalizeOptionalText(input.description),
      priority: normalizePriority(input.priority),
      dueDate: normalizeDueDate(input.dueDate),
      labels: normalizeLabels(input.labels),
    };

    if (!task.title) {
      throw new ValidationError("El titulo de la tarea es obligatorio.", "title");
    }

    return task;
  }

  function createTask(input, options = {}) {
    if (!options.projectId) {
      throw new Error("Se requiere projectId para crear una tarea.");
    }
    if (!options.columnId) {
      throw new Error("Se requiere columnId para crear una tarea.");
    }
    if (!Number.isInteger(options.order) || options.order < 0) {
      throw new Error("Se requiere un orden valido para crear una tarea.");
    }

    const idFactory = options.idFactory ?? createId;
    const timestamp = (options.now ?? nowIso)();

    return {
      id: idFactory(),
      projectId: options.projectId,
      columnId: options.columnId,
      ...normalizeTaskInput(input),
      order: options.order,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: options.completedAt ?? null,
    };
  }

  function updateTask(existingTask, input, options = {}) {
    if (!existingTask) {
      throw new Error("No se encontro la tarea para actualizar.");
    }

    return {
      ...existingTask,
      ...normalizeTaskInput(input),
      updatedAt: (options.now ?? nowIso)(),
    };
  }

  function taskWithColumn(task, column, options = {}) {
    const timestamp = (options.now ?? nowIso)();
    const nextCompletedAt = column.type === "done" ? task.completedAt ?? timestamp : null;

    return {
      ...task,
      columnId: column.id,
      completedAt: nextCompletedAt,
      updatedAt: timestamp,
    };
  }

  Object.assign(namespace.domain, {
    TASK_PRIORITIES,
    createTask,
    normalizeTaskInput,
    taskWithColumn,
    updateTask,
  });
})(globalThis.LocalKanban);
