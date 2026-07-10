(function registerProjectRepository(namespace) {
const { executeRequest, STORES } = namespace.persistence;

function createProjectRepository(database) {
  return {
    async get(id) {
      const result = await executeRequest(
        database,
        STORES.projects,
        "readonly",
        (store) => store.get(id),
      );
      return result ?? null;
    },

    async list() {
      const projects = await executeRequest(
        database,
        STORES.projects,
        "readonly",
        (store) => store.getAll(),
      );
      return projects
        .filter((project) => !project.archived)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    async add(project) {
      await executeRequest(database, STORES.projects, "readwrite", (store) => store.add(project));
      return project;
    },

    async update(project) {
      await executeRequest(database, STORES.projects, "readwrite", (store) => store.put(project));
      return project;
    },

    async delete(id) {
      await executeRequest(database, STORES.projects, "readwrite", (store) => store.delete(id));
    },
  };
}

namespace.persistence.repositories.createProjectRepository = createProjectRepository;
})(globalThis.LocalKanban);
