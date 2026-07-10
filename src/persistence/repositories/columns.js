(function registerColumnRepository(namespace) {
const { executeRequest, STORES } = namespace.persistence;

function createColumnRepository(database) {
  return {
    async get(id) {
      const result = await executeRequest(database, STORES.columns, "readonly", (store) =>
        store.get(id),
      );
      return result ?? null;
    },

    async list() {
      const columns = await executeRequest(database, STORES.columns, "readonly", (store) =>
        store.getAll(),
      );
      return columns.sort((left, right) => left.order - right.order);
    },

    async listByProject(projectId) {
      const columns = await executeRequest(database, STORES.columns, "readonly", (store) =>
        store.index("projectId").getAll(projectId),
      );
      return columns.sort((left, right) => left.order - right.order);
    },

    async add(column) {
      await executeRequest(database, STORES.columns, "readwrite", (store) => store.add(column));
      return column;
    },

    async update(column) {
      await executeRequest(database, STORES.columns, "readwrite", (store) => store.put(column));
      return column;
    },

    async delete(id) {
      await executeRequest(database, STORES.columns, "readwrite", (store) => store.delete(id));
    },
  };
}

namespace.persistence.repositories.createColumnRepository = createColumnRepository;
})(globalThis.LocalKanban);
