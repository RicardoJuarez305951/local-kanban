import { performTransaction, requestToPromise, STORES } from "./database.js";

export function createProjectUnitOfWork(database) {
  return {
    async createProjectGraph(project, columns) {
      await performTransaction(
        database,
        [STORES.projects, STORES.columns, STORES.settings],
        "readwrite",
        async (stores) => {
          const requests = [
            stores.projects.add(project),
            ...columns.map((column) => stores.columns.add(column)),
            stores.settings.put({ key: "activeProjectId", value: project.id }),
          ];

          await Promise.all(requests.map(requestToPromise));
        },
      );

      return { project, columns };
    },
  };
}
