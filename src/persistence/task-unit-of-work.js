(function registerTaskUnitOfWork(namespace) {
  const { performTransaction, requestToPromise, STORES } = namespace.persistence;

  function sortTasks(tasks) {
    return [...tasks].sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.createdAt.localeCompare(right.createdAt);
    });
  }

  function renumber(tasks, timestamp) {
    return tasks.map((task, order) => ({
      ...task,
      order,
      updatedAt: task.order === order ? task.updatedAt : timestamp,
    }));
  }

  function planTaskMove({
    projectId,
    projectTasks,
    taskId,
    targetColumn,
    beforeTaskId,
    now,
    taskWithColumn,
  }) {
    const timestamp = now();
    const task = projectTasks.find((candidate) => candidate.id === taskId);

    if (!task || task.projectId !== projectId) {
      throw new Error("La tarea seleccionada no pertenece al proyecto activo.");
    }
    if (!targetColumn || targetColumn.projectId !== projectId) {
      throw new Error("La columna destino no pertenece al proyecto activo.");
    }
    if (beforeTaskId && beforeTaskId !== taskId) {
      const beforeTask = projectTasks.find((candidate) => candidate.id === beforeTaskId);
      if (
        !beforeTask ||
        beforeTask.projectId !== projectId ||
        beforeTask.columnId !== targetColumn.id
      ) {
        throw new Error("La posicion destino no pertenece al proyecto activo.");
      }
    }

    const targetTasks = sortTasks(
      projectTasks.filter(
        (candidate) => candidate.columnId === targetColumn.id && candidate.id !== task.id,
      ),
    );
    if (
      targetColumn.wipLimit !== null &&
      targetColumn.wipLimit !== undefined &&
      targetColumn.id !== task.columnId &&
      targetTasks.length >= targetColumn.wipLimit
    ) {
      throw new Error("La columna destino alcanzo su limite de trabajo.");
    }

    const sourceTasks = sortTasks(
      projectTasks.filter(
        (candidate) =>
          candidate.columnId === task.columnId &&
          candidate.id !== task.id &&
          candidate.columnId !== targetColumn.id,
      ),
    );
    const movingTask = taskWithColumn(task, targetColumn, { now });
    const normalizedBeforeTaskId = beforeTaskId === taskId ? null : beforeTaskId;
    const insertIndex = normalizedBeforeTaskId
      ? Math.max(
          0,
          targetTasks.findIndex((candidate) => candidate.id === normalizedBeforeTaskId),
        )
      : targetTasks.length;

    targetTasks.splice(insertIndex, 0, movingTask);
    return [...renumber(sourceTasks, timestamp), ...renumber(targetTasks, timestamp)];
  }

  function createTaskUnitOfWork(database) {
    return {
      async normalizeColumn(projectId, columnId) {
        await performTransaction(database, [STORES.tasks], "readwrite", async (stores) => {
          const index = stores.tasks.index("projectId_columnId");
          const tasks = await requestToPromise(index.getAll([projectId, columnId]));
          const timestamp = new Date().toISOString();
          await Promise.all(
            renumber(sortTasks(tasks), timestamp).map((task) =>
              requestToPromise(stores.tasks.put(task)),
            ),
          );
        });
      },

      async deleteTask(taskId) {
        let deletedTask = null;
        await performTransaction(database, [STORES.tasks], "readwrite", async (stores) => {
          const task = await requestToPromise(stores.tasks.get(taskId));
          if (!task) {
            throw new Error("La tarea seleccionada no existe.");
          }
          deletedTask = task;
          const index = stores.tasks.index("projectId_columnId");
          const columnTasks = await requestToPromise(index.getAll([task.projectId, task.columnId]));
          const remainingTasks = sortTasks(
            columnTasks.filter((candidate) => candidate.id !== task.id),
          );
          const timestamp = new Date().toISOString();
          const requests = [
            stores.tasks.delete(task.id),
            ...renumber(remainingTasks, timestamp).map((candidate) => stores.tasks.put(candidate)),
          ];
          await Promise.all(requests.map(requestToPromise));
        });
        return deletedTask;
      },

      async moveTask({ projectId, taskId, targetColumnId, beforeTaskId, now, taskWithColumn }) {
        await performTransaction(
          database,
          [STORES.columns, STORES.tasks],
          "readwrite",
          async (stores) => {
            const [targetColumn, projectTasks] = await Promise.all([
              requestToPromise(stores.columns.get(targetColumnId)),
              requestToPromise(stores.tasks.index("projectId").getAll(projectId)),
            ]);

            const tasksToSave = planTaskMove({
              projectId,
              projectTasks,
              taskId,
              targetColumn,
              beforeTaskId,
              now,
              taskWithColumn,
            });

            await Promise.all(
              tasksToSave.map((candidate) => requestToPromise(stores.tasks.put(candidate))),
            );
          },
        );
      },
    };
  }

  Object.assign(namespace.persistence, { createTaskUnitOfWork, planTaskMove });
})(globalThis.LocalKanban);
