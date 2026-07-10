import { executeRequest, STORES } from "../database.js";

export function createTaskRepository(database) {
  return {
    async get(id) {
      const result = await executeRequest(database, STORES.tasks, "readonly", (store) =>
        store.get(id),
      );
      return result ?? null;
    },

    async list() {
      const tasks = await executeRequest(database, STORES.tasks, "readonly", (store) =>
        store.getAll(),
      );
      return tasks;
    },

    async listByProject(projectId) {
      const tasks = await executeRequest(database, STORES.tasks, "readonly", (store) =>
        store.index("projectId").getAll(projectId),
      );
      return tasks.sort((left, right) => left.order - right.order);
    },

    async listByColumn(projectId, columnId) {
      const tasks = await executeRequest(database, STORES.tasks, "readonly", (store) =>
        store.index("projectId_columnId").getAll([projectId, columnId]),
      );
      return tasks.sort((left, right) => left.order - right.order);
    },

    async add(task) {
      await executeRequest(database, STORES.tasks, "readwrite", (store) => store.add(task));
      return task;
    },

    async update(task) {
      await executeRequest(database, STORES.tasks, "readwrite", (store) => store.put(task));
      return task;
    },

    async delete(id) {
      await executeRequest(database, STORES.tasks, "readwrite", (store) => store.delete(id));
    },
  };
}
